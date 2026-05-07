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
      // 远程 URL 需要先下载
      const res = await fetch(restoredImage);
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "修复后照片.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // 如果下载失败，尝试直接打开链接让用户手动保存
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
