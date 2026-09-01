import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Smile,
  ListChecks,
  FileText,
  Shuffle,
  ShieldAlert,
  Plus,
} from "lucide-react";
import type { SubPanelData, SubPanelTodo, Urgency } from "../types";
import { copyToClipboard } from "../utils/clipboard";

interface Props {
  data: SubPanelData | null;
  onSaveTodo: (text: string) => void;
}

// ── Urgency badge ──────────────────────────────────────────────────
const URGENCY_CONFIG: Record<Urgency, { label: string; icon: React.ReactNode; className: string }> = {
  normal: {
    label: "通常",
    icon: <CheckCircle size={13} />,
    className: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700",
  },
  caution: {
    label: "要注意",
    icon: <AlertTriangle size={13} />,
    className: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700",
  },
  urgent: {
    label: "至急",
    icon: <AlertCircle size={13} />,
    className: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
  },
};

// ── Small copy button ──────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="p-1 rounded text-gray-400 hover:text-blue-500 transition-colors"
      title="コピー"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

// ── Collapsible section ────────────────────────────────────────────
function Section({
  icon,
  title,
  copyText,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  copyText?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* div instead of button to avoid nested <button> inside CopyBtn */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors cursor-pointer select-none"
      >
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <span className="flex-1 text-xs font-semibold text-gray-600 dark:text-gray-300">{title}</span>
        {copyText && (
          <span onClick={(e) => e.stopPropagation()}>
            <CopyBtn text={copyText} />
          </span>
        )}
        <span className="text-gray-400">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>
      {open && <div className="px-3 pb-3 pt-2">{children}</div>}
    </div>
  );
}

// ── Main SubPanel component ────────────────────────────────────────
export default function SubPanel({ data, onSaveTodo }: Props) {
  const [localTodos, setLocalTodos] = useState<SubPanelTodo[]>([]);

  // Sync local todos when data changes
  const todos = data
    ? localTodos.length && localTodos[0]?.id.startsWith("sp-")
      ? localTodos
      : data.todos.map((t) => ({ ...t, id: `sp-${t.id}` }))
    : [];

  const toggleTodo = (id: string) => {
    setLocalTodos((prev) =>
      prev.length
        ? prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t))
        : data!.todos.map((t) => ({
            ...t,
            id: `sp-${t.id}`,
            checked: `sp-${t.id}` === id ? !t.checked : t.checked,
          }))
    );
  };

  if (!data) {
    return (
      <div className="py-8 text-center text-gray-300 dark:text-gray-600 text-xs select-none">
        処理を実行するとここに分析結果が表示されます
      </div>
    );
  }

  const urgencyCfg = URGENCY_CONFIG[data.urgency];

  return (
    <div className="space-y-2.5">
      {/* Row: urgency + sentiment */}
      <div className="flex items-stretch gap-2.5">
        {/* Urgency */}
        <div className="flex-1 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={13} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">緊急度</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${urgencyCfg.className}`}
          >
            {urgencyCfg.icon}
            {urgencyCfg.label}
          </span>
        </div>

        {/* Sentiment */}
        <div className="flex-1 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Smile size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">感情分析</span>
            </div>
            <CopyBtn text={data.sentiment} />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg text-xs">
            {data.sentiment}
          </span>
        </div>
      </div>

      {/* Summary */}
      <Section
        icon={<FileText size={13} />}
        title="要約"
        copyText={data.summary}
        defaultOpen={true}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{data.summary}</p>
      </Section>

      {/* Todo checklist */}
      <Section
        icon={<ListChecks size={13} />}
        title="抽出されたTodo"
        copyText={todos.map((t) => `□ ${t.text}`).join("\n")}
        defaultOpen={true}
      >
        <div className="space-y-2">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-2 group">
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors ${
                  todo.checked
                    ? "bg-blue-500 border-blue-500 flex items-center justify-center"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {todo.checked && <Check size={10} className="text-white" />}
              </button>
              <span
                className={`flex-1 text-sm leading-snug ${
                  todo.checked
                    ? "line-through text-gray-400 dark:text-gray-500"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => onSaveTodo(todo.text)}
                title="Todoリストに保存"
                className="flex-shrink-0 p-0.5 text-gray-300 dark:text-gray-600 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Plus size={13} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Todo miss-check */}
      {data.todoMissCheck.length > 0 && (
        <Section
          icon={<ShieldAlert size={13} />}
          title="抜け漏れチェック"
          copyText={data.todoMissCheck.join("\n")}
          defaultOpen={false}
        >
          <div className="space-y-1.5">
            {data.todoMissCheck.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-2"
              >
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Alternatives */}
      <Section
        icon={<Shuffle size={13} />}
        title="代替表現サジェスト"
        copyText={data.alternatives.join("\n")}
        defaultOpen={false}
      >
        <div className="space-y-2">
          {data.alternatives.map((alt, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-300 leading-snug"
            >
              <span>{alt}</span>
              <CopyBtn text={alt} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
