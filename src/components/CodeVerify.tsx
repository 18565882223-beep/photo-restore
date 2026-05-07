"use client";

import { useState } from "react";

interface CodeVerifyProps {
  onVerified: (code: string) => void;
}

export default function CodeVerify({ onVerified }: CodeVerifyProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleVerify = async () => {
    if (!code.trim()) {
      setStatus("error");
      setMessage("请输入卡密");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (data.valid) {
        setStatus("success");
        setMessage("卡密有效，已绑定服务「老照片修复」");
        onVerified(code.trim());
      } else {
        setStatus("error");
        setMessage("卡密无效，请检查后重试");
      }
    } catch {
      setStatus("error");
      setMessage("验证失败，请检查网络后重试");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="输入卡密"
          disabled={status === "success"}
          className="flex-1 bg-[#18181b] border border-[#2a2a2e] rounded-lg px-4 py-3 text-white placeholder-[#a1a1aa] focus:outline-none focus:border-[#e96b2c] disabled:opacity-50"
        />
        <button
          onClick={handleVerify}
          disabled={status === "success" || status === "loading"}
          className="bg-[#e96b2c] hover:bg-[#d45a20] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors whitespace-nowrap"
        >
          {status === "loading" ? "验证中…" : "校验卡密"}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${status === "success" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
