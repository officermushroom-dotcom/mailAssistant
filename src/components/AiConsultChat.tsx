import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MessageCircleQuestion, Bot, User } from "lucide-react";
import * as api from "../api";

type Lang = "ja" | "en";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STORAGE_MESSAGES = "mailAssistant:consultMessages";
const STORAGE_LANG = "mailAssistant:consultLang";

const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  content: "こんにちは！メールの表現・言い回しについてお気軽にご相談ください。\n\n「お詫びの書き方を教えて」「依頼を丁寧に断るには？」「書き出しの例文は？」など、何でもどうぞ。",
};

function loadMessages(): Message[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_MESSAGES) ?? "null");
    if (Array.isArray(stored) && stored.length > 0) return stored;
  } catch {}
  return [INITIAL_MESSAGE];
}

function loadLang(): Lang {
  return localStorage.getItem(STORAGE_LANG) === "en" ? "en" : "ja";
}

const MOCK_REPLIES_JA: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /お詫び|謝罪|申し訳/,
    reply: "お詫びメールの表現についていくつかご提案します。\n\n**丁寧度別の例文**\n・標準：「ご不便をおかけし、大変申し訳ございません」\n・より丁寧：「多大なるご迷惑をおかけしてしまいましたこと、心よりお詫び申し上げます」\n・フォーマル：「誠に遺憾ながら、弊社の不手際によりご不便をおかけしましたことを、深くお詫び申し上げます」\n\nシチュエーションに応じてお選びください。",
  },
  {
    pattern: /依頼|お願い|してほしい|してください/,
    reply: "依頼・お願いの表現をいくつかご紹介します。\n\n**やわらかい依頼**\n「〜していただけますでしょうか」\n「〜をお願いできますと幸いです」\n\n**ビジネス標準**\n「〜していただきますよう、よろしくお願い申し上げます」\n\n**急ぎの場合**\n「恐れ入りますが、〇月〇日までにご対応いただけますでしょうか」\n\n強すぎず、弱すぎない表現を心がけましょう。",
  },
  {
    pattern: /断る|お断り|辞退|できません/,
    reply: "丁寧に断る際の表現です。\n\n**よく使われるフレーズ**\n・「誠に恐れ入りますが、今回はご辞退させていただきたく存じます」\n・「大変残念ではございますが、諸事情により今回はお引き受けしかねる状況です」\n・「ご期待に沿えず大変申し訳ございませんが…」\n\n**ポイント**\n断る理由を簡潔に添えつつ、相手への敬意を忘れずに。代替案があれば一緒に提示すると丁寧な印象になります。",
  },
  {
    pattern: /確認|ご確認|チェック/,
    reply: "確認を依頼する際の表現です。\n\n**標準的な表現**\n「ご確認いただけますでしょうか」\n「お手すきの際にご確認ください」\n\n**急ぎの場合**\n「お急ぎのところ恐れ入りますが、ご確認をお願いいたします」\n\n**確認後の返信を求める場合**\n「ご確認の上、ご回答いただけますと幸いです」\n「問題がなければ、ご承認のご連絡をいただけますでしょうか」",
  },
  {
    pattern: /締め|結び|最後|締め括り/,
    reply: "メールの締めくくりに使える表現です。\n\n**汎用的な結び**\n・「引き続きよろしくお願いいたします」\n・「何卒よろしくお願い申し上げます」\n・「ご不明な点がございましたら、お気軽にお知らせください」\n\n**返信を期待する場合**\n・「ご返答のほど、よろしくお願いいたします」\n・「ご確認の上、ご連絡いただけますと幸いです」\n\n**季節の挨拶（フォーマル）**\n・「時節柄、ご自愛のほどお祈り申し上げます」",
  },
  {
    pattern: /冒頭|書き出し|始め|挨拶/,
    reply: "メールの書き出しパターンをご紹介します。\n\n**取引先・社外向け**\n・「平素より大変お世話になっております」\n・「お世話になっております。〇〇社の△△でございます」\n\n**初めてメールを送る場合**\n・「突然のご連絡、失礼いたします」\n・「はじめてご連絡申し上げます。〇〇と申します」\n\n**返信の場合**\n・「ご連絡いただき、ありがとうございます」\n・「早速のご返答、誠にありがとうございます」",
  },
];

