/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { ensureAbsensiSiswaTableExists, getCurrentAcademicContext } from "@/lib/academic-helper";

import { JWT_SECRET } from "@/lib/jwt";

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
    const role = payload.role as string;

    const { searchParams } = new URL(request.url);
    const tahunParam = searchParams.get("tahun");
    const bulanParam = searchParams.get("bulan");
    const tahunAjaranIdParam = searchParams.get("tahunAjaranId");
    const semesterParam = searchParams.get("semester");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 10;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT a."jadwalId", TO_CHAR(a.tanggal, 'YYYY-MM-DD') as tanggal, 
             j."jamMulai" as "waktuMulai", j."jamSelesai" as "waktuSelesai",
             m.nama as mapel,
             COALESCE(
               (SELECT string_agg(jt.tingkat, ', ') FROM jadwal_tingkat jt WHERE jt."jadwalMengajarId" = j.id),
               j.jenjang::text
             ) as kelas,
             COUNT(*) OVER() as full_count
      FROM absensi_siswa a
      JOIN jadwal_mengajar j ON a."jadwalId" = j.id
      JOIN mapel m ON j."mapelId" = m.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (tahunParam && bulanParam) {
      const tahun = parseInt(tahunParam, 10);
      const bulan = parseInt(bulanParam, 10);
      params.push(tahun);
      sql += ` AND EXTRACT(YEAR FROM a.tanggal) = $${params.length}`;
      params.push(bulan);
      sql += ` AND EXTRACT(MONTH FROM a.tanggal) = $${params.length}`;
    } else if (tahunAjaranIdParam && semesterParam) {
      const taRes = await query(`SELECT * FROM tahun_ajaran WHERE id = $1`, [tahunAjaranIdParam]);
      if (taRes.rows.length > 0) {
        const ta = taRes.rows[0];
        const sem = semesterParam.toUpperCase();
        const tanggalMulai = sem === "GANJIL" ? ta.tanggalMulaiGanjil : ta.tanggalMulaiGenap;
        const tanggalSelesai = sem === "GANJIL" ? ta.tanggalSelesaiGanjil : ta.tanggalSelesaiGenap;
        if (tanggalMulai && tanggalSelesai) {
          params.push(tanggalMulai);
          sql += ` AND a.tanggal >= $${params.length}`;
          params.push(tanggalSelesai);
          sql += ` AND a.tanggal <= $${params.length}`;
        }
      }
    } else {
      const context = await getCurrentAcademicContext();
      const taRes = await query(`SELECT * FROM tahun_ajaran WHERE id = $1`, [context.tahunAjaranId]);
      if (taRes.rows.length > 0) {
        const ta = taRes.rows[0];
        const tanggalMulai = context.semester === "GANJIL" ? ta.tanggalMulaiGanjil : ta.tanggalMulaiGenap;
        const tanggalSelesai = context.semester === "GANJIL" ? ta.tanggalSelesaiGanjil : ta.tanggalSelesaiGenap;
        if (tanggalMulai && tanggalSelesai) {
          params.push(tanggalMulai);
          sql += ` AND a.tanggal >= $${params.length}`;
          params.push(tanggalSelesai);
          sql += ` AND a.tanggal <= $${params.length}`;
        }
      }
    }

    if (role !== "ADMIN") {
      params.push(userId);
      sql += ` AND (j."guruId" = $${params.length} OR j."guruPenggantiId" = $${params.length})`;
    }

    sql += ` GROUP BY a."jadwalId", a.tanggal, j."jamMulai", j."jamSelesai", m.nama, j.id, j.jenjang
             ORDER BY a.tanggal DESC, j."jamMulai" DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    params.push(limit, offset);

    let sessionsRes = await query(sql, params);

    // Fallback if empty and no specific filters
    if (sessionsRes.rows.length === 0 && page === 1) {
      let fallbackSql = `
        SELECT a."jadwalId", TO_CHAR(a.tanggal, 'YYYY-MM-DD') as tanggal, 
               j."jamMulai" as "waktuMulai", j."jamSelesai" as "waktuSelesai",
               m.nama as mapel,
               COALESCE(
                 (SELECT string_agg(jt.tingkat, ', ') FROM jadwal_tingkat jt WHERE jt."jadwalMengajarId" = j.id),
                 j.jenjang::text
               ) as kelas,
               COUNT(*) OVER() as full_count
        FROM absensi_siswa a
        JOIN jadwal_mengajar j ON a."jadwalId" = j.id
        JOIN mapel m ON j."mapelId" = m.id
        WHERE 1=1
      `;
      const fallbackParams: any[] = [];
      if (role !== "ADMIN") {
        fallbackParams.push(userId);
        fallbackSql += ` AND (j."guruId" = $${fallbackParams.length} OR j."guruPenggantiId" = $${fallbackParams.length})`;
      }
      fallbackSql += ` GROUP BY a."jadwalId", a.tanggal, j."jamMulai", j."jamSelesai", m.nama, j.id, j.jenjang
                       ORDER BY a.tanggal DESC, j."jamSelesai" DESC
                       LIMIT $${fallbackParams.length + 1} OFFSET $${fallbackParams.length + 2}`;
      fallbackParams.push(limit, offset);
      sessionsRes = await query(fallbackSql, fallbackParams);
    }

    const total = sessionsRes.rows.length > 0 ? parseInt(sessionsRes.rows[0].full_count, 10) : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const sessions = [];
    for (const row of sessionsRes.rows) {
      const statsRes = await query(
        `SELECT status, COUNT(*) as count FROM absensi_siswa WHERE "jadwalId" = $1 AND tanggal = $2 GROUP BY status`,
        [row.jadwalId, row.tanggal]
      );
      
      const stats = { HADIR: 0, SAKIT: 0, IZIN: 0, ALPA: 0 };
      for (const s of statsRes.rows) {
        if (s.status in stats) {
          stats[s.status as keyof typeof stats] = parseInt(s.count, 10);
        }
      }

      const tanggalStr = row.tanggal;
      const isEditable = tanggalStr === todayStr;

      sessions.push({
        id: `${row.jadwalId}_${tanggalStr}`,
        jadwalId: row.jadwalId,
        tanggal: tanggalStr,
        waktuMulai: row.waktuMulai,
        waktuSelesai: row.waktuSelesai,
        mapel: row.mapel,
        kelas: row.kelas,
        isEditable,
        stats,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tahunAjaranId: tahunAjaranIdParam || "",
        semester: semesterParam || "",
        sessions,
        total,
        totalPages,
        page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Riwayat Absensi Siswa API Error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Server error",
      data: {
        tahunAjaranId: "",
        semester: "GANJIL",
        sessions: [],
        total: 0,
        totalPages: 1,
        page: 1,
        limit: 10,
      },
    }, { status: 500 });
  }
}
