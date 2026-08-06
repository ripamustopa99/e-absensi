/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { JWT_SECRET } from "@/lib/jwt";
import { logActivity } from "@/lib/logger";

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
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat mempublikasikan pengumuman" }, { status: 403 });
    }

    await query(
      `UPDATE pengumuman
       SET "isPublished" = true,
           "tanggalPublish" = NOW()
       WHERE id = $1`,
      [id]
    );

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/,\s*/)[0] : request.headers.get("x-real-ip") || "127.0.0.1";
    await logActivity(payload.id as string, "PUBLISH_PENGUMUMAN", "Pengumuman", { id }, ip);

    return NextResponse.json({ success: true, message: "Pengumuman berhasil dipublikasikan" });
  } catch (error: any) {
    console.error("Publish Pengumuman Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
