/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM faq ORDER BY urutan ASC, "createdAt" DESC`
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("GET FAQ Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat mengelola FAQ" }, { status: 403 });
    }

    const body = await request.json();
    const { pertanyaan, jawaban, urutan } = body;

    if (!pertanyaan || !jawaban) {
      return NextResponse.json({ success: false, message: "Pertanyaan dan jawaban wajib diisi" }, { status: 400 });
    }

    await query(
      `INSERT INTO faq (id, pertanyaan, jawaban, urutan, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
      [pertanyaan, jawaban, urutan !== undefined ? Number(urutan) : 0]
    );

    return NextResponse.json({ success: true, message: "FAQ berhasil ditambahkan" });
  } catch (error: any) {
    console.error("POST FAQ Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
