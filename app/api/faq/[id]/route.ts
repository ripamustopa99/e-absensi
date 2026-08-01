import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    await query(
      `UPDATE faq
       SET pertanyaan = COALESCE($1, pertanyaan),
           jawaban = COALESCE($2, jawaban),
           urutan = COALESCE($3, urutan),
           "updatedAt" = NOW()
       WHERE id = $4`,
      [pertanyaan || null, jawaban || null, urutan !== undefined ? Number(urutan) : null, id]
    );

    return NextResponse.json({ success: true, message: "FAQ berhasil diperbarui" });
  } catch (error: any) {
    console.error("PUT FAQ Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat mengelola FAQ" }, { status: 403 });
    }

    await query(`DELETE FROM faq WHERE id = $1`, [id]);

    return NextResponse.json({ success: true, message: "FAQ berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE FAQ Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
