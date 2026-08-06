/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { ensureAbsensiSiswaTableExists } from "@/lib/academic-helper";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jadwalId: string }> }
) {
  try {
    await ensureAbsensiSiswaTableExists();
    const { jadwalId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { absensi, materiAjar } = body;

    if (!absensi || !Array.isArray(absensi)) {
      return NextResponse.json({ success: false, message: "Data absensi tidak valid" }, { status: 400 });
    }

    const now = new Date();
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    for (const item of absensi) {
      await query(
        `INSERT INTO absensi_siswa (id, "jadwalId", "siswaId", tanggal, status, alasan, "materiAjar", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT ("jadwalId", "siswaId", tanggal)
         DO UPDATE SET status = $4, alasan = $5, "materiAjar" = $6`,
        [jadwalId, item.siswaId, todayStr, item.status, item.alasan || null, materiAjar || null]
      );
    }

    return NextResponse.json({ success: true, message: "Absensi siswa berhasil disimpan" });
  } catch (error: any) {
    console.error("Absensi Siswa API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
