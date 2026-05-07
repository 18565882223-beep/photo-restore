"use client";

import { useState } from "react";
import Link from "next/link";
import CodeVerify from "@/components/CodeVerify";
import ImageUpload from "@/components/ImageUpload";
import ResultDisplay from "@/components/ResultDisplay";

type Step = "verify" | "upload" | "result" | "loading";

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
    if (!imageFile || !code) return;

    setStep("loading");
    setError("");

    try {
      const formData = new FormData();
      formData.append("code", code);
      formData.append("image", imageFile);

      const res = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setRestoredImage(data.imageUrl);
        setStep("result");
      } else {
        setError(data.message || "修复失败");
        setStep("upload");
      }
    } catch {
      setError("网络错误，请检查网络后重试");
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
            <ImageUpload
              onImageSelected={handleImageSelected}
              disabled={step === "loading"}
            />

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
            <ResultDisplay
              originalImage={originalPreview}
              restoredImage={restoredImage}
              onReset={handleReset}
            />
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
          <Link href="/" className="text-[#a1a1aa] hover:text-white text-sm">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
