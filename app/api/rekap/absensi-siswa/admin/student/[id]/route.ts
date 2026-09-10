/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { JWT_SECRET } from "@/lib/jwt";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    const resolvedParams = await Promise.resolve(params);
    const studentId = resolvedParams.id;

    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get("bulan");
    const tahun = searchParams.get("tahun");

    // Get student info
    const studentRes = await query(
      `SELECT id, nama, nisn, jenjang::text, tingkat FROM siswa WHERE id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Siswa tidak ditemukan" }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Get attendance records
    let attQuery = `
      SELECT a.id, a.tanggal, a.status, a.alasan,
             j."jamMulai", j."jamSelesai",
             m.nama as "mapelNama"
      FROM absensi_siswa a
      JOIN jadwal_mengajar j ON a."jadwalId" = j.id
      JOIN mapel m ON j."mapelId" = m.id
      WHERE a."siswaId" = $1
    `;
    const attParams: any[] = [studentId];

    if (bulan && tahun) {
      attParams.push(tahun, bulan);
      attQuery += ` AND EXTRACT(YEAR FROM a.tanggal) = $${attParams.length - 1} AND EXTRACT(MONTH FROM a.tanggal) = $${attParams.length}`;
    }

    attQuery += ` ORDER BY a.tanggal DESC`;

    const attRes = await query(attQuery, attParams);
    const records = attRes.rows.map((r: any) => ({
      id: r.id,
      tanggal: r.tanggal,
      status: r.status,
      alasan: r.alasan,
      jadwal: {
        jamMulai: r.jamMulai,
        jamSelesai: r.jamSelesai,
        mapel: { nama: r.mapelNama },
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        siswa: {
          id: student.id,
          nama: student.nama,
          nisn: student.nisn,
          jenjang: student.jenjang,
          tingkat: student.tingkat,
        },
        records,
      },
    });
  } catch (error: any) {
    console.error("Admin Student Attendance Detail Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
