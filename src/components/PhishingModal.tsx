import { ShieldAlert } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function PhishingModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-red-200 dark:border-red-800">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
          <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
            <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">フィッシング・なりすまし警告</h2>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">不審なメールの可能性があります</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
            <ShieldAlert size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed">
              このメールはフィッシング / なりすましの疑いがあります
            </p>
          </div>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>以下のような不審なパターンが検出されました：</p>
            <ul className="space-y-1 pl-4">
              <li className="list-disc">緊急性を強調する表現</li>
              <li className="list-disc">個人情報・認証情報の入力を求めている</li>
              <li className="list-disc">送信元が不審またはなりすましの可能性</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 leading-relaxed">
            このメールへの返信は慎重に検討してください。不審な場合はIT管理者や送信元に別の手段で確認することをお勧めします。
          </p>
        </div>

        {/* Button */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            OK（理解しました）
          </button>
        </div>
      </div>
    </div>
  );
}
