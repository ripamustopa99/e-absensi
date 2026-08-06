/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { JWT_SECRET } from "@/lib/jwt";
import { pengumumanUpdateSchema } from "@/lib/validations";
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
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat memperbarui pengumuman" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = pengumumanUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Validasi gagal" }, { status: 400 });
    }

    const { judul, isi, targetJenjang, pinned, foto, tahunAjaranId, isPublished } = parsed.data;

    await query(
      `UPDATE pengumuman
       SET judul = COALESCE($1, judul),
           isi = COALESCE($2, isi),
           "targetJenjang" = $3,
           pinned = COALESCE($4, pinned),
           foto = $5,
           "tahunAjaranId" = $6,
           "isPublished" = COALESCE($7, "isPublished")
       WHERE id = $8`,
      [
        judul || null,
        isi || null,
        targetJenjang !== undefined ? targetJenjang : null,
        pinned !== undefined ? pinned : null,
        foto !== undefined ? foto : null,
        tahunAjaranId !== undefined ? tahunAjaranId : null,
        isPublished !== undefined ? isPublished : null,
        id,
      ]
    );

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/,\s*/)[0] : request.headers.get("x-real-ip") || "127.0.0.1";
    await logActivity(payload.id as string, "UPDATE_PENGUMUMAN", "Pengumuman", { id, ...parsed.data }, ip);

    return NextResponse.json({ success: true, message: "Pengumuman berhasil diperbarui" });
  } catch (error: any) {
    console.error("PUT Pengumuman Error:", error);
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
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat menghapus pengumuman" }, { status: 403 });
    }

    await query(`DELETE FROM pengumuman WHERE id = $1`, [id]);

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/,\s*/)[0] : request.headers.get("x-real-ip") || "127.0.0.1";
    await logActivity(payload.id as string, "HAPUS_PENGUMUMAN", "Pengumuman", { id }, ip);

    return NextResponse.json({ success: true, message: "Pengumuman berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE Pengumuman Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
