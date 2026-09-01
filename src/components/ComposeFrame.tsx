import { useState } from "react";
import { Copy, Check, FileText, ArrowDownToLine, ChevronDown, Trash2 } from "lucide-react";
import { copyToClipboard } from "../utils/clipboard";

function CopyBtn({ text, label, disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    if (disabled || !text.trim()) return;
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      disabled={disabled || !text.trim()}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-all flex-shrink-0 ${
        copied
          ? "border-green-300 text-green-600 dark:text-green-400"
          : "border-blue-200 dark:border-gray-600 text-blue-500 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {label ?? (copied ? "コピー済み" : "コピー")}
    </button>
  );
}

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  subject: string;
  body: string;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  canInsert: boolean;
  onInsert: () => void;
  onClear: () => void;
}

export default function ComposeFrame({
  isOpen,
  onToggle,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  canInsert,
  onInsert,
  onClear,
}: Props) {
  const [allCopied, setAllCopied] = useState(false);

  const fullText = [subject ? `件名: ${subject}` : "", body].filter(Boolean).join("\n\n");
  const isEmpty = !subject.trim() && !body.trim();

  const handleCopyAll = async () => {
    if (!fullText.trim()) return;
    await copyToClipboard(fullText);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  return (
    <div
      className={`border-t-2 border-blue-200 dark:border-blue-800 bg-gradient-to-b from-blue-50/60 to-white dark:from-blue-950/30 dark:to-gray-900 flex flex-col flex-shrink-0 transition-all ${
        isOpen ? "h-80" : "h-auto"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2.5 w-full text-left hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-colors flex-shrink-0"
      >
        <FileText size={13} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex-1">
          テンプレート・送信文
        </span>
        {!isEmpty && !isOpen && (
          <span className="text-xs text-blue-400 dark:text-blue-500 mr-2 max-w-40 truncate">
            {subject || body.slice(0, 30)}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "" : "-rotate-90"}`}
        />
      </button>

      {isOpen && (
        <div className="flex-1 flex flex-col gap-2 px-4 pb-3 min-h-0 overflow-hidden">
          {/* Subject row */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="件名（任意）"
              className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <CopyBtn text={subject} />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={"テンプレートを選択すると内容がここに表示されます。\n上の出力エリアで生成した返信文を「生成結果を挿入」で差し込んで編集できます。"}
            className="flex-1 min-h-0 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
          />

          {/* Footer */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onInsert}
              disabled={!canInsert}
              title="出力エリアの生成結果を本文に挿入します"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownToLine size={12} />
              生成結果を挿入
            </button>
            <button
              onClick={handleCopyAll}
              disabled={isEmpty}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {allCopied ? <Check size={12} /> : <Copy size={12} />}
              {allCopied ? "コピー済み" : "全体をコピー"}
            </button>
            <CopyBtn text={body} label="本文をコピー" />
            <div className="flex-1" />
            {!isEmpty && (
              <button
                onClick={onClear}
                title="送信文をクリア"
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors rounded-lg"
              >
                <Trash2 size={12} />
                クリア
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
