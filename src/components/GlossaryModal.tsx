import { useState, useEffect } from "react";
import { X, Trash2, ArrowRight, Languages, Wand2, ToggleLeft, ToggleRight } from "lucide-react";
import type { GlossaryItem } from "../types";

interface Props {
  items: GlossaryItem[];
  onClose: () => void;
  onAdd: (term: string, definition: string) => void;
  onDelete: (id: string) => void;
  onApplyToInput?: (replacedText: string) => void;
  currentEmailBody?: string;
}

const STORAGE_KEY = "mailAssistant:glossaryEnabled";

function loadEnabled(items: GlossaryItem[]): Record<string, boolean> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // Default to true for any item not explicitly set
    const result: Record<string, boolean> = {};
    items.forEach((item) => {
      result[item.id] = stored[item.id] !== false;
    });
    return result;
  } catch {
    return Object.fromEntries(items.map((i) => [i.id, true]));
  }
}

function saveEnabled(enabled: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  } catch {}
}

export default function GlossaryModal({
  items,
  onClose,
  onAdd,
  onDelete,
  onApplyToInput,
  currentEmailBody = "",
}: Props) {
  const [originalTerm, setOriginalTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [search, setSearch] = useState("");
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => loadEnabled(items));

  // Sync when items change (e.g. new item added)
  useEffect(() => {
    setEnabled((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (!(item.id in next)) next[item.id] = true;
      });
      return next;
    });
  }, [items]);

  const toggleItem = (id: string) => {
    setEnabled((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveEnabled(next);
      return next;
    });
  };

  const allEnabled = items.length > 0 && items.every((i) => enabled[i.id] !== false);

  const toggleAll = () => {
    const next = Object.fromEntries(items.map((i) => [i.id, !allEnabled]));
    saveEnabled(next);
    setEnabled(next);
  };

  const handleAdd = () => {
    if (!originalTerm.trim() || !translation.trim()) return;
    onAdd(originalTerm.trim(), translation.trim());
    setOriginalTerm("");
    setTranslation("");
  };

  const handleApply = () => {
    if (!onApplyToInput || !currentEmailBody) return;
    let result = currentEmailBody;
    let count = 0;
    for (const item of items) {
      if (enabled[item.id] === false) continue;
      const regex = new RegExp(item.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const matches = result.match(regex);
      if (matches) {
        count += matches.length;
        result = result.replace(regex, item.definition);
      }
    }
    onApplyToInput(result);
    setAppliedCount(count);
    setTimeout(() => setAppliedCount(null), 3000);
  };

  const filtered = items.filter(
    (i) =>
      i.term.toLowerCase().includes(search.toLowerCase()) ||
      i.definition.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = items.filter((i) => enabled[i.id] !== false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[85vh] border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">用語集（翻訳ブレ防止）</h2>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {items.length}件 / 有効 {enabledCount}件
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40">
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            原語（原文の表現）と訳語（統一したい訳）を登録。有効な用語のみ「入力に適用」で一括置換されます。
          </p>
        </div>

        {/* Add form — always visible */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">新規登録</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                原語（置換前）
              </label>
              <input
                type="text"
                value={originalTerm}
                onChange={(e) => setOriginalTerm(e.target.value)}
                placeholder="例: milestone"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-5" />
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                訳語（置換後）
              </label>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="例: マイルストーン"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!originalTerm.trim() || !translation.trim()}
              className="mt-5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors whitespace-nowrap"
            >
              登録
            </button>
          </div>
        </div>

        {/* Toolbar: search + bulk toggle + apply */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="用語を検索..."
            className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Bulk toggle */}
          {items.length > 0 && (
            <button
              onClick={toggleAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
                allEnabled
                  ? "border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {allEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {allEnabled ? "全て無効にする" : "全て有効にする"}
            </button>
          )}

          {/* Apply to input */}
          {onApplyToInput && currentEmailBody && items.length > 0 && (
            <button
              onClick={handleApply}
              disabled={enabledCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <Wand2 size={13} />
              {appliedCount !== null ? `${appliedCount}箇所を置換` : "入力に適用"}
            </button>
          )}
        </div>

        {/* Column header */}
        {filtered.length > 0 && (
          <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <span className="w-10 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">有効</span>
            <span className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">原語</span>
            <ArrowRight size={11} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            <span className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">訳語</span>
            <span className="w-6" />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Languages size={28} className="mb-2 opacity-30" />
              <p className="text-sm">{search ? "一致する用語が見つかりません" : "上のフォームから用語を登録してください"}</p>
            </div>
          )}
          <div className="space-y-1.5">
            {filtered.map((item) => {
              const isEnabled = enabled[item.id] !== false;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors group ${
                    isEnabled
                      ? "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                      : "border-gray-100 dark:border-gray-800 opacity-50"
                  }`}
                >
                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="flex-shrink-0"
                    title={isEnabled ? "無効にする" : "有効にする"}
                  >
                    {isEnabled ? (
                      <ToggleRight size={20} className="text-blue-500" />
                    ) : (
                      <ToggleLeft size={20} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </button>

                  {/* Term */}
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded truncate">
                    {item.term}
                  </span>

                  <ArrowRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />

                  {/* Translation */}
                  <span className="flex-1 text-sm text-blue-600 dark:text-blue-400 truncate">
                    {item.definition}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
