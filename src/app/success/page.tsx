import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl text-center space-y-6">
        <div className="text-6xl">✅</div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">修复完成</h1>
          <p className="text-[#a1a1aa]">
            您的老照片已成功修复，下载图片后可联系闲鱼卖家反溃使用体验
          </p>
        </div>

        <Link
          href="/"
          className="inline-block bg-[#e96b2c] hover:bg-[#d45a20] text-white font-medium py-3 px-8 rounded-full transition-colors"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
