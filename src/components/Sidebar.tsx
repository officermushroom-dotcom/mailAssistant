import { useState } from "react";
import {
  Menu,
  X,
  Plus,
  Search,
  CheckSquare,
  BookOpen,
  FileText,
  Mail,
  Trash2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import type { EmailHistory } from "../types";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  histories: EmailHistory[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewEmail: () => void;
  onSelectHistory: (h: EmailHistory) => void;
  onDeleteHistory: (id: string) => void;
  todoCount: number;
  onOpenTodo: () => void;
  onOpenGlossary: () => void;
  onOpenTemplates: () => void;
  onOpenNgWordSettings: () => void;
}

function groupByDate(histories: EmailHistory[]) {
  const groups: Record<string, EmailHistory[]> = {};
  histories.forEach((h) => {
    const date = h.createdAt.slice(0, 10);
    if (!groups[date]) groups[date] = [];
    groups[date].push(h);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "今日";
  if (d.toDateString() === yesterday.toDateString()) return "昨日";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Sidebar({
  isOpen,
  onToggle,
  histories,
  searchQuery,
  onSearchChange,
  onNewEmail,
  onSelectHistory,
  onDeleteHistory,
  todoCount,
  onOpenTodo,
  onOpenGlossary,
  onOpenTemplates,
  onOpenNgWordSettings,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = searchQuery
    ? histories.filter(
        (h) =>
          h.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.preview.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : histories;

  const grouped = groupByDate(filtered);

  return (
    <aside
      className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/60 transition-all duration-300 ${isOpen ? "w-72" : "w-14"} flex-shrink-0`}
    >
      {/* Toggle */}
      <div className="flex items-center h-14 px-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        {isOpen && (
          <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
            メールアシスタント
          </span>
        )}
      </div>

      {/* New email button */}
      <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onNewEmail}
          className={`flex items-center gap-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors ${!isOpen && "justify-center"}`}
        >
          <Plus size={16} />
          {isOpen && "新しいメールを開始"}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="メールを検索..."
                className="flex-1 text-sm bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto py-2">
            {grouped.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Mail size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">履歴がありません</p>
              </div>
            )}
            {grouped.map(([date, items]) => (
              <div key={date}>
                <div className="px-4 py-1.5">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {formatDate(date)}
                  </span>
                </div>
                {items.map((h) => (
                  <div
                    key={h.id}
                    onMouseEnter={() => setHoveredId(h.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="relative group"
                  >
                    <button
                      onClick={() => onSelectHistory(h)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate pr-6">
                        {h.subject}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{h.sender}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${h.mode === "understand" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-500" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"}`}>
                          {h.mode === "understand" ? "理解" : "返信"}
                        </span>
                      </div>
                    </button>
                    {hoveredId === h.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteHistory(h.id); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom actions — modal entry points */}
          <div className="border-t border-gray-100 dark:border-gray-800 py-2 space-y-0.5 px-3">
            <button
              onClick={onOpenTodo}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
            >
              <CheckSquare size={15} className="flex-shrink-0" />
              <span className="flex-1 text-left">Todo一覧</span>
              {todoCount > 0 ? (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full px-1.5">
                  {todoCount > 99 ? "99+" : todoCount}
                </span>
              ) : (
                <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
              )}
            </button>
            <button
              onClick={onOpenGlossary}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
            >
              <BookOpen size={15} className="flex-shrink-0" />
              <span className="flex-1 text-left">用語集</span>
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
            </button>
            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
            >
              <FileText size={15} className="flex-shrink-0" />
              <span className="flex-1 text-left">メールテンプレート</span>
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
            </button>
            <button
              onClick={onOpenNgWordSettings}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
            >
              <ShieldAlert size={15} className="flex-shrink-0" />
              <span className="flex-1 text-left">NGワード設定</span>
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors" />
            </button>
          </div>
        </>
      )}

      {/* Collapsed state icons */}
      {!isOpen && (
        <div className="flex flex-col items-center py-2 gap-1">
          <button
            onClick={onOpenTodo}
            title="Todo一覧"
            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <CheckSquare size={18} />
            {todoCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 flex items-center justify-center bg-blue-500 text-white text-[9px] rounded-full px-0.5">
                {todoCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenGlossary}
            title="用語集"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={onOpenTemplates}
            title="テンプレート"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={onOpenNgWordSettings}
            title="NGワード設定"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ShieldAlert size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
