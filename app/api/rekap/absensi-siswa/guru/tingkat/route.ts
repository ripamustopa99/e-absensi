/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const role = payload.role as string;

    let tingkatRows: { jenjang: string; tingkat: string }[] = [];

    if (role === "ADMIN") {
      const res = await query(`SELECT DISTINCT jenjang::text as jenjang, tingkat FROM siswa WHERE status = 'AKTIF' ORDER BY jenjang, tingkat`);
      tingkatRows = res.rows;
    } else {
      // Only show tingkat where the teacher is a homeroom teacher (wali kelas)
      const res = await query(`
        SELECT DISTINCT jenjang::text as jenjang, tingkat
        FROM guru_wali_tingkat
        WHERE "userId" = $1
        ORDER BY jenjang, tingkat
      `, [userId]);
      tingkatRows = res.rows;
    }

    return NextResponse.json({ success: true, data: tingkatRows });
  } catch (error: any) {
    console.error("Rekap Tingkat API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
