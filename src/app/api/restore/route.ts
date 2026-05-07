import { NextRequest, NextResponse } from "next/server";

const DOUBAO_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const RESTORE_PROMPT = "修复这张老照片，提高清晰度和色彩";

// 调用豆包 API，带自动重试（最多3次）
async function callDoubao(body: Record<string, unknown>, apiKey: string, model: string): Promise<Record<string, unknown>> {
  const maxRetries = 3;

  for (let i = 1; i <= maxRetries; i++) {
    console.log(`豆包 API 第 ${i} 次尝试...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiResponse = await fetch(DOUBAO_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...body, model }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseText = await apiResponse.text();
      console.log(`豆包 API 第 ${i} 次状态: ${apiResponse.status}`);

      if (apiResponse.ok) {
        const result = JSON.parse(responseText);
        console.log(`豆包 API 第 ${i} 次成功`);
        return result;
      }

      console.log(`豆包 API 第 ${i} 次失败:`, responseText.slice(0, 200));
      if (i < maxRetries) {
        console.log(`等待 2 秒后重试...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      console.log(`豆包 API 第 ${i} 次异常:`, msg);
      if (i < maxRetries) {
        console.log(`等待 2 秒后重试...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw new Error("豆包 API 多次调用失败，请稍后重试");
}

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ success: false, error: "只支持 POST 请求" }, { status: 405 });
  }

  let code: string | undefined;
  let image: string | undefined;
  let width: number | undefined;
  let height: number | undefined;

  try {
    const body = await request.json();
    code = body.code;
    image = body.image;
    width = body.width;
    height = body.height;

    console.log("=== 后端收到请求 ===");
    console.log("image 类型:", typeof image);
    console.log("image 开头:", image ? image.substring(0, 30) : "无");
    console.log("image 长度:", image ? image.length : 0);
    console.log("width:", width, "height:", height);
    console.log("========================");
  } catch {
    return NextResponse.json({ success: false, error: "请求 body 解析失败，请使用 JSON 格式" }, { status: 400 });
  }

  // 验证卡密
  if (!code) {
    return NextResponse.json({ success: false, error: "卡密不能为空" }, { status: 400 });
  }
  const validCodes = (process.env.VALID_CODES || "").split(",").map((c) => c.trim()).filter(Boolean);
  if (!validCodes.includes(code)) {
    return NextResponse.json({ success: false, error: "卡密无效" }, { status: 401 });
  }

  // 验证 image
  if (!image) {
    return NextResponse.json({ success: false, error: "请上传照片" }, { status: 400 });
  }
  if (typeof image !== "string") {
    return NextResponse.json({ success: false, error: "图片格式错误：image 必须是 base64 字符串" }, { status: 400 });
  }
  if (!image.startsWith("data:image")) {
    return NextResponse.json({ success: false, error: "图片格式错误：必须是 data:image 开头" }, { status: 400 });
  }
  if (image.length < 1000) {
    return NextResponse.json({ success: false, error: "图片数据不完整，请重新上传" }, { status: 400 });
  }

  // 固定尺寸：1920x2560 = 4,915,200 像素，满足豆包最低 3,686,400 要求
  const size = "1920x2560";
  console.log("输出尺寸:", size);

  const apiKey = process.env.DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL || "doubao-seedream-4-5-251128";

  if (!apiKey) {
    return NextResponse.json({ success: false, error: "API 配置错误，请联系卖家" }, { status: 500 });
  }

  // 调用豆包 API（带重试）
  let doubaoResult: Record<string, unknown>;
  try {
    doubaoResult = await callDoubao(
      {
        image: image,
        prompt: RESTORE_PROMPT,
        response_format: "url",
        size: size,
      },
      apiKey,
      model
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "调用豆包 API 失败";
    console.error("豆包 API 最终失败:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  // 解析豆包响应
  if (doubaoResult.error) {
    const errMsg = typeof doubaoResult.error === "string" ? doubaoResult.error : JSON.stringify(doubaoResult.error);
    console.error("豆包返回错误:", errMsg);
    return NextResponse.json({ success: false, error: `AI 返回错误：${errMsg}` }, { status: 500 });
  }

  const imageUrl = (doubaoResult.data as Array<{ url?: string }>)?.[0]?.url;
  if (!imageUrl) {
    return NextResponse.json({ success: false, error: "AI 返回结果为空" }, { status: 500 });
  }

  console.log("修复成功，图片 URL:", imageUrl.slice(0, 80));
  return NextResponse.json({ success: true, imageUrl: imageUrl });
}
