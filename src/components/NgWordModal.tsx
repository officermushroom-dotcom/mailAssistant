import { AlertTriangle, X } from "lucide-react";

interface Props {
  foundWords: string[];
  onContinue: () => void;
  onFix: () => void;
}

export default function NgWordModal({ foundWords, onContinue, onFix }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-amber-200 dark:border-amber-700">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 rounded-t-xl">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">NGワード検出</h2>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">機密情報が含まれている可能性があります</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            入力テキストに以下のNGワードが含まれています。このまま処理を続けてもよいですか？
          </p>

          <div className="flex flex-wrap gap-2">
            {foundWords.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg text-xs font-medium"
              >
                <X size={10} />
                {word}
              </span>
            ))}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 leading-relaxed">
            「修正する」を選ぶと入力エリアに戻ります。NGワードを削除してから再度処理してください。
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onFix}
            className="flex-1 py-2.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            修正する
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            そのまま続行
          </button>
        </div>
      </div>
    </div>
  );
}
