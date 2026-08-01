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

    const { searchParams } = new URL(request.url);
    const tahunAjaranId = searchParams.get("tahunAjaranId");
    const semester = searchParams.get("semester") || "GANJIL";
    const bulan = searchParams.get("bulan") || "Semua";

    let tanggalMulai = "";
    let tanggalSelesai = "";

    if (tahunAjaranId) {
      const taRes = await query(`SELECT * FROM tahun_ajaran WHERE id = $1`, [tahunAjaranId]);
      if (taRes.rows.length > 0) {
        const ta = taRes.rows[0];
        const sem = semester.toUpperCase();
        tanggalMulai = sem === "GANJIL" ? ta.tanggalMulaiGanjil : ta.tanggalMulaiGenap;
        tanggalSelesai = sem === "GANJIL" ? ta.tanggalSelesaiGanjil : ta.tanggalSelesaiGenap;
      }
    }

    let sql = `
      SELECT 
        TO_CHAR(ag.tanggal, 'YYYY-MM-DD') as tanggal,
        ag.status,
        ag."waktuAbsen",
        j."jamMulai",
        j."jamSelesai",
        m.nama as mapel,
        COALESCE(
          (SELECT string_agg(jt.tingkat, ', ') FROM jadwal_tingkat jt WHERE jt."jadwalMengajarId" = j.id),
          j.jenjang::text
        ) as kelas,
        j.jenjang::text as jenjang
      FROM absensi_guru ag
      JOIN jadwal_mengajar j ON ag."jadwalId" = j.id
      JOIN mapel m ON j."mapelId" = m.id
      WHERE ag."guruId" = $1
    `;

    const params: any[] = [userId];

    if (tanggalMulai && tanggalSelesai) {
      params.push(tanggalMulai);
      sql += ` AND ag.tanggal >= $${params.length}`;
      params.push(tanggalSelesai);
      sql += ` AND ag.tanggal <= $${params.length}`;
    }

    if (bulan !== "Semua") {
      params.push(parseInt(bulan, 10));
      sql += ` AND EXTRACT(MONTH FROM ag.tanggal) = $${params.length}`;
    }

    sql += ` ORDER BY ag.tanggal DESC, j."jamMulai" DESC`;

    const result = await query(sql, params);

    let csv = "Tanggal,Jam,Mata Pelajaran,Kelas,Jenjang,Status,Waktu Absen\n";
    for (const r of result.rows) {
      csv += `"${r.tanggal}","${r.jamMulai} - ${r.jamSelesai}","${r.mapel}","${r.kelas}","${r.jenjang}","${r.status}","${r.waktuAbsen || '-'}"\n`;
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rekap-kehadiran-guru.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export Rekap Guru Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
