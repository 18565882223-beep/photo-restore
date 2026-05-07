import { NextRequest, NextResponse } from "next/server";

// 修复提示词（来自交接文档）
const RESTORE_PROMPT = `你是一位专业的老照片修复师。请对这张老照片进行全面修复，严格遵守以下要求：

【核心原则】
- 严禁改变照片构图、比例和裁切方式
- 严禁添加原图中不存在的元素（如花朵、装饰、背景物体等）
- 只做修复，不做创作，忠实还原照片原貌

【修复破损】
- 修复照片上的划痕、折痕、裂纹、污渍、水渍、霉点
- 补全缺失或模糊的区域，使其与周围内容自然融合
- 修复时参考照片中已有的纹理和色调，不要凭空生成新内容

【清晰度增强】
- 显著提升照片清晰度和锐度
- 去除噪点和颜色失真
- 让照片细节更加清晰可见

【人物处理】
- 精细修复人物面部，增强五官细节
- 严格保持人物原本的外貌特征，绝对不能改变长相
- 修复人物服装的破损和褶皱

【色彩处理】
- 如果是黑白照片，进行智能上色：肤色自然、服装颜色符合年代、背景色调和谐
- 如果是彩色照片，修复褪色和变色，还原真实色彩

【整体风格】
- 保持照片的年代感和历史氛围，不要做成现代风格
- 修复后的照片应该看起来像一张保存完好的老照片，而不是 AI 生成的新图
- 输出高清、高质量的修复结果`;

// 计算等比缩放尺寸（满足豆包 Seedream 4.5 最低像素要求）
function calculateSize(origW: number, origH: number): { width: number; height: number } {
  const MIN_PIXELS = 2560 * 1440; // 3,686,400
  const MAX_LONG_EDGE = 4096;
  const LONG_EDGE = 2048;
  const ratio = origW / origH;

  let outW: number;
  let outH: number;

  if (origW >= origH) {
    outW = LONG_EDGE;
    outH = Math.round(outW / ratio);
  } else {
    outH = LONG_EDGE;
    outW = Math.round(outH * ratio);
  }

  if (outW * outH < MIN_PIXELS) {
    if (origW >= origH) {
      outH = Math.ceil(Math.sqrt(MIN_PIXELS / ratio));
      outW = Math.round(outH * ratio);
    } else {
      outW = Math.ceil(Math.sqrt(MIN_PIXELS * ratio));
      outH = Math.round(outW / ratio);
    }
  }

  if (outW > MAX_LONG_EDGE) {
    outH = Math.round(MAX_LONG_EDGE / outW * outH);
    outW = MAX_LONG_EDGE;
  }
  if (outH > MAX_LONG_EDGE) {
    outW = Math.round(MAX_LONG_EDGE / outH * outW);
    outH = MAX_LONG_EDGE;
  }

  outW = Math.round(outW / 2) * 2;
  outH = Math.round(outH / 2) * 2;

  return { width: outW, height: outH };
}

// 照片修复接口
export async function POST(request: NextRequest) {
  try {
    // 只接受 JSON 格式
    const body = await request.json();
    const code: string = body.code;
    const imageRaw: unknown = body.image;
    const width: number = body.width || 1024;
    const height: number = body.height || 1024;

    // 调试日志
    console.log("=== 后端收到请求 ===");
    console.log("typeof image:", typeof imageRaw);
    console.log("image is array:", Array.isArray(imageRaw));
    console.log("image preview:", JSON.stringify(imageRaw).slice(0, 200));
    console.log("width:", width, "height:", height);
    console.log("========================");

    // 统一处理 image 格式
    let imageString: string;

    if (typeof imageRaw === "string") {
      imageString = imageRaw;
    } else if (typeof imageRaw === "object" && imageRaw !== null) {
      const imgObj = imageRaw as Record<string, unknown>;
      if (typeof imgObj.url === "string") {
        imageString = imgObj.url;
      } else if (typeof imgObj.data === "string") {
        imageString = imgObj.data;
      } else if (typeof imgObj.base64 === "string") {
        imageString = imgObj.base64;
      } else {
        imageString = JSON.stringify(imageRaw);
      }
    } else {
      imageString = String(imageRaw);
    }

    // 严格校验
    if (!code) {
      return NextResponse.json(
        { success: false, message: "卡密不能为空" },
        { status: 400 }
      );
    }

    if (typeof imageString !== "string") {
      return NextResponse.json(
        { success: false, message: "图片格式错误：image 必须是 base64 字符串" },
        { status: 400 }
      );
    }

    if (imageString.length < 1000) {
      return NextResponse.json(
        { success: false, message: "图片数据不完整，请重新上传" },
        { status: 400 }
      );
    }

    if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
      return NextResponse.json(
        { success: false, message: "图片尺寸无效" },
        { status: 400 }
      );
    }

    // 验证卡密
    const validCodes = process.env.VALID_CODES || "";
    const codes = validCodes.split(",").map((c) => c.trim()).filter(Boolean);
    if (!codes.includes(code)) {
      return NextResponse.json(
        { success: false, message: "卡密无效" },
        { status: 401 }
      );
    }

    // 处理图片格式：保留 dataURL 格式（豆包可能需要完整 dataURL）
    // 或者去掉前缀
    const base64Image = imageString.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    console.log("传给豆包的 base64 长度:", base64Image.length);
    console.log("传给豆包的 base64 开头:", base64Image.substring(0, 50));

    // 计算输出尺寸
    const size = calculateSize(width, height);
    console.log("输出尺寸:", size);

    // 调用豆包 API
    const apiKey = process.env.DOUBAO_API_KEY;
    const model = process.env.DOUBAO_MODEL || "doubao-seedream-4-5-251128";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "API 配置错误，请联系卖家" },
        { status: 500 }
      );
    }

    const apiResponse = await fetch(
      "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          prompt: RESTORE_PROMPT,
          image: base64Image,
          image_size: `${size.width}x${size.height}`,
          watermark: false,
        }),
      }
    );

    const errorText = await apiResponse.text();
    console.log("豆包 API 响应状态:", apiResponse.status);
    console.log("豆包 API 响应内容:", errorText.slice(0, 500));

    if (!apiResponse.ok) {
      return NextResponse.json(
        { success: false, message: `AI 修复失败：${errorText.slice(0, 100)}` },
        { status: 500 }
      );
    }

    const result = JSON.parse(errorText);

    if (result.error) {
      console.error("豆包 API 返回错误:", result.error);
      return NextResponse.json(
        { success: false, message: `AI 返回错误：${JSON.stringify(result.error)}` },
        { status: 500 }
      );
    }

    const imageUrl = result.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, message: "AI 返回结果为空" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error("修复接口错误:", error);
    return NextResponse.json(
      { success: false, message: "修复失败，请稍后重试" },
      { status: 500 }
    );
  }
}