const MOCK_REPLIES_EN: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /apolog|sorry|apologize|regret/i,
    reply: "Here are some expressions for apology emails:\n\n**By formality level**\n· Standard: \"I apologize for any inconvenience this may have caused.\"\n· More formal: \"Please accept my sincerest apologies for the trouble this has caused.\"\n· Very formal: \"I deeply regret the inconvenience caused by our oversight and sincerely apologize on behalf of our team.\"\n\nChoose based on the severity and your relationship with the recipient.",
  },
  {
    pattern: /request|ask|favor|could you|please/i,
    reply: "Here are expressions for making requests:\n\n**Soft request**\n\"Would you be able to…?\"\n\"I would appreciate it if you could…\"\n\n**Standard business**\n\"Could you please…at your earliest convenience?\"\n\"I kindly request that you…\"\n\n**Urgent request**\n\"I would be grateful if you could respond by [date].\"\n\"If possible, could you prioritize this by [date]?\"\n\nAim for a tone that is assertive yet polite.",
  },
  {
    pattern: /decline|refuse|reject|unable|cannot/i,
    reply: "Here are polite ways to decline:\n\n**Common phrases**\n· \"Thank you for the opportunity; unfortunately, I am unable to…\"\n· \"I regret to inform you that we cannot accommodate this request at this time.\"\n· \"While I appreciate your consideration, I must respectfully decline.\"\n\n**Tips**\nBriefly explain your reason and offer an alternative if possible. Always acknowledge the other party's effort.",
  },
  {
    pattern: /confirm|check|verify|review/i,
    reply: "Expressions for confirmation requests:\n\n**Standard**\n\"Could you please confirm receipt of this email?\"\n\"Please let me know if you have any questions.\"\n\n**Urgent**\n\"I would appreciate a prompt response on this matter.\"\n\n**Awaiting approval**\n\"Please review and confirm at your earliest convenience.\"\n\"Kindly confirm your approval so we can proceed.\"",
  },
  {
    pattern: /closing|sign.?off|end|wrap up/i,
    reply: "Here are closing expressions for business emails:\n\n**General closings**\n· \"Thank you for your time and consideration.\"\n· \"Please do not hesitate to reach out if you have any questions.\"\n· \"Looking forward to hearing from you.\"\n\n**When expecting a reply**\n· \"I look forward to your response.\"\n· \"Please feel free to contact me at your convenience.\"\n\n**Formal sign-offs**\nKind regards / Best regards / Sincerely / Yours faithfully",
  },
  {
    pattern: /opening|greet|introduction|start|begin/i,
    reply: "Here are opening expressions for business emails:\n\n**To clients / external parties**\n· \"I hope this email finds you well.\"\n· \"Thank you for reaching out.\"\n\n**First contact**\n· \"My name is [Name] from [Company]. I am writing to…\"\n· \"I am reaching out regarding…\"\n\n**Reply openings**\n· \"Thank you for your prompt reply.\"\n· \"Thank you for getting back to me.\"",
  },
];

function getMockReply(userMessage: string, lang: Lang): string {
  const replies = lang === "en" ? MOCK_REPLIES_EN : MOCK_REPLIES_JA;
  const matched = replies.find((r) => r.pattern.test(userMessage));
  if (matched) return matched.reply;
  return lang === "en"
    ? "Thank you for your question! When crafting business email expressions, consider the formality level, your relationship with the recipient, and the context.\n\nCould you tell me more about what you need? For example: \"apology,\" \"request,\" \"decline,\" \"confirmation,\" \"opening,\" or \"closing\" — I can give you tailored suggestions."
    : "ご質問ありがとうございます。メールの表現については、相手との関係性・状況・ビジネス文化を考慮することが大切です。\n\n具体的にどのような場面での表現をお探しですか？例えば「お詫び」「依頼」「断り」「確認」「書き出し」「締め」などを教えていただければ、より具体的なご提案ができます。";
}


interface Props {
  onClose: () => void;
}

export default function AiConsultChat({ onClose }: Props) {
  const [lang, setLang] = useState<Lang>(loadLang);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LANG, lang);
  }, [lang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
  const text = input.trim();
  if (!text || isLoading) return;
  setInput("");

  const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
  const updatedMessages = [...messages, userMsg];
  setMessages(updatedMessages);
  setIsLoading(true);

  try {
    // ↓ 変更: モック応答(getMockReply)ではなく、実際のAPIを呼ぶ
    //    会話履歴(updatedMessages)を渡すことで、文脈を踏まえた回答ができる
    const answerText = await api.consult(
      updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      lang
    );

    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: answerText,
    };
    setMessages((prev) => [...prev, reply]);
  } catch {
    const errorReply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: lang === "en"
        ? "Sorry, something went wrong. Please try again."
        : "申し訳ございません、エラーが発生しました。もう一度お試しください。",
    };
    setMessages((prev) => [...prev, errorReply]);
  } finally {
    setIsLoading(false);
  }
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col h-[70vh]">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <MessageCircleQuestion size={15} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">表現の相談</h2>
            <p className="text-xs text-gray-400">メールの言い回しをAIに相談できます</p>
          </div>
          <button
            onClick={() => setLang((l) => l === "ja" ? "en" : "ja")}
            className="flex-shrink-0 flex items-center gap-0 text-xs font-medium rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800"
            title="返答言語を切り替え"
          >
            <span className={`px-2 py-1 transition-colors ${lang === "ja" ? "bg-blue-600 text-white" : "bg-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600"}`}>
              JA
            </span>
            <span className={`px-2 py-1 transition-colors ${lang === "en" ? "bg-blue-600 text-white" : "bg-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600"}`}>
              EN
            </span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === "assistant"
                    ? "bg-blue-100 dark:bg-blue-900/50"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                {msg.role === "assistant"
                  ? <Bot size={13} className="text-blue-600 dark:text-blue-400" />
                  : <User size={13} className="text-gray-500 dark:text-gray-400" />
                }
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <Bot size={13} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例：丁寧なお断りの表現を教えて（Shift+Enterで改行）"
              rows={2}
              className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            />
            <button
              onClick={send}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Enter で送信 / Shift+Enter で改行</p>
        </div>
      </div>
    </div>
  );
}
