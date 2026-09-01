import { useState, useEffect, useCallback, useRef } from "react";
import { Sun, Moon, MessageCircleQuestion } from "lucide-react";
import Sidebar from "./components/Sidebar";
import InputArea from "./components/InputArea";
import OutputArea from "./components/OutputArea";
import ComposeFrame from "./components/ComposeFrame";
import TodoModal from "./components/TodoModal";
import GlossaryModal from "./components/GlossaryModal";
import TemplateModal from "./components/TemplateModal";
import NgWordModal from "./components/NgWordModal";
import NgWordSettingsModal from "./components/NgWordSettingsModal";
import PhishingModal from "./components/PhishingModal";
import AiConsultChat from "./components/AiConsultChat";
import type {
  Mode,
  Formality,
  EmailHistory,
  Todo,
  GlossaryItem,
  EmailTemplate,
  ParsedEmail,
  QuotedEmail,
  SubPanelData,
} from "./types";
import * as api from "./api";

const DEFAULT_NG_WORDS = [
  "パスワード", "クレジットカード", "暗証番号", "口座番号",
  "マイナンバー", "秘密鍵", "トークン",
];

const PHISHING_PATTERNS = [
  "緊急", "今すぐ", "クリックしてください", "アカウントが",
  "ログイン情報", "確認が必要", "期限切れ", "不正アクセス",
];

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("mailAssistant:darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [histories, setHistories] = useState<EmailHistory[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const [showTodo, setShowTodo] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNgWordSettings, setShowNgWordSettings] = useState(false);
  const [showConsult, setShowConsult] = useState(false);

  const [activeNgWords, setActiveNgWords] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mailAssistant:ngWordSettings") ?? "null");
      if (Array.isArray(stored)) return stored.filter((e: any) => e.enabled).map((e: any) => e.word);
    } catch {}
    return DEFAULT_NG_WORDS;
  });

  const [ngWordFound, setNgWordFound] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showPhishing, setShowPhishing] = useState(false);

  const [mode, setMode] = useState<Mode>("understand");
  const [scene, setScene] = useState(() => localStorage.getItem("mailAssistant:scene") ?? "");
  const [sceneHistory, setSceneHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("mailAssistant:sceneHistory") ?? "[]"); } catch { return []; }
  });
  const [showSceneHistory, setShowSceneHistory] = useState(false);
  const sceneWrapperRef = useRef<HTMLDivElement>(null);
  const [formality, setFormality] = useState<Formality>("standard");

  const [rawInput, setRawInput] = useState("");
  const [isParsed, setIsParsed] = useState(false);
  const [newEmail, setNewEmail] = useState<ParsedEmail>({ subject: "", sender: "", body: "" });
  const [quotedEmails, setQuotedEmails] = useState<QuotedEmail[]>([]);
  const [includeQuoted, setIncludeQuoted] = useState(false);

  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [subPanelData, setSubPanelData] = useState<SubPanelData | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // 現在編集中のメールが、どの履歴(historyId)に紐付いているかを追跡する
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("mailAssistant:darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("mailAssistant:scene", scene);
  }, [scene]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sceneWrapperRef.current && !sceneWrapperRef.current.contains(e.target as Node)) {
        setShowSceneHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveSceneToHistory = (s: string) => {
    if (!s.trim()) return;
    setSceneHistory((prev) => {
      const next = [s, ...prev.filter((h) => h !== s)].slice(0, 30);
      localStorage.setItem("mailAssistant:sceneHistory", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    api.getHistories().then(setHistories).catch(() => {});
    api.getTodos().then(setTodos).catch(() => {});
    api.getGlossary().then(setGlossary).catch(() => {});
    api.getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleParse = useCallback(async (): Promise<string | null> => {
    setIsParsing(true);

    const parsed = await api.parseEmail(rawInput).catch(() => ({
      subject: "", sender: "", body: rawInput,
    }));

    setNewEmail({ subject: parsed.subject, sender: parsed.sender, body: parsed.body });
    setQuotedEmails([]);
    setIsParsed(true);

    const historyItem = await api.addHistory({
      subject: parsed.subject || rawInput.slice(0, 50) || "（件名なし）",
      sender: parsed.sender || "（不明）",
      body: parsed.body || rawInput,
      quotedEmails: [],
      mode,
      result: "",
    }).catch(() => null);

    let newHistoryId: string | null = null;
    if (historyItem) {
      setHistories((prev) => [historyItem, ...prev.filter((h) => h.id !== historyItem.id)]);
      setCurrentHistoryId(historyItem.id);
      newHistoryId = historyItem.id;
    }
    setIsParsing(false);
    return newHistoryId;
  }, [rawInput, mode]);

  const handleNewEmail = () => {
    setRawInput("");
    setIsParsed(false);
    setNewEmail({ subject: "", sender: "", body: "" });
    setQuotedEmails([]);
    setOutputText("");
    setActiveAction(null);
    setSubPanelData(null);
    setScene("");
    setReplySubject("");
    setReplyBody("");
    setComposeSubject("");
    setComposeBody("");
    setComposeOpen(false);
    setCurrentHistoryId(null);
  };

  const handleSelectHistory = (h: EmailHistory) => {
    setRawInput(h.body || "");
    setNewEmail({ subject: h.subject, sender: h.sender, body: h.body });
    setIsParsed(true);
    setMode(h.mode);
    setCurrentHistoryId(h.id);

    if (h.result) {
      try {
        const parsedResult = JSON.parse(h.result);
        if (parsedResult.subject !== undefined && parsedResult.body !== undefined) {
          setReplySubject(parsedResult.subject);
          setReplyBody(parsedResult.body);
          setOutputText(parsedResult.body);
        } else {
          setOutputText(h.result);
          setReplySubject("");
          setReplyBody("");
        }
      } catch {
        setOutputText(h.result);
        setReplySubject("");
        setReplyBody("");
      }
    } else {
      setOutputText("");
      setReplySubject("");
      setReplyBody("");
    }
    setActiveAction(null);
    setSubPanelData(null);
  };

  const handleDeleteHistory = async (id: string) => {
    await api.deleteHistory(id).catch(() => {});
    setHistories((prev) => prev.filter((h) => h.id !== id));
    if (currentHistoryId === id) setCurrentHistoryId(null);
  };

  // executeAction 内、callLLM を呼んでいる部分を条件分岐させる
const executeAction = async (actionId: string, extraInstruction = ""): Promise<string | null> => {
  const inputText = newEmail.body || rawInput;

  const phishingHits = PHISHING_PATTERNS.filter((p) => inputText.includes(p)).length;
  if (phishingHits >= 2) {
    setShowPhishing(true);
  }

  setIsLoading(true);
  setActiveAction(actionId);
  setOutputText("");

  try {
    // ↓ 変更: draft のストリーミング分岐を削除し、全機能を callLLM に統一
    const result = await api.callLLM({
      action: actionId,
      mode,
      emailContent: inputText,
      scene: mode === "reply" ? scene : undefined,
      formality: mode === "reply" ? formality : undefined,
      extraInstruction,
    });

    setOutputText(result.result);

    const structuredActions = new Set(["draft", "alternative", "translate"]);
    const isStructured = mode === "reply" && structuredActions.has(actionId);
    if (isStructured) {
      setReplySubject(result.subject ?? "");
      setReplyBody(result.result);
    }

    return isStructured
      ? JSON.stringify({ subject: result.subject ?? "", body: result.result })
      : result.result;
  } catch {
    setOutputText("エラーが発生しました。ネットワーク接続を確認してください。");
    return null;
  } finally {
    setIsLoading(false);
  }
};

  // ↓ 変更: ①機能実行(executeAction)と②分割(handleParse)を Promise.all で並列実行するようにした
  //    お互いに依存関係がないため、直列で待つ必要がなく、遅い方の完了を待つだけで済むようになる
  //    ③結果の履歴保存だけは、両方完了後にfire-and-forget(awaitしない)で行う
  const handleAction = async (actionId: string, extraInstruction = "") => {
    if (!rawInput.trim()) return;
    saveSceneToHistory(scene);

    // NGワードチェックは分割前のrawInputに対して行う
    const found = activeNgWords.filter((w) => rawInput.includes(w));
    if (found.length > 0) {
      setNgWordFound(found);
      setPendingAction(actionId);
      return;
    }

    // ↓ 変更: 分割がまだなら handleParse を、既に分割済みなら現在のIDをそのまま使う
    const parsePromise: Promise<string | null> = !isParsed
      ? handleParse()
      : Promise.resolve(currentHistoryId);

    // ↓ 変更: 機能実行(要約など)を並列で走らせる
    const actionPromise = executeAction(actionId, extraInstruction);

    // ↓ 変更: 両方の完了を待つ(遅い方の時間で済む)
    const [historyId, actionResult] = await Promise.all([parsePromise, actionPromise]);

    // ↓ 両方完了したら、結果を履歴に保存する(awaitしないバックグラウンド処理)
    if (historyId && actionResult) {
      api.updateHistory(historyId, { result: actionResult })
        .then((updated) => {
          if (updated) {
            setHistories((prev) => prev.map((h) => (h.id === historyId ? updated : h)));
          }
        })
        .catch(() => {
          console.warn("履歴への結果保存に失敗しました");
        });
    }
  };

  const handleNgContinue = () => {
    const action = pendingAction;
    setNgWordFound([]);
    setPendingAction(null);
    if (action) executeAction(action);
  };

  const handleNgFix = () => {
    setNgWordFound([]);
    setPendingAction(null);
  };

  const handleAddTodo = async (content: string, type: "received" | "user" = "user") => {
    const item = await api.addTodo(content).catch(() => null);
    if (item) setTodos((prev) => [...prev, { ...item, type }]);
  };
  const handleToggleTodo = async (id: string, completed: boolean) => {
    const updated = await api.updateTodo(id, { completed }).catch(() => null);
    if (updated) setTodos((prev) => prev.map((t) => (t.id === id ? { ...updated, type: t.type } : t)));
  };
  const handleDeleteTodo = async (id: string) => {
    await api.deleteTodo(id).catch(() => {});
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };
  const handleSaveTodoFromOutput = async (content: string) => {
    const item = await api.addTodo(content).catch(() => null);
    if (item) setTodos((prev) => [...prev, { ...item, type: "received" as const }]);
  };

  const handleAddGlossary = async (term: string, definition: string) => {
    const item = await api.addGlossaryItem(term, definition).catch(() => null);
    if (item) setGlossary((prev) => [...prev, item]);
  };
  const handleDeleteGlossary = async (id: string) => {
    await api.deleteGlossaryItem(id).catch(() => {});
    setGlossary((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddTemplate = async (payload: Omit<EmailTemplate, "id" | "createdAt" | "userId">) => {
    const item = await api.addTemplate(payload).catch(() => null);
    if (item) setTemplates((prev) => [...prev, item]);
  };
  const handleDeleteTemplate = async (id: string) => {
    await api.deleteTemplate(id).catch(() => {});
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };
  const handleUseTemplate = (tmpl: EmailTemplate) => {
    setComposeSubject(tmpl.subject);
    setComposeBody(tmpl.body);
    setComposeOpen(true);
    setShowTemplates(false);
  };

  const handleInsertToCompose = () => {
    const content = replyBody || outputText;
    if (!content) return;
    setComposeBody((prev) =>
      prev.trim() ? `${prev}\n\n${content}` : content
    );
    if (replySubject && !composeSubject) setComposeSubject(replySubject);
    setComposeOpen(true);
  };

  const handleReplyBodyChange = (v: string) => {
    setReplyBody(v);
    setOutputText(v);
  };

  const pendingTodoCount = todos.filter((t) => !t.completed).length;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        histories={histories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewEmail={handleNewEmail}
        onSelectHistory={handleSelectHistory}
        onDeleteHistory={handleDeleteHistory}
        todoCount={pendingTodoCount}
        onOpenTodo={() => setShowTodo(true)}
        onOpenGlossary={() => setShowGlossary(true)}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenNgWordSettings={() => setShowNgWordSettings(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-6 h-14 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <select
            value={mode}
            onChange={(e) => {
              const m = e.target.value as Mode;
              setMode(m);
              setOutputText("");
              setActiveAction(null);
              setSubPanelData(null);
              setReplySubject("");
              setReplyBody("");
            }}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="understand">受信メールを理解する</option>
            <option value="reply">返信メールを作成する</option>
          </select>

          {mode === "reply" && (
            <>
              <div ref={sceneWrapperRef} className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={scene}
                  onChange={(e) => setScene(e.target.value)}
                  onFocus={() => setShowSceneHistory(true)}
                  placeholder="シーン設定（例：クライアントへの謝罪、進捗報告、お礼など）"
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showSceneHistory && sceneHistory.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                    {sceneHistory
                      .filter((h) => !scene.trim() || h.toLowerCase().includes(scene.toLowerCase()))
                      .map((h) => (
                        <button
                          key={h}
                          onMouseDown={(e) => { e.preventDefault(); setScene(h); setShowSceneHistory(false); }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors truncate"
                        >
                          {h}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <select
                value={formality}
                onChange={(e) => setFormality(e.target.value as Formality)}
                className="flex-shrink-0 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="formal">フォーマル</option>
                <option value="standard">標準</option>
                <option value="casual">カジュアル</option>
              </select>
              <button
                onClick={() => setShowConsult(true)}
                title="表現をAIに相談する"
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <MessageCircleQuestion size={14} />
                表現を相談
              </button>
            </>
          )}

          <button
            onClick={() => setDarkMode((v) => !v)}
            className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={darkMode ? "ライトモード" : "ダークモード"}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>

        <div className="flex-1 flex min-h-0">
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col min-h-0">
            <InputArea
              rawInput={rawInput}
              isParsed={isParsed}
              newEmail={newEmail}
              quotedEmails={quotedEmails}
              includeQuoted={includeQuoted}
              onRawInputChange={(v) => { setRawInput(v); if (!v) setIsParsed(false); }}
              onNewEmailChange={(field, value) => setNewEmail((prev) => ({ ...prev, [field]: value }))}
              onToggleQuoted={() => setIncludeQuoted((v) => !v)}
              onToggleAccordion={(id) =>
                setQuotedEmails((prev) =>
                  prev.map((q) => (q.id === id ? { ...q, isOpen: !q.isOpen } : q))
                )
              }
            />
          </div>
          <div className="w-1/2 bg-white dark:bg-gray-900 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <OutputArea
                mode={mode}
                outputText={outputText}
                isLoading={isLoading}
                activeAction={activeAction}
                canAct={rawInput.trim().length > 0}
                subPanelData={subPanelData}
                replySubject={replySubject}
                replyBody={replyBody}
                onReplySubjectChange={setReplySubject}
                onReplyBodyChange={handleReplyBodyChange}
                onAction={(id, extra) => handleAction(id, extra)}
                onOutputChange={setOutputText}
                onSaveTodo={handleSaveTodoFromOutput}
              />
            </div>
            {mode === "reply" && (
              <ComposeFrame
                isOpen={composeOpen}
                onToggle={() => setComposeOpen((v) => !v)}
                subject={composeSubject}
                body={composeBody}
                onSubjectChange={setComposeSubject}
                onBodyChange={setComposeBody}
                canInsert={!!(outputText || replyBody)}
                onInsert={handleInsertToCompose}
                onClear={() => { setComposeSubject(""); setComposeBody(""); }}
              />
            )}
          </div>
        </div>
      </div>

      {showTodo && (
        <TodoModal
          todos={todos}
          histories={histories}
          onClose={() => setShowTodo(false)}
          onAdd={(content) => handleAddTodo(content, "user")}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
        />
      )}
      {showGlossary && (
        <GlossaryModal
          items={glossary}
          onClose={() => setShowGlossary(false)}
          onAdd={handleAddGlossary}
          onDelete={handleDeleteGlossary}
          currentEmailBody={newEmail.body || rawInput}
          onApplyToInput={(replaced) => {
            if (isParsed) setNewEmail((prev) => ({ ...prev, body: replaced }));
            else setRawInput(replaced);
          }}
        />
      )}
      {showTemplates && (
        <TemplateModal
          templates={templates}
          onClose={() => setShowTemplates(false)}
          onAdd={handleAddTemplate}
          onDelete={handleDeleteTemplate}
          onUse={handleUseTemplate}
        />
      )}
      {showConsult && (
        <AiConsultChat onClose={() => setShowConsult(false)} />
      )}
      {showNgWordSettings && (
        <NgWordSettingsModal
          onClose={() => setShowNgWordSettings(false)}
          onWordsChange={setActiveNgWords}
        />
      )}
      {ngWordFound.length > 0 && (
        <NgWordModal
          foundWords={ngWordFound}
          onContinue={handleNgContinue}
          onFix={handleNgFix}
        />
      )}
      {showPhishing && (
        <PhishingModal onClose={() => setShowPhishing(false)} />
      )}
    </div>
  );
}