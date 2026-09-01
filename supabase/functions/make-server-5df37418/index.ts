import { Hono, type Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// ↓ 新規追加: ストリーミング用の関数
// ↳ OpenAIのレスポンスをそのまま(加工せず)ReadableStreamとして返す
//    エンドポイント側でこのストリームをそのままフロントに中継する
async function callOpenAIStream(systemPrompt: string, userText: string): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const model = Deno.env.get("LLM_MODEL") ?? "gpt-5-nano";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true, // ← ここだけがcallOpenAIとの違い
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  return response.body; // OpenAIからのストリームをそのまま返す
}

// OpenAI呼び出しの共通関数(変更なし)
async function callOpenAI(systemPrompt: string, userText: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const model = Deno.env.get("LLM_MODEL") ?? "gpt-5-nano";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function normalizeParsedFields(parsed: { subject?: string; sender?: string; body?: string }) {
  return {
    subject: parsed.subject?.trim() || "(件名なし)",
    sender: parsed.sender?.trim() || "(送信元不明)",
    body: parsed.body?.trim() || "",
  };
}

// メール/口コミの分割関数(変更なし)
// ↳ /parse エンドポイントの中身として使われる
async function parseEmailOrReview(rawText: string): Promise<{ subject: string; sender: string; body: string }> {
  const systemPrompt = `以下のテキストから、件名・送信元・本文を抽出してください。
これはメールまたは口コミ(レビュー)のどちらかです。
- メールの場合: 件名=メールの件名、送信元=送信者名やメールアドレス、本文=本文(新規部分のみ、過去の引用は除く)
- 口コミの場合: 件名=評価やタイトル(星の数など含む)、送信元=投稿者名、本文=口コミ本文
件名や送信元が読み取れない場合は空文字("")にしてください。
必ず以下のJSON形式のみで出力してください。説明や前置きは一切不要です。
{"subject": "件名", "sender": "送信元", "body": "本文"}`;

  const raw = await callOpenAI(systemPrompt, rawText);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { subject: "", sender: "", body: rawText };
  }
  return normalizeParsedFields(parsed);
}

interface GlossaryItem { term: string; meaning: string }
function buildGlossaryText(glossary?: GlossaryItem[]): string {
  if (!glossary || glossary.length === 0) return "";
  return `\n用語集:\n${glossary.map(g => `- ${g.term}: ${g.meaning}`).join("\n")}`;
}

function buildSubjectLine(subject?: string): string {
  if (!subject || subject === "(件名なし)") return "";
  return `件名: ${subject}\n`;
}

