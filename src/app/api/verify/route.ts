import { NextRequest, NextResponse } from "next/server";

// 卡密验证接口
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, message: "卡密不能为空" },
        { status: 400 }
      );
    }

    // 从环境变量获取有效卡密列表
    const validCodes = process.env.VALID_CODES || "";
    const codes = validCodes.split(",").map((c) => c.trim()).filter(Boolean);

    if (codes.includes(code)) {
      return NextResponse.json({ valid: true, message: "卡密有效" });
    } else {
      return NextResponse.json({ valid: false, message: "卡密无效" });
    }
  } catch {
    return NextResponse.json(
      { valid: false, message: "验证失败" },
      { status: 500 }
    );
  }
}
