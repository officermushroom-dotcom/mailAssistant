import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ParsedEmail, QuotedEmail } from "../types";

interface Props {
  rawInput: string;
  isParsed: boolean;
  newEmail: ParsedEmail;
  quotedEmails: QuotedEmail[];
  includeQuoted: boolean;
  onRawInputChange: (v: string) => void;
  onNewEmailChange: (field: keyof ParsedEmail, value: string) => void;
  onToggleQuoted: () => void;
  onToggleAccordion: (id: string) => void;
}

export default function InputArea({
  rawInput,
  isParsed,
  newEmail,
  quotedEmails,
  includeQuoted,
  onRawInputChange,
  onNewEmailChange,
  onToggleQuoted,
  onToggleAccordion,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData("text/plain");
    if (text) onRawInputChange(text);
  };

  if (!isParsed) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">入力エリア</h3>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-3">
          <div
            className={`flex-1 relative rounded-xl border-2 transition-colors ${isDragOver ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-dashed border-gray-200 dark:border-gray-700"}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <textarea
              value={rawInput}
              onChange={(e) => onRawInputChange(e.target.value)}
              placeholder="ここにメールを貼り付けてください&#10;&#10;（例）&#10;From: sender@example.com&#10;Subject: プロジェクト進捗報告のお願い&#10;&#10;お世話になっております。..."
              className="absolute inset-0 w-full h-full px-4 py-4 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent resize-none focus:outline-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">入力エリア（解析済み）</h3>
        <button
          onClick={() => onRawInputChange("")}
          className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
        >
          リセット
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* New email section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">新規メール</span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="space-y-3">
            <FieldRow
              label="件名"
              value={newEmail.subject}
              onChange={(v) => onNewEmailChange("subject", v)}
              placeholder="件名を入力..."
            />
            <FieldRow
              label="送信元"
              value={newEmail.sender}
              onChange={(v) => onNewEmailChange("sender", v)}
              placeholder="送信者のメールアドレスまたは名前..."
            />
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">本文</label>
              <textarea
                value={newEmail.body}
                onChange={(e) => onNewEmailChange("body", e.target.value)}
                rows={8}
                placeholder="メール本文..."
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
              />
            </div>
          </div>
        </section>

        {/* Quoted emails section */}
        {quotedEmails.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">過去の引用メール</span>
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">過去メールも処理対象にする</span>
              <button
                onClick={onToggleQuoted}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${includeQuoted ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}`}
              >
                <span
                  className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${includeQuoted ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </div>

            <div className="space-y-2">
              {quotedEmails.map((qm) => (
                <div key={qm.id} className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => onToggleAccordion(qm.id)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {qm.isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{qm.date}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{qm.sender}</span>
                  </button>
                  {qm.isOpen && (
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mt-2">
                        {qm.body}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function FieldRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
