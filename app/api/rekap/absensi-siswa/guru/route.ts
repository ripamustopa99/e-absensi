/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { ensureAbsensiSiswaTableExists } from "@/lib/academic-helper";

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
    const jenjang = searchParams.get("jenjang") || "MTS";
    const tingkat = searchParams.get("tingkat") || "VII";

    // If teacher, verify they are the homeroom teacher (wali kelas) for this jenjang & tingkat
    if (role !== "ADMIN") {
      const checkWali = await query(
        `SELECT 1 FROM guru_wali_tingkat WHERE "userId" = $1 AND jenjang = $2::"Jenjang" AND tingkat = $3 LIMIT 1`,
        [userId, jenjang, tingkat]
      );
      if (checkWali.rows.length === 0) {
        return NextResponse.json({ success: false, message: "Forbidden: Anda bukan wali kelas untuk tingkat ini" }, { status: 403 });
      }
    }

    const bulan = searchParams.get("bulan");
    const tahun = searchParams.get("tahun");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    let studentQuery = `SELECT id, nama, nisn FROM siswa WHERE jenjang = $1 AND tingkat = $2 AND status = 'AKTIF'`;
    const studentParams: any[] = [jenjang, tingkat];

    if (search) {
      studentParams.push(`%${search}%`);
      studentQuery += ` AND (nama ILIKE $${studentParams.length} OR nisn ILIKE $${studentParams.length})`;
    }

    const countRes = await query(`SELECT COUNT(*) as count FROM (${studentQuery}) as s`, studentParams);
    const totalItems = parseInt(countRes.rows[0]?.count || "0", 10);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    studentQuery += ` ORDER BY nama ASC LIMIT $${studentParams.length + 1} OFFSET $${studentParams.length + 2}`;
    studentParams.push(limit, offset);

    const studentsRes = await query(studentQuery, studentParams);
    const students = studentsRes.rows;

    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;

    const studentAttendanceList = [];

    for (const stu of students) {
      let attQuery = `
        SELECT a.status
        FROM absensi_siswa a
        JOIN jadwal_mengajar j ON a."jadwalId" = j.id
        WHERE a."siswaId" = $1 AND j.jenjang = $2
      `;
      const attParams: any[] = [stu.id, jenjang];

      if (bulan && tahun) {
        attParams.push(tahun, bulan);
        attQuery += ` AND EXTRACT(YEAR FROM a.tanggal) = $${attParams.length - 1} AND EXTRACT(MONTH FROM a.tanggal) = $${attParams.length}`;
      }

      const attRes = await query(attQuery, attParams);
      let sHadir = 0, sSakit = 0, sIzin = 0, sAlpa = 0;

      for (const r of attRes.rows) {
        if (r.status === "HADIR") sHadir++;
        else if (r.status === "SAKIT") sSakit++;
        else if (r.status === "IZIN") sIzin++;
        else if (r.status === "ALPA") sAlpa++;
      }

      totalHadir += sHadir;
      totalSakit += sSakit;
      totalIzin += sIzin;
      totalAlpa += sAlpa;

      const totalAbsensi = sHadir + sSakit + sIzin + sAlpa;
      const persentaseKehadiran = totalAbsensi > 0 ? Number(((sHadir / totalAbsensi) * 100).toFixed(1)) : 0;

      studentAttendanceList.push({
        id: stu.id,
        siswa: {
          id: stu.id,
          nama: stu.nama,
          nisn: stu.nisn,
        },
        totalHadir: sHadir,
        totalSakit: sSakit,
        totalIzin: sIzin,
        totalAlpa: sAlpa,
        totalAbsensi,
        persentaseKehadiran,
      });
    }

    const grandTotal = totalHadir + totalSakit + totalIzin + totalAlpa;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalHadir,
          totalSakit,
          totalIzin,
          totalAlpa,
          total: grandTotal,
        },
        students: studentAttendanceList,
        total: totalItems,
        totalPages,
        currentPage: page,
        tingkatInfo: { jenjang, tingkat },
      },
    });
  } catch (error: any) {
    console.error("Rekap Siswa Guru API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
