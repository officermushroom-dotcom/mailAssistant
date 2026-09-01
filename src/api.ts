import { projectId, publicAnonKey } from "../utils/supabase/info";
import type { EmailHistory, Todo, GlossaryItem, EmailTemplate, Mode } from "./types";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-5df37418`;
const USER_ID = "anonymous";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// メール/口コミの分割をバックエンド(AI)に依頼する関数
export async function parseEmail(rawText: string): Promise<{ subject: string; sender: string; body: string }> {
  return req("/parse", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

export async function callLLM(payload: {
  action: string;
  mode: Mode;
  emailContent: string;
  scene?: string;
  formality?: string;
  extraInstruction?: string;
  glossary?: GlossaryItem[];
}): Promise<{ result: string; subject?: string }> {
  return req("/llm", {
    method: "POST",
    body: JSON.stringify({ ...payload, userId: USER_ID }),
  });
}

// Histories

export const updateHistory = (id: string, updates: Partial<EmailHistory>) =>
  req<EmailHistory>(`/histories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...updates, userId: USER_ID }),
  });

export const getHistories = () =>
  req<EmailHistory[]>(`/histories?userId=${USER_ID}`);

export const addHistory = (payload: Omit<EmailHistory, "id" | "createdAt" | "userId">) =>
  req<EmailHistory>("/histories", {
    method: "POST",
    body: JSON.stringify({ ...payload, userId: USER_ID }),
  });

export const deleteHistory = (id: string) =>
  req<{ success: boolean }>(`/histories/${id}?userId=${USER_ID}`, { method: "DELETE" });

// Todos
export const getTodos = () => req<Todo[]>(`/todos?userId=${USER_ID}`);

export const addTodo = (content: string, sourceEmailId?: string) =>
  req<Todo>("/todos", {
    method: "POST",
    body: JSON.stringify({ content, sourceEmailId: sourceEmailId ?? null, userId: USER_ID }),
  });

export const updateTodo = (id: string, updates: Partial<Todo>) =>
  req<Todo>(`/todos/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...updates, userId: USER_ID }),
  });

export const deleteTodo = (id: string) =>
  req<{ success: boolean }>(`/todos/${id}?userId=${USER_ID}`, { method: "DELETE" });

// Glossary
export const getGlossary = () => req<GlossaryItem[]>(`/glossary?userId=${USER_ID}`);

export const addGlossaryItem = (term: string, definition: string) =>
  req<GlossaryItem>("/glossary", {
    method: "POST",
    body: JSON.stringify({ term, definition, userId: USER_ID }),
  });

export const deleteGlossaryItem = (id: string) =>
  req<{ success: boolean }>(`/glossary/${id}?userId=${USER_ID}`, { method: "DELETE" });

// Templates
export const getTemplates = () => req<EmailTemplate[]>(`/templates?userId=${USER_ID}`);

export const addTemplate = (payload: Omit<EmailTemplate, "id" | "createdAt" | "userId">) =>
  req<EmailTemplate>("/templates", {
    method: "POST",
    body: JSON.stringify({ ...payload, userId: USER_ID }),
  });

export const deleteTemplate = (id: string) =>
  req<{ success: boolean }>(`/templates/${id}?userId=${USER_ID}`, { method: "DELETE" });

// api.ts に追加
export async function consult(messages: { role: "user" | "assistant"; content: string }[], lang: "ja" | "en"): Promise<string> {
  const data = await req<{ answer: string }>("/consult", {
    method: "POST",
    body: JSON.stringify({ messages, lang }),
  });
  return data.answer;
}

// ↓ 新規追加: ストリーミング版のLLM呼び出し
// ↳ App.tsxから呼ばれ、文字が届くたびに onChunk コールバックで通知する
export async function streamLLM(
  payload: {
    action: string;
    mode: Mode;
    emailContent: string;
    scene?: string;
    formality?: string;
    extraInstruction?: string;
    glossary?: GlossaryItem[];
  },
  onChunk: (fullText: string) => void
): Promise<string> {
  const response = await fetch(`${BASE}/llm-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ ...payload, userId: USER_ID }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // 未完成の行は次回に持ち越す

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      console.log("DEBUG: raw data =", data);

      try {
        const json = JSON.parse(data);
        console.log("DEBUG: parsed json =", json);
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          fullText += delta;
          onChunk(fullText);
        }
      } catch (e) {
        console.log("DEBUG: parse error =", e, "raw:", data);
        // パース失敗した行は無視(不完全なJSONの可能性)
      }
    }
  }

  return fullText;
}