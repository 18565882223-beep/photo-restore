"use client";

import { useState } from "react";

interface ResultDisplayProps {
  originalImage: string;
  restoredImage: string;
  onReset: () => void;
}

export default function ResultDisplay({ originalImage, restoredImage, onReset }: ResultDisplayProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(restoredImage);
      const blob = await response.blob();
      const filename = "修复后照片.jpg";

      // 检查是否支持 navigator.share（iOS Safari 可触发分享面板，有"存储到照片"选项）
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "修复后照片",
            });
            setDownloading(false);
            return;
          } catch {
            // 用户取消分享，不报错，继续走兜底逻辑
          }
        }
      }

      // 兜底：Blob 下载（iOS Safari 会保存到 Files app）
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // 最终降级：新标签页打开
      window.open(restoredImage, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 修复前 */}
        <div className="space-y-2">
          <div className="text-white font-medium">修复前</div>
          <div className="bg-[#18181b] rounded-xl p-2 border border-[#2a2a2e]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalImage}
              alt="修复前"
              className="w-full rounded-lg object-contain max-h-64"
            />
          </div>
        </div>

        {/* 修复后 */}
        <div className="space-y-2">
          <div className="text-white font-medium">修复后</div>
          <div className="bg-[#18181b] rounded-xl p-2 border border-[#2a2a2e]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restoredImage}
              alt="修复后"
              className="w-full rounded-lg object-contain max-h-64"
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 bg-[#e96b2c] hover:bg-[#d45a20] disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {downloading ? "下载中…" : "下载修复图片"}
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-[#18181b] hover:bg-[#222] border border-[#2a2a2e] text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          再修复一张
        </button>
      </div>
    </div>
  );
}
