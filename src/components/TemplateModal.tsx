import { useState } from "react";
import { X, Plus, Trash2, FileText, Copy } from "lucide-react";
import type { EmailTemplate } from "../types";

interface Props {
  templates: EmailTemplate[];
  onClose: () => void;
  onAdd: (payload: Omit<EmailTemplate, "id" | "createdAt" | "userId">) => void;
  onDelete: (id: string) => void;
  onUse?: (template: EmailTemplate) => void;
}

const CATEGORIES = ["お詫び文", "確認連絡", "案内文", "お礼文", "依頼文", "その他"];

export default function TemplateModal({ templates, onClose, onAdd, onDelete, onUse }: Props) {
  const [view, setView] = useState<"list" | "create">("list");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim() || !body.trim()) return;
    onAdd({ name: name.trim(), subject: subject.trim(), body: body.trim(), category });
    setName("");
    setSubject("");
    setBody("");
    setCategory(CATEGORIES[0]);
    setView("list");
  };

  const filtered = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">メールテンプレート</h2>
          </div>
          <div className="flex items-center gap-2">
            {view === "list" && (
              <button
                onClick={() => setView("create")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus size={14} />
                新規作成
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {view === "list" ? (
          <>
            {/* Category filter */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedCategory === null ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400"}`}
              >
                すべて
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedCategory === cat ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FileText size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">テンプレートがありません</p>
                </div>
              )}
              {filtered.map((tmpl) => (
                <div key={tmpl.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 group hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{tmpl.name}</span>
                      <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{tmpl.category}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onUse && (
                        <button
                          onClick={() => { onUse(tmpl); onClose(); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <Copy size={12} />
                          使用
                        </button>
                      )}
                      <button onClick={() => onDelete(tmpl.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {tmpl.subject && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">件名: {tmpl.subject}</p>}
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 whitespace-pre-wrap">{tmpl.body}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <button onClick={() => setView("list")} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
              ← 一覧に戻る
            </button>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">テンプレート名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: お詫びメール（遅延）"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">カテゴリ</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">件名（任意）</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 【お詫び】納期遅延のご連絡"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">本文 *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="テンプレートの本文を入力してください..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setView("list")}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || !body.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                作成する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
