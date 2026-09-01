import { useState } from "react";
import { X, Plus, Trash2, CheckCircle2, Circle, Mail, User } from "lucide-react";
import type { Todo, EmailHistory } from "../types";

interface Props {
  todos: Todo[];
  histories: EmailHistory[];
  onClose: () => void;
  onAdd: (content: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

type FilterTab = "all" | "received" | "user" | "done";

export default function TodoModal({ todos, histories, onClose, onAdd, onToggle, onDelete }: Props) {
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  };

  const historyMap = Object.fromEntries(histories.map((h) => [h.id, h]));

  const filtered = todos.filter((t) => {
    if (tab === "done") return t.completed;
    if (tab === "received") return !t.completed && t.type === "received";
    if (tab === "user") return !t.completed && t.type !== "received";
    return !t.completed;
  });

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: `未完了 (${todos.filter((t) => !t.completed).length})` },
    { key: "received", label: `受信メール由来 (${todos.filter((t) => !t.completed && t.type === "received").length})` },
    { key: "user", label: `手動追加 (${todos.filter((t) => !t.completed && t.type !== "received").length})` },
    { key: "done", label: `完了 (${todos.filter((t) => t.completed).length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[82vh] border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Todo一覧</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add input */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="新しいTodoを追加..."
              className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-800 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                tab === key
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {todos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Todoはまだありません</p>
          )}
          {filtered.length === 0 && todos.length > 0 && (
            <p className="text-sm text-gray-400 text-center py-8">このカテゴリにはTodoがありません</p>
          )}
          <div className="space-y-2">
            {filtered.map((todo) => {
              const sourceHistory = todo.sourceEmailId ? historyMap[todo.sourceEmailId] : null;
              return (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  sourceHistory={sourceHistory ?? null}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TodoItem({
  todo,
  sourceHistory,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  sourceHistory: EmailHistory | null;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 group transition-colors">
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        className="mt-0.5 flex-shrink-0 text-blue-500 hover:text-blue-600 transition-colors"
      >
        {todo.completed
          ? <CheckCircle2 size={18} />
          : <Circle size={18} className="text-gray-300 dark:text-gray-600" />}
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm block ${todo.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-200"}`}>
          {todo.content}
        </span>

        {/* Source info */}
        {(sourceHistory || todo.sourceSubject) && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {(sourceHistory?.subject || todo.sourceSubject) && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Mail size={10} />
                {sourceHistory?.subject ?? todo.sourceSubject}
              </span>
            )}
            {(sourceHistory?.sender || todo.sourceSender) && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <User size={10} />
                {sourceHistory?.sender ?? todo.sourceSender}
              </span>
            )}
          </div>
        )}

        {/* Type badge */}
        {todo.type === "received" && (
          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full">
            受信メールから抽出
          </span>
        )}
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
