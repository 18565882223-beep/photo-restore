import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl text-center space-y-8">
        {/* 标题区域 */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            老照片 AI 修复
          </h1>
          <p className="text-base sm:text-lg text-[#a1a1aa]">
            上传老照片，AI 增强清晰度、修复划痕、优化人像细节
          </p>
        </div>

        {/* 服务说明卡片 */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-[#18181b] rounded-xl p-4 border border-[#2a2a2e]">
            <div className="text-2xl mb-2">📸</div>
            <div className="text-white font-medium">老照片清晰度增强</div>
            <div className="text-[#a1a1aa] text-sm">提升照片分辨率和清晰度</div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-4 border border-[#2a2a2e]">
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-white font-medium">划痕、噪点修复</div>
            <div className="text-[#a1a1aa] text-sm">修复破损、污渍、折痕</div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-4 border border-[#2a2a2e]">
            <div className="text-2xl mb-2">🎨</div>
            <div className="text-white font-medium">黑白照片上色</div>
            <div className="text-[#a1a1aa] text-sm">智能识别并自然上色</div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-4 border border-[#2a2a2e]">
            <div className="text-2xl mb-2">👤</div>
            <div className="text-white font-medium">人脸细节增强</div>
            <div className="text-[#a1a1aa] text-sm">保持面部特征，提升质感</div>
          </div>
        </div>

        {/* 开始修复按钮 */}
        <Link
          href="/restore"
          className="inline-block bg-[#e96b2c] hover:bg-[#d45a20] text-white font-medium py-3 px-8 rounded-full transition-colors"
        >
          开始修复
        </Link>

        {/* 底部说明 */}
        <p className="text-[#a1a1aa] text-sm">
          需要卡密才能使用，请联系卖家获取
        </p>
      </div>
    </main>
  );
}
