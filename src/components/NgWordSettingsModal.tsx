import { useState, useEffect } from "react";
import { X, Plus, Trash2, ShieldAlert, ToggleLeft, ToggleRight } from "lucide-react";

const DEFAULT_NG_WORDS = [
  "パスワード", "クレジットカード", "暗証番号", "口座番号",
  "マイナンバー", "秘密鍵", "トークン",
];

const STORAGE_KEY = "mailAssistant:ngWordSettings";

interface NgWordEntry {
  word: string;
  enabled: boolean;
  isDefault: boolean;
}

function loadEntries(): NgWordEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(stored)) return stored;
  } catch {}
  return DEFAULT_NG_WORDS.map((w) => ({ word: w, enabled: true, isDefault: true }));
}

interface Props {
  onClose: () => void;
  onWordsChange: (words: string[]) => void;
}

export default function NgWordSettingsModal({ onClose, onWordsChange }: Props) {
  const [entries, setEntries] = useState<NgWordEntry[]>(loadEntries);
  const [newWord, setNewWord] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    onWordsChange(entries.filter((e) => e.enabled).map((e) => e.word));
  }, [entries]);

  const toggle = (word: string) => {
    setEntries((prev) => prev.map((e) => e.word === word ? { ...e, enabled: !e.enabled } : e));
  };

  const remove = (word: string) => {
    setEntries((prev) => prev.filter((e) => e.word !== word));
  };

  const add = () => {
    const w = newWord.trim();
    if (!w || entries.some((e) => e.word === w)) return;
    setEntries((prev) => [...prev, { word: w, enabled: true, isDefault: false }]);
    setNewWord("");
  };

  const enabledCount = entries.filter((e) => e.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <ShieldAlert size={18} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">NGワード設定</h2>
            <p className="text-xs text-gray-400 mt-0.5">送信前に含まれていると警告するワードを管理します</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Word list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {entries.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-8">NGワードが登録されていません</p>
          )}
          {entries.map((entry) => (
            <div
              key={entry.word}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                entry.enabled
                  ? "border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 opacity-60"
              }`}
            >
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 font-medium">
                {entry.word}
              </span>
              {entry.isDefault && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex-shrink-0">
                  デフォルト
                </span>
              )}
              <button
                onClick={() => toggle(entry.word)}
                className={`flex-shrink-0 transition-colors ${
                  entry.enabled
                    ? "text-amber-500 hover:text-amber-600"
                    : "text-gray-300 dark:text-gray-600 hover:text-gray-400"
                }`}
                title={entry.enabled ? "無効にする" : "有効にする"}
              >
                {entry.enabled
                  ? <ToggleRight size={22} />
                  : <ToggleLeft size={22} />
                }
              </button>
              {!entry.isDefault && (
                <button
                  onClick={() => remove(entry.word)}
                  className="flex-shrink-0 p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors rounded"
                  title="削除"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new word */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="新しいNGワードを追加..."
              className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={add}
              disabled={!newWord.trim() || entries.some((e) => e.word === newWord.trim())}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Plus size={14} />
              追加
            </button>
          </div>
          <p className="text-xs text-gray-400">
            現在 <span className="font-medium text-amber-500">{enabledCount}</span> 件のNGワードが有効です
          </p>
        </div>
      </div>
    </div>
  );
}
