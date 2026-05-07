import { NextRequest, NextResponse } from "next/server";

const DOUBAO_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

const RESTORE_PROMPT = "修复这张老照片，提高清晰度和色彩";

export async function POST(request: NextRequest) {
  // 1. 只接受 POST
  if (request.method !== "POST") {
    return NextResponse.json({ success: false, error: "只支持 POST 请求" }, { status: 405 });
  }

  let code: string | undefined;
  let image: string | undefined;
  let width: number | undefined;
  let height: number | undefined;

  try {
    // 2. 解析 JSON body
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

  // 3. 验证卡密
  if (!code) {
    return NextResponse.json({ success: false, error: "卡密不能为空" }, { status: 400 });
  }
  const validCodes = (process.env.VALID_CODES || "").split(",").map((c) => c.trim()).filter(Boolean);
  if (!validCodes.includes(code)) {
    return NextResponse.json({ success: false, error: "卡密无效" }, { status: 401 });
  }

  // 4. 验证 image
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

  // 尺寸处理：默认 1152x1536，且必须是 64 的倍数
  const outW = Math.round((width || 1152) / 64) * 64;
  const outH = Math.round((height || 1536) / 64) * 64;
  const size = `${outW}x${outH}`;
  console.log("输出尺寸:", size);

  // 5. 调用豆包 API（55秒超时）
  const apiKey = process.env.DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL || "doubao-seedream-4-5-251128";

  if (!apiKey) {
    return NextResponse.json({ success: false, error: "API 配置错误，请联系卖家" }, { status: 500 });
  }

  let doubaoResult: Record<string, unknown>;
  try {
    console.log("开始调用豆包 API...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    const apiResponse = await fetch(DOUBAO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        image: image,
        prompt: RESTORE_PROMPT,
        response_format: "url",
        size: size,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseText = await apiResponse.text();
    console.log("豆包 API 状态:", apiResponse.status);
    console.log("豆包 API 响应:", responseText.slice(0, 500));

    if (!apiResponse.ok) {
      return NextResponse.json({ success: false, error: `AI 修复失败：${responseText.slice(0, 200)}` }, { status: 500 });
    }

    doubaoResult = JSON.parse(responseText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "调用豆包 API 超时或网络错误";
    console.error("豆包 API 调用失败:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  // 6. 解析豆包响应
  if (doubaoResult.error) {
    const errMsg = typeof doubaoResult.error === "string" ? doubaoResult.error : JSON.stringify(doubaoResult.error);
    console.error("豆包返回错误:", errMsg);
    return NextResponse.json({ success: false, error: `AI 返回错误：${errMsg}` }, { status: 500 });
  }

  const imageUrl = (doubaoResult.data as Array<{ url?: string }>)?.[0]?.url;
  if (!imageUrl) {
    return NextResponse.json({ success: false, error: "AI 返回结果为空" }, { status: 500 });
  }

  // 7 & 8. 返回结果
  console.log("修复成功，图片 URL:", imageUrl.slice(0, 80));
  return NextResponse.json({ success: true, imageUrl: imageUrl });
}
