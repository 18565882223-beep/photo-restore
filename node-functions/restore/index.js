const DOUBAO_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const RESTORE_PROMPT = "修复这张老照片，提高清晰度和色彩";
const MIN_PIXELS = 3686400;

async function callDoubao(body, apiKey, model) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(DOUBAO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...body, model }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const text = await response.text();
    console.log("豆包 API 状态:", response.status);

    if (!response.ok) {
      throw new Error(`豆包 API 错误: ${text.slice(0, 200)}`);
    }

    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function calculateSize(origW, origH) {
  let w = origW;
  let h = origH;

  const currentPixels = w * h;
  console.log(`原始尺寸: ${w}x${h} = ${currentPixels} 像素`);

  if (currentPixels < MIN_PIXELS) {
    const scale = Math.sqrt(MIN_PIXELS / currentPixels);
    w = Math.ceil(w * scale);
    h = Math.ceil(h * scale);
    console.log(`放大比例: ${scale.toFixed(2)}，放大后: ${w}x${h} = ${w * h} 像素`);
  }

  if (w % 2 !== 0) w += 1;
  if (h % 2 !== 0) h += 1;

  console.log(`最终尺寸: ${w}x${h}`);
  return `${w}x${h}`;
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

export const onRequestPost = async (context) => {
  let code, image, width, height;

  try {
    const body = await context.request.json();
    code = body.code;
    image = body.image;
    width = body.width;
    height = body.height;

    console.log("=== Node Function 收到请求 ===");
    console.log("image 类型:", typeof image);
    console.log("image 长度:", image ? image.length : 0);
    console.log("width:", width, "height:", height);
  } catch {
    return new Response(JSON.stringify({ success: false, error: "请求 body 解析失败" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 验证卡密
  if (!code) {
    return new Response(JSON.stringify({ success: false, error: "卡密不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const validCodes = (process.env.VALID_CODES || "").split(",").map((c) => c.trim()).filter(Boolean);
  if (!validCodes.includes(code)) {
    return new Response(JSON.stringify({ success: false, error: "卡密无效" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 验证 image
  if (!image || typeof image !== "string" || !image.startsWith("data:image") || image.length < 1000) {
    return new Response(JSON.stringify({ success: false, error: "图片格式错误，请重新上传" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 计算尺寸
  const size = calculateSize(width || 1152, height || 1536);

  // 调用豆包
  const apiKey = process.env.DOUBAO_API_KEY;
  const model = process.env.DOUBAO_MODEL || "doubao-seedream-4-5-251128";

  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: "API 配置错误，请联系卖家" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  let doubaoResult;
  try {
    console.log("开始调用豆包 API...");
    doubaoResult = await callDoubao(
      { image, prompt: RESTORE_PROMPT, response_format: "url", size },
      apiKey,
      model
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "调用豆包 API 失败";
    console.error("豆包 API 调用失败:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 解析响应
  if (doubaoResult.error) {
    const errMsg = typeof doubaoResult.error === "string" ? doubaoResult.error : JSON.stringify(doubaoResult.error);
    console.error("豆包返回错误:", errMsg);
    return new Response(JSON.stringify({ success: false, error: `AI 返回错误：${errMsg}` }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const imageUrl = doubaoResult.data?.[0]?.url;
  if (!imageUrl) {
    return new Response(JSON.stringify({ success: false, error: "AI 返回结果为空" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  console.log("修复成功:", imageUrl.slice(0, 80));
  return new Response(JSON.stringify({ success: true, imageUrl }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
