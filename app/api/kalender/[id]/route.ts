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
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat memperbarui kalender" }, { status: 403 });
    }

    const body = await request.json();
    const { tanggal, jenis, keterangan, tahunAjaranId } = body;

    await query(
      `UPDATE kalender_akademik
       SET tanggal = COALESCE($1, tanggal),
           jenis = COALESCE($2, jenis),
           keterangan = COALESCE($3, keterangan),
           "tahunAjaranId" = COALESCE($4, "tahunAjaranId")
       WHERE id = $5`,
      [
        tanggal || null,
        jenis || null,
        keterangan || null,
        tahunAjaranId !== undefined ? tahunAjaranId : null,
        id,
      ]
    );

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/,\s*/)[0] : request.headers.get("x-real-ip") || "127.0.0.1";
    await logActivity(payload.id as string, "UPDATE_KALENDER", "Kalender", { id, keterangan, tanggal, jenis }, ip);

    return NextResponse.json({ success: true, message: "Kegiatan kalender berhasil diperbarui" });
  } catch (error: any) {
    console.error("PUT Kalender Error:", error);
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
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat menghapus kalender" }, { status: 403 });
    }

    await query(`DELETE FROM kalender_akademik WHERE id = $1`, [id]);

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/,\s*/)[0] : request.headers.get("x-real-ip") || "127.0.0.1";
    await logActivity(payload.id as string, "HAPUS_KALENDER", "Kalender", { id }, ip);

    return NextResponse.json({ success: true, message: "Kegiatan kalender berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE Kalender Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
