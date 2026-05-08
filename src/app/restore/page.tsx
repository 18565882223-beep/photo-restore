"use client";

import { useState } from "react";
import Link from "next/link";
import CodeVerify from "@/components/CodeVerify";
import ImageUpload from "@/components/ImageUpload";
import ResultDisplay from "@/components/ResultDisplay";

type Step = "verify" | "upload" | "result" | "loading";

const MAX_EDGE = 1536;

// 前端压缩：最长边限制为 1536，输出 JPEG，quality 0.85
async function compressImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      let { naturalWidth: origW, naturalHeight: origH } = img;
      console.log("=== 前端压缩 ===");
      console.log("压缩前:", origW, "x", origH);

      let outW = origW;
      let outH = origH;

      if (origW >= origH && origW > MAX_EDGE) {
        outW = MAX_EDGE;
        outH = Math.round((MAX_EDGE / origW) * origH);
      } else if (origH > origW && origH > MAX_EDGE) {
        outH = MAX_EDGE;
        outW = Math.round((MAX_EDGE / origH) * origW);
      }

      outW = Math.round(outW / 2) * 2;
      outH = Math.round(outH / 2) * 2;

      console.log("压缩后:", outW, "x", outH);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, outW, outH);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      console.log("base64 长度:", dataUrl.length);
      console.log("===================");

      resolve({ dataUrl, width: outW, height: outH });
    };

    img.onerror = reject;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RestorePage() {
  const [step, setStep] = useState<Step>("verify");
  const [code, setCode] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCodeVerified = (verifiedCode: string) => {
    setCode(verifiedCode);
    setStep("upload");
  };

  const handleImageSelected = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRestore = async () => {
    if (!imageFile || !code) {
      setError("请上传照片");
      return;
    }

    setStep("loading");
    setError("");

    try {
      // 1. 前端压缩图片
      const { dataUrl, width, height } = await compressImage(imageFile);

      console.log("=== 前端提交 ===");
      console.log("dataUrl 开头:", dataUrl.slice(0, 50));
      console.log("dataUrl 长度:", dataUrl.length);
      console.log("width:", width, "height:", height);
      console.log("=================");

      // 2 & 3. 调用 /api/restore（60秒超时）
      const response = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, image: dataUrl, width, height }),
        signal: AbortSignal.timeout(60000),
      });

      // 4. 处理响应
      const rawText = await response.text();
      console.log("=== 后端响应 ===");
      console.log("status:", response.status);
      console.log("raw:", rawText.slice(0, 300));
      console.log("=================");

      let result: { success?: boolean; imageUrl?: string; error?: string };
      try {
        result = JSON.parse(rawText);
      } catch {
        setError(`服务器返回异常：${rawText.slice(0, 200)}`);
        setStep("upload");
        return;
      }

      if (result.success && result.imageUrl) {
        setRestoredImage(result.imageUrl);
        setStep("result");
      } else {
        setError(result.error || "修复失败");
        setStep("upload");
      }
    } catch (err) {
      console.error("请求错误:", err);
      const msg = err instanceof Error ? err.message : "未知错误";
      if (msg.includes("abort") || msg.includes("timeout") || msg.includes("Timeout")) {
        setError("请求超时，图片修复可能需要较长时间，请重试");
      } else {
        setError(msg);
      }
      setStep("upload");
    }
  };

  const handleReset = () => {
    setStep("verify");
    setCode("");
    setImageFile(null);
    setOriginalPreview(null);
    setRestoredImage(null);
    setError("");
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl space-y-6">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div className={`flex items-center gap-1 ${step === "verify" ? "text-[#e96b2c]" : "text-[#a1a1aa]"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "verify" ? "bg-[#e96b2c] text-white" : "bg-[#2a2a2e]"}`}>1</span>
            <span>卡密验证</span>
          </div>
          <div className="w-8 h-px bg-[#2a2a2e]" />
          <div className={`flex items-center gap-1 ${step === "upload" || step === "result" || step === "loading" ? "text-[#e96b2c]" : "text-[#a1a1aa]"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "upload" || step === "result" || step === "loading" ? "bg-[#e96b2c] text-white" : "bg-[#2a2a2e]"}`}>2</span>
            <span>上传照片</span>
          </div>
          <div className="w-8 h-px bg-[#2a2a2e]" />
          <div className={`flex items-center gap-1 ${step === "result" ? "text-[#e96b2c]" : "text-[#a1a1aa]"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "result" ? "bg-[#e96b2c] text-white" : "bg-[#2a2a2e]"}`}>3</span>
            <span>完成</span>
          </div>
        </div>

        {/* 步骤1：卡密验证 */}
        <div className="bg-[#18181b] rounded-xl p-6 border border-[#2a2a2e]">
          <h2 className="text-lg font-medium text-white mb-4">步骤1：卡密验证</h2>
          <CodeVerify onVerified={handleCodeVerified} />
        </div>

        {/* 步骤2：上传照片 */}
        {(step === "upload" || step === "loading" || step === "result") && (
          <div className="bg-[#18181b] rounded-xl p-6 border border-[#2a2a2e]">
            <h2 className="text-lg font-medium text-white mb-4">步骤2：上传照片</h2>
            <ImageUpload onImageSelected={handleImageSelected} disabled={step === "loading"} />

            {imageFile && (
              <button
                onClick={handleRestore}
                disabled={step === "loading"}
                className="w-full mt-4 bg-[#e96b2c] hover:bg-[#d45a20] disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                {step === "loading" ? "正在修复中，请稍候…" : "开始修复"}
              </button>
            )}
          </div>
        )}

        {/* 加载状态 */}
        {step === "loading" && (
          <div className="bg-[#18181b] rounded-xl p-8 border border-[#2a2a2e] text-center">
            <div className="text-4xl mb-4 animate-pulse">🔄</div>
            <div className="text-white font-medium">正在修复中，请稍候…</div>
            <div className="text-[#a1a1aa] text-sm mt-2">预计需要 10-30 秒</div>
          </div>
        )}

        {/* 步骤3：结果展示 */}
        {step === "result" && originalPreview && restoredImage && (
          <div className="bg-[#18181b] rounded-xl p-6 border border-[#2a2a2e]">
            <h2 className="text-lg font-medium text-white mb-4">步骤3：修复完成</h2>
            <ResultDisplay originalImage={originalPreview} restoredImage={restoredImage} onReset={handleReset} />
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444] rounded-xl p-4">
            <p className="text-[#ef4444] text-sm">{error}</p>
          </div>
        )}

        {/* 返回首页 */}
        <div className="text-center">
          <Link href="/" className="text-[#a1a1aa] hover:text-white text-sm">返回首页</Link>
        </div>
      </div>
    </main>
  );
}
