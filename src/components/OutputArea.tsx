import { useState } from "react"
import { Copy, Check, Loader2, ChevronDown, Play } from "lucide-react"
import type { Mode, SubPanelData } from "../types"
import { copyToClipboard } from "../utils/clipboard"
import SubPanel from "./SubPanel"

interface ActionButton {
  id: string
  label: string
  description: string
}

const UNDERSTAND_ACTIONS: ActionButton[] = [
  { id: "summary", label: "要約する", description: "メールの内容を簡潔に要約" },
  {
    id: "keyPoints",
    label: "翻訳する",
    description: "重要なポイントを箇条書きで",
  },
  {
    id: "todoExtract",
    label: "Todoを抽出",
    description: "対応が必要なタスクを抽出",
  },
  { id: "glossary", label: "用語を解説", description: "専門用語や略語を説明" },
  {
    id: "sentiment",
    label: "感情・文脈を分析",
    description: "送信者の意図やトーンを分析",
  },
]

const REPLY_ACTIONS: ActionButton[] = [
  {
    id: "draft",
    label: "日本語で返信文を作成",
    description: "設定に基づいた返信を生成",
  },
  {
    id: "translate",
    label: "英語で返信文を作成",
    description: "英語の返信文を生成",
  },
  {
    id: "checkPoints",
    label: "確認ポイントを提示",
    description: "返信前に確認すべき点を列挙",
  },
  {
    id: "alternative",
    label: "別バージョンを生成",
    description: "異なるアプローチの返信文",
  },
  {
    id: "subject",
    label: "件名を提案",
    description: "適切な件名候補を提案",
  },
  {
    id: "review",
    label: "口コミに返信",
    description: "口コミの返信文を作成",
  },
]

const STRUCTURED_REPLY_ACTIONS = new Set(["draft", "alternative", "translate"])

interface Props {
  mode: Mode
  outputText: string
  isLoading: boolean
  activeAction: string | null
  canAct: boolean
  subPanelData: SubPanelData | null
  replySubject: string
  replyBody: string
  onReplySubjectChange: (v: string) => void
  onReplyBodyChange: (v: string) => void
  onAction: (actionId: string, extraInstruction: string) => void
  onOutputChange: (v: string) => void
  onSaveTodo: (text: string) => void
}

function CopyButton({
  text,
  label = "コピー",
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    if (!text) return
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      disabled={!text}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all ${
        copied
          ? "border-green-300 text-green-600 dark:text-green-400"
          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "コピー済み" : label}
    </button>
  )
}

export default function OutputArea({
  mode,
  outputText,
  isLoading,
  activeAction,
  canAct,
  subPanelData,
  replySubject,
  replyBody,
  onReplySubjectChange,
  onReplyBodyChange,
  onAction,
  onOutputChange,
  onSaveTodo,
}: Props) {
  const [subPanelOpen, setSubPanelOpen] = useState(true)
  const [selectedFunc, setSelectedFunc] = useState<string | null>(null)
  const [extraInstruction, setExtraInstruction] = useState("")

  const actions = mode === "understand" ? UNDERSTAND_ACTIONS : REPLY_ACTIONS
  const isStructured =
    mode === "reply" && STRUCTURED_REPLY_ACTIONS.has(activeAction ?? "")

  const handleSaveTodo = () => {
    if (!outputText) return
    const lines = outputText
      .split("\n")
      .map((l) => l.replace(/^[・□\-\*]\s*/, "").trim())
      .filter((l) => l.length > 0 && !l.startsWith("【"))
    lines.forEach((line) => onSaveTodo(line))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          出力エリア
        </h3>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">① 機能を選択</p>
          {!canAct && (
            <span className="text-xs text-amber-500 dark:text-amber-400">
              ← 左にメールを貼り付けてください
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const isSelected = selectedFunc === action.id
            const isRunning = isLoading && activeAction === action.id
            return (
              <button
                key={action.id}
                onClick={() => setSelectedFunc(action.id)}
                title={action.description}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  isSelected
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : activeAction === action.id && !selectedFunc
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRunning && <Loader2 size={12} className="animate-spin" />}
                {action.label}
              </button>
            )
          })}
        </div>

        {/* Extra instruction */}
        <textarea
          value={extraInstruction}
          onChange={(e) => setExtraInstruction(e.target.value)}
          placeholder="AIへの追加指示（任意）：例「箇条書きで」「200字以内で」「丁寧に」など"
          rows={2}
          className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
        />

        {/* Execute button */}
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400 font-medium">② 解析して実行</p>
          <button
            onClick={() => {
              if (selectedFunc) {
                onAction(selectedFunc, extraInstruction)
                setSelectedFunc(null)
              }
            }}
            disabled={!selectedFunc || !canAct || isLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Play size={11} />
            )}
            {isLoading
              ? "実行中..."
              : selectedFunc
                ? `「${actions.find((a) => a.id === selectedFunc)?.label}」を実行`
                : "機能を選んでください"}
          </button>
        </div>
      </div>

      {/* Scrollable content: output + sub-panels */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Output area ── */}
        {isStructured ? (
          <div className="p-4 space-y-4">
            {/* Structured reply */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-px w-6 bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
                  {activeAction === "translate"
                    ? "翻訳された返信メール"
                    : "作成された返信メール"}
                </span>
                <div className="h-px w-6 bg-gray-100 dark:bg-gray-800" />
              </div>
              <CopyButton text={outputText} label="全体をコピー" />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    生成中...
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* 件名 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      件名
                    </label>
                    <CopyButton text={replySubject} />
                  </div>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => onReplySubjectChange(e.target.value)}
                    placeholder="件名を入力（任意）"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 本文 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      本文
                    </label>
                    <CopyButton text={replyBody} />
                  </div>
                  <textarea
                    value={replyBody}
                    onChange={(e) => onReplyBodyChange(e.target.value)}
                    placeholder="返信文がここに表示されます..."
                    rows={12}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Flat text */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {activeAction
                  ? actions.find((a) => a.id === activeAction)?.description
                  : "上のボタンをクリックして処理を実行してください"}
              </span>
              <div className="flex items-center gap-1.5">
                {activeAction === "todoExtract" && outputText && (
                  <button
                    onClick={handleSaveTodo}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Todoに保存
                  </button>
                )}
                <CopyButton text={outputText} />
              </div>
            </div>

            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-xl z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={24} className="text-blue-500 animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      処理中...
                    </span>
                  </div>
                </div>
              )}
              <textarea
                value={outputText}
                onChange={(e) => onOutputChange(e.target.value)}
                placeholder={
                  activeAction
                    ? "処理結果がここに表示されます..."
                    : "機能ボタンを選択して実行してください"
                }
                rows={12}
                className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* ── Sub-panels (understand mode only) ── */}
        {/* {mode === "understand" && (
          <div className="border-t border-gray-100 dark:border-gray-800 mx-4 mb-4">
            <button
              onClick={() => setSubPanelOpen((v) => !v)}
              className="flex items-center gap-2 w-full py-3 text-left"
            >
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${
                  subPanelOpen ? "" : "-rotate-90"
                }`}
              />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                メール分析サマリー
              </span>
            </button>

            {subPanelOpen && (
              <SubPanel data={subPanelData} onSaveTodo={onSaveTodo} />
            )}
          </div>
        )} */}
      </div>
    </div>
  )
}
