/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { ensureAbsensiSiswaTableExists } from "@/lib/academic-helper";

import { JWT_SECRET } from "@/lib/jwt";

const HARI_MAP: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export async function GET(request: Request) {
  try {
    await ensureAbsensiSiswaTableExists();
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const role = (payload.role as string || "").toUpperCase();

    const { searchParams } = new URL(request.url);
    const hariQuery = searchParams.get("hari");
    const hari = hariQuery ? parseInt(hariQuery, 10) : undefined;
    const tanggalQuery = searchParams.get("tanggal");

    const todayStr = tanggalQuery || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    let sql = `
      SELECT j.*, 
             row_to_json(m) as mapel,
             row_to_json(ta) as "tahunAjaran",
             row_to_json(g) as guru
      FROM jadwal_mengajar j
      LEFT JOIN mapel m ON j."mapelId" = m.id
      LEFT JOIN tahun_ajaran ta ON j."tahunAjaranId" = ta.id
      LEFT JOIN users g ON j."guruId" = g.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (role !== "ADMIN") {
      params.push(userId);
      conditions.push(`(j."guruId" = $${params.length} OR j."guruPenggantiId" = $${params.length})`);
    }

    if (hari !== undefined) {
      params.push(hari);
      conditions.push(`j.hari = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY j.hari ASC, j."jamMulai" ASC`;

    const result = await query(sql, params);

    const schedules = [];
    for (const row of result.rows) {
      let sudahAbsen = false;
      try {
        const absenRes = await query(
          `SELECT 1 FROM absensi_siswa WHERE "jadwalId" = $1 AND tanggal = $2 LIMIT 1`,
          [row.id, todayStr]
        );
        sudahAbsen = absenRes.rows.length > 0;
      } catch (e) {
        // ignore
      }

      let tingkatList: string[] = [];
      try {
        const tingkatRes = await query(
          `SELECT tingkat FROM jadwal_tingkat WHERE "jadwalMengajarId" = $1`,
          [row.id]
        );
        tingkatList = tingkatRes.rows.map((t: { tingkat: string }) => t.tingkat);
      } catch (e) {
        // ignore
      }

      schedules.push({
        ...row,
        namaHari: HARI_MAP[row.hari] || "Hari",
        tingkatList,
        statusAbsensi: {
          sudahAbsen,
          isBisaAbsen: true,
          isHoliday: false,
        }
      });
    }

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    console.error("Jadwal API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error", data: [] }, { status: 500 });
  }
}
