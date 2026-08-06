/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { jadwalId, tanggal, status } = body;

    if (!jadwalId || !tanggal || !status) {
      return NextResponse.json({ success: false, message: "Data tidak lengkap" }, { status: 400 });
    }

    // Find guruId from jadwal_mengajar
    const jadwalRes = await query(`SELECT "guruId" FROM jadwal_mengajar WHERE id = $1`, [jadwalId]);
    if (jadwalRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Jadwal mengajar tidak ditemukan" }, { status: 404 });
    }
    const guruId = jadwalRes.rows[0].guruId;

    await query(`
      INSERT INTO absensi_guru (id, "jadwalId", "guruId", tanggal, status, "waktuAbsen", "createdAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, CASE WHEN $4 = 'HADIR' THEN NOW() ELSE NULL END, NOW())
      ON CONFLICT ("jadwalId", tanggal)
      DO UPDATE SET status = $4, "waktuAbsen" = CASE WHEN $4 = 'HADIR' THEN COALESCE(absensi_guru."waktuAbsen", NOW()) ELSE NULL END
    `, [jadwalId, guruId, tanggal, status]);

    return NextResponse.json({ success: true, message: "Absensi guru berhasil diperbarui" });
  } catch (error: any) {
    console.error("Admin Update Absensi Guru Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
