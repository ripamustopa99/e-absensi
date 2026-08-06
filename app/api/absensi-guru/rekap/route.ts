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

    const { searchParams } = new URL(request.url);
    const tahunAjaranId = searchParams.get("tahunAjaranId");
    const semester = searchParams.get("semester") || "GANJIL";
    const bulan = searchParams.get("bulan") || "Semua";
    const status = searchParams.get("status") || "Semua";
    const jenjang = searchParams.get("jenjang") || "Semua";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 10;
    const offset = (page - 1) * limit;

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

    if (!tanggalMulai || !tanggalSelesai) {
      const taRes = await query(`SELECT * FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
      if (taRes.rows.length > 0) {
        const ta = taRes.rows[0];
        const sem = semester.toUpperCase();
        tanggalMulai = sem === "GANJIL" ? ta.tanggalMulaiGanjil : ta.tanggalMulaiGenap;
        tanggalSelesai = sem === "GANJIL" ? ta.tanggalSelesaiGanjil : ta.tanggalSelesaiGenap;
      }
    }

    if (!tanggalMulai || !tanggalSelesai) {
      const now = new Date();
      const year = now.getFullYear();
      tanggalMulai = `${year}-01-01`;
      tanggalSelesai = `${year}-12-31`;
    }

    let sql = `
      WITH scheduled_sessions AS (
        SELECT 
          j.id as "jadwalId",
          TO_CHAR(d.date::date, 'YYYY-MM-DD') as tanggal,
          COALESCE(
            ag.status::text,
            CASE WHEN d.date::date < CURRENT_DATE THEN 'ALPA' ELSE 'BELUM_ABSEN' END
          ) as status,
          ag."waktuAbsen",
          j.hari,
          CASE j.hari 
            WHEN 1 THEN 'Senin'
            WHEN 2 THEN 'Selasa'
            WHEN 3 THEN 'Rabu'
            WHEN 4 THEN 'Kamis'
            WHEN 5 THEN 'Jumat'
            WHEN 6 THEN 'Sabtu'
            WHEN 7 THEN 'Minggu'
            ELSE 'Senin'
          END as "namaHari",
          j."jamMulai",
          j."jamSelesai",
          m.nama as mapel,
          COALESCE(
            (SELECT string_agg(jt.tingkat, ', ') FROM jadwal_tingkat jt WHERE jt."jadwalMengajarId" = j.id),
            j.jenjang::text
          ) as kelas,
          j.jenjang::text as jenjang
        FROM jadwal_mengajar j
        CROSS JOIN LATERAL generate_series($2::date, $3::date, '1 day'::interval) d(date)
        JOIN mapel m ON j."mapelId" = m.id
        LEFT JOIN absensi_guru ag ON ag."jadwalId" = j.id AND ag.tanggal = d.date::date
        WHERE (j."guruId" = $1 OR j."guruPenggantiId" = $1)
          AND EXTRACT(ISODOW FROM d.date::date) = j.hari
          AND NOT EXISTS (
            SELECT 1 FROM kalender_akademik ka 
            WHERE ka.tanggal = d.date::date AND ka.jenis = 'LIBUR_NASIONAL'
          )
      )
      SELECT *, COUNT(*) OVER() as full_count
      FROM scheduled_sessions
      WHERE 1=1
    `;

    const params: any[] = [userId, tanggalMulai, tanggalSelesai];

    if (bulan !== "Semua") {
      params.push(parseInt(bulan, 10));
      sql += ` AND EXTRACT(MONTH FROM tanggal::date) = $${params.length}`;
    }

    if (status !== "Semua") {
      if (status === "HADIR") {
        sql += ` AND status = 'HADIR'`;
      } else if (status === "TIDAK_HADIR") {
        sql += ` AND status != 'HADIR'`;
      } else {
        params.push(status);
        sql += ` AND status = $${params.length}`;
      }
    }

    if (jenjang !== "Semua") {
      params.push(jenjang);
      sql += ` AND jenjang = $${params.length}`;
    }

    sql += ` ORDER BY tanggal DESC, "jamMulai" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const totalItems = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const statsSql = `
      WITH scheduled_sessions AS (
        SELECT 
          COALESCE(
            ag.status::text,
            CASE WHEN d.date::date < CURRENT_DATE THEN 'ALPA' ELSE 'BELUM_ABSEN' END
          ) as status
        FROM jadwal_mengajar j
        CROSS JOIN LATERAL generate_series($2::date, $3::date, '1 day'::interval) d(date)
        LEFT JOIN absensi_guru ag ON ag."jadwalId" = j.id AND ag.tanggal = d.date::date
        WHERE (j."guruId" = $1 OR j."guruPenggantiId" = $1)
          AND EXTRACT(ISODOW FROM d.date::date) = j.hari
          AND NOT EXISTS (
            SELECT 1 FROM kalender_akademik ka 
            WHERE ka.tanggal = d.date::date AND ka.jenis = 'LIBUR_NASIONAL'
          )
      )
      SELECT 
        COUNT(*) as total_expected,
        SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END) as total_hadir,
        SUM(CASE WHEN status != 'HADIR' THEN 1 ELSE 0 END) as total_tidak_hadir
      FROM scheduled_sessions
    `;
    const statsRes = await query(statsSql, [userId, tanggalMulai, tanggalSelesai]);
    const rowStats = statsRes.rows[0] || {};
    const totalExpected = parseInt(rowStats.total_expected || 0, 10);
    const totalHadir = parseInt(rowStats.total_hadir || 0, 10);
    const totalTidakHadir = parseInt(rowStats.total_tidak_hadir || 0, 10);
    const persentase = totalExpected > 0 ? Math.round((totalHadir / totalExpected) * 100) : 100;

    const details = result.rows.map((r: any) => ({
      tanggal: r.tanggal,
      jadwalId: r.jadwalId,
      hari: r.hari,
      namaHari: r.namaHari,
      jamMulai: r.jamMulai,
      jamSelesai: r.jamSelesai,
      mapel: r.mapel,
      kelas: r.kelas,
      jenjang: r.jenjang,
      status: r.status,
      waktuAbsen: r.waktuAbsen,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tahunAjaranId: tahunAjaranId || "",
        semester,
        stats: {
          totalExpected,
          totalHadir,
          totalTidakHadir,
          persentase,
        },
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
        details,
      },
    });
  } catch (error: any) {
    console.error("Absensi Guru Rekap API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
