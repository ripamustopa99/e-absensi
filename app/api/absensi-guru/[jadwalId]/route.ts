/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jadwalId: string }> }
) {
  try {
    const { jadwalId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();
    const { status, lokasi, catatan } = body;

    const now = new Date();
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const result = await query(
      `INSERT INTO absensi_guru (id, "jadwalId", "guruId", tanggal, "waktuAbsen", status, lokasi, catatan, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4, $5, $6, NOW())
       ON CONFLICT ("jadwalId", tanggal)
       DO UPDATE SET status = $4, "waktuAbsen" = NOW(), lokasi = $5, catatan = $6
       RETURNING *`,
      [jadwalId, userId, todayStr, status || "HADIR", lokasi || null, catatan || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0], message: "Absensi guru berhasil disimpan" });
  } catch (error: any) {
    console.error("Absensi Guru API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