// index.ts に追加(既存の /llm エンドポイントの近くに)
// ↳ フロントの api.streamLLM (新規作成) から呼ばれる
app.post("/make-server-5df37418/llm-stream", async (c: Context) => {
  try {
    const { action, emailContent, scene, formality, extraInstruction, glossary } = await c.req.json();

    // 今回は draft(日本語で返信文を作成)だけ対応
    if (action !== "draft") {
      return c.json({ error: "This action does not support streaming yet" }, 400);
    }

    const glossaryText = buildGlossaryText(glossary);
    const formalityText: Record<string, string> = {
      formal: "非常に丁寧でフォーマルな敬語を使ってください。",
      standard: "丁寧だが自然な標準的な日本語ビジネス文で書いてください。",
      casual: "親しみやすく、カジュアルなトーンで書いてください。",
    };
    const formalityLine = formalityText[formality] ?? "";
    const extraLine = extraInstruction ? `\n追加の指示: ${extraInstruction}` : "";
    const sceneLine = scene ? `\n状況設定: ${scene}` : "";

    const prompt = `あなたはメール返信作成アシスタントです。${sceneLine}\n${formalityLine}${glossaryText}${extraLine}\n以下のメールへの返信文を日本語の本文だけで作成してください。前置きや説明は不要です。`;

    const stream = await callOpenAIStream(prompt, emailContent);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
    });
  } catch (error) {
    console.error("llm-stream error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-5df37418/health", (c: Context) => {
  return c.json({ status: "ok" });
});

// ↓ 新規追加: メール/口コミ分割エンドポイント
// ↳ フロントの api.parseEmail(rawInput) から呼ばれる(App.tsxのhandleParse)
app.post("/make-server-5df37418/parse", async (c: Context) => {
  try {
    const { rawText } = await c.req.json();
    const parsed = await parseEmailOrReview(rawText);
    return c.json(parsed);
  } catch (error) {
    console.error("parse error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// ↓ 新規追加: 全機能共通のLLMエンドポイント
// ↳ フロントの api.callLLM(payload) から呼ばれる(App.tsxのexecuteAction)
// ↳ OutputAreaの各ボタンのidが actionId としてそのまま届く
app.post("/make-server-5df37418/llm", async (c: Context) => {
  try {
    const { action, emailContent, scene, formality, extraInstruction, glossary } = await c.req.json();

    const glossaryText = buildGlossaryText(glossary);
    const formalityText: Record<string, string> = {
      formal: "非常に丁寧でフォーマルな敬語を使ってください。",
      standard: "丁寧だが自然な標準的な日本語ビジネス文で書いてください。",
      casual: "親しみやすく、カジュアルなトーンで書いてください。",
    };
    const formalityLine = formalityText[formality] ?? "";
    const extraLine = extraInstruction ? `\n追加の指示: ${extraInstruction}` : "";
    const sceneLine = scene ? `\n状況設定: ${scene}` : "";

    // actionIdごとにシステムプロンプトを切り替える
    // ↳ OutputArea.tsxのUNDERSTAND_ACTIONS/REPLY_ACTIONSのidと1対1で対応させる
    switch (action) {
      case "summary": {
        console.log("DEBUG: received emailContent =", emailContent);
        const prompt = `以下のメールを3〜5行で要約してください。${glossaryText}${extraLine}\n本文のみ出力してください。`;
        console.log("DEBUG: prompt =", prompt);
        const result = await callOpenAI(prompt, emailContent);
        console.log("DEBUG: OpenAI raw result =", result);
        return c.json({ result });
      }
      case "keyPoints": { // ボタンラベル「翻訳する」
        const prompt = `以下のメールを日本語に翻訳してください。${glossaryText}${extraLine}\n本文のみ出力してください。`;
        const result = await callOpenAI(prompt, emailContent);
        return c.json({ result });
      }
      case "todoExtract": {
        const prompt = `以下のメールから、対応が必要なタスクを箇条書きで抽出してください。${glossaryText}${extraLine}`;
        const result = await callOpenAI(prompt, emailContent);
        return c.json({ result });
      }
      case "glossary": {
        const prompt = `以下のメールに含まれる専門用語や略語を解説してください。${extraLine}`;
        const result = await callOpenAI(prompt, emailContent);
        return c.json({ result });
      }
      case "sentiment": {
        const prompt = `以下のメールの送信者の意図やトーンを分析してください。${extraLine}`;
        const result = await callOpenAI(prompt, emailContent);
        return c.json({ result });
      }
      case "draft": {
        const prompt = `あなたはメール返信作成アシスタントです。${sceneLine}\n${formalityLine}${glossaryText}${extraLine}\n以下のメールへの返信文を日本語で、件名と本文の形式で作成してください。必ずJSON形式のみで出力: {"subject":"件名","body":"本文"}`;
        const raw = await callOpenAI(prompt, emailContent);
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = { subject: "", body: raw }; }
        return c.json({ result: parsed.body, subject: parsed.subject });
      }
      case "translate": { // ボタンラベル「英語で返信文を作成」
        const prompt = `あなたはメール返信作成アシスタントです。${sceneLine}\n${formalityLine}${glossaryText}${extraLine}\n以下のメールへの返信文を英語で、件名と本文の形式で作成してください。必ずJSON形式のみで出力: {"subject":"件名","body":"本文"}`;
        const raw = await callOpenAI(prompt, emailContent);
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = { subject: "", body: raw }; }
        return c.json({ result: parsed.body, subject: parsed.subject });
      }
      case "checkPoints": {
        const prompt = `返信前に確認すべき点を箇条書きで挙げてください。${sceneLine}${extraLine}`;
        const result = await callOpenAI(prompt, emailContent);
        return c.json({ result });
      }
      case "alternative": {
        const prompt = `あなたはメール返信作成アシスタントです。${sceneLine}\n${formalityLine}${extraLine}\n以下のメールへの返信文の、別バージョンを日本語で件名と本文の形式で作成してください。必ずJSON形式のみで出力: {"subject":"件名","body":"本文"}`;
        const raw = await callOpenAI(prompt, emailContent);
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = { subject: "", body: raw }; }
        return c.json({ result: parsed.body, subject: parsed.subject });
      }
      case "subject": {
        const prompt = `以下のメールへの返信にふさわしい件名を3つ提案してください。${sceneLine}${extraLine}`;
        const result = await callOpenAI(prompt, emailContent);
        return c.json({ result });
      }
      case "review": {
        const prompt = `これは口コミサイトへの公開返信です。他の閲覧者も読むことを想定してください。${sceneLine}\n${formalityLine}${extraLine}\n以下の口コミへの返信文を作成してください。`;
        const result = await callOpenAI(prompt, emailContent);
        return c.json({ result });
      }
      default:
        return c.json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error("llm error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// CRUD共通ヘルパー

// 4つのデータ種別(todos/glossary/histories/templates)すべてで使い回す
function generateId(): string {
  return crypto.randomUUID();
}

// Todos
// ↳ フロントの api.getTodos/addTodo/updateTodo/deleteTodo(src/api.ts)から呼ばれる

app.get("/make-server-5df37418/todos", async (c: Context) => {
  try {
    const userId = c.req.query("userId") ?? "anonymous";
    const items = await kv.getByPrefix(`todos:${userId}:`);
    return c.json(items);
  } catch (error) {
    console.error("getTodos error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-5df37418/todos", async (c: Context) => {
  try {
    const body = await c.req.json();
    const userId = body.userId ?? "anonymous";
    const id = generateId();
    const item = {
      id,
      content: body.content,
      sourceEmailId: body.sourceEmailId ?? null,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`todos:${userId}:${id}`, item);
    return c.json(item);
  } catch (error) {
    console.error("addTodo error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-5df37418/todos/:id", async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const userId = body.userId ?? "anonymous";
    const key = `todos:${userId}:${id}`;
    const existing = await kv.get(key);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, ...body };
    await kv.set(key, updated);
    return c.json(updated);
  } catch (error) {
    console.error("updateTodo error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-5df37418/todos/:id", async (c: Context) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId") ?? "anonymous";
    await kv.del(`todos:${userId}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("deleteTodo error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Glossary
app.get("/make-server-5df37418/glossary", async (c: Context) => {
  try {
    const userId = c.req.query("userId") ?? "anonymous";
    const items = await kv.getByPrefix(`glossary:${userId}:`);
    return c.json(items);
  } catch (error) {
    console.error("getGlossary error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-5df37418/glossary", async (c: Context) => {
  try {
    const body = await c.req.json();
    const userId = body.userId ?? "anonymous";
    const id = generateId();
    const item = {
      id,
      term: body.term,
      definition: body.definition,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`glossary:${userId}:${id}`, item);
    return c.json(item);
  } catch (error) {
    console.error("addGlossaryItem error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-5df37418/glossary/:id", async (c: Context) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId") ?? "anonymous";
    await kv.del(`glossary:${userId}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("deleteGlossaryItem error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Histories

app.put("/make-server-5df37418/histories/:id", async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const userId = body.userId ?? "anonymous";
    const key = `histories:${userId}:${id}`;
    const existing = await kv.get(key);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, ...body };
    await kv.set(key, updated);
    return c.json(updated);
  } catch (error) {
    console.error("updateHistory error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-5df37418/histories", async (c: Context) => {
  try {
    const userId = c.req.query("userId") ?? "anonymous";
    const items = await kv.getByPrefix(`histories:${userId}:`);
    // 新しい順に並び替え
    items.sort((a: any, b: any) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return c.json(items);
  } catch (error) {
    console.error("getHistories error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-5df37418/histories", async (c: Context) => {
  try {
    const reqBody = await c.req.json();
    const userId = reqBody.userId ?? "anonymous";
    const id = generateId();
    const item = {
      id,
      subject: reqBody.subject,
      sender: reqBody.sender,
      body: reqBody.body,       // ↓ 変更: preview → body
      quotedEmails: reqBody.quotedEmails ?? [],
      mode: reqBody.mode,
      result: reqBody.result ?? "",
      createdAt: new Date().toISOString(),
    };
    await kv.set(`histories:${userId}:${id}`, item);
    return c.json(item);
  } catch (error) {
    console.error("addHistory error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-5df37418/histories/:id", async (c: Context) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId") ?? "anonymous";
    await kv.del(`histories:${userId}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("deleteHistory error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Templates
app.get("/make-server-5df37418/templates", async (c: Context) => {
  try {
    const userId = c.req.query("userId") ?? "anonymous";
    const items = await kv.getByPrefix(`templates:${userId}:`);
    return c.json(items);
  } catch (error) {
    console.error("getTemplates error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-5df37418/templates", async (c: Context) => {
  try {
    const body = await c.req.json();
    const userId = body.userId ?? "anonymous";
    const id = generateId();
    const item = {
      id,
      subject: body.subject,
      body: body.body,
      category: body.category ?? null,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`templates:${userId}:${id}`, item);
    return c.json(item);
  } catch (error) {
    console.error("addTemplate error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-5df37418/templates/:id", async (c: Context) => {
  try {
    const id = c.req.param("id");
    const userId = c.req.query("userId") ?? "anonymous";
    await kv.del(`templates:${userId}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("deleteTemplate error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-5df37418/consult", async (c: Context) => {
  try {
    const { messages, lang } = await c.req.json();

    const systemPrompt = lang === "en"
      ? `あなたはビジネスメールの表現・言い回しについて相談に乗るアシスタントです。
    説明は日本語で行い、実際に使える例文は英語で紹介してください。
    簡潔かつ実用的に、具体的な英語表現を交えて回答してください。`
      : `あなたはビジネスメールの表現・言い回しについて相談に乗るアシスタントです。
    説明も例文も日本語で行ってください。
    簡潔かつ実用的に、具体的な例文を交えて回答してください。`;

    // 会話履歴を1つのプロンプトにまとめる(シンプルな実装)
    const conversationText = messages
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "質問" : "回答"}: ${m.content}`)
      .join("\n\n");

    const answer = await callOpenAI(systemPrompt, conversationText);
    return c.json({ answer });
  } catch (error) {
    console.error("consult error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);