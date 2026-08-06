/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const tahun = parseInt(searchParams.get("tahun") || String(now.getFullYear()), 10);
    const bulan = parseInt(searchParams.get("bulan") || String(now.getMonth() + 1), 10);

    const schedRes = await query(`
      SELECT 
        j.id as "jadwalId",
        j.hari,
        j."jamMulai",
        j."jamSelesai",
        m.nama as mapel,
        j.jenjang::text as jenjang,
        COALESCE(
          (SELECT string_agg(jt.tingkat, ', ') FROM jadwal_tingkat jt WHERE jt."jadwalMengajarId" = j.id),
          j.jenjang::text
        ) as kelas
      FROM jadwal_mengajar j
      JOIN mapel m ON j."mapelId" = m.id
      WHERE j."guruId" = $1
    `, [teacherId]);

    const schedules = schedRes.rows;

    const absRes = await query(`
      SELECT ag."jadwalId", ag.tanggal, ag.status, ag."waktuAbsen"
      FROM absensi_guru ag
      WHERE ag."guruId" = $1
        AND EXTRACT(YEAR FROM ag.tanggal) = $2
        AND EXTRACT(MONTH FROM ag.tanggal) = $3
    `, [teacherId, tahun, bulan]);

    const absensiRecords = absRes.rows;

    const startDate = new Date(tahun, bulan - 1, 1);
    const endDate = new Date(tahun, bulan, 0);

    const details: any[] = [];
    let totalExpected = 0;
    let totalHadir = 0;
    let totalTidakHadir = 0;

    const curr = new Date(startDate);
    while (curr <= endDate) {
      const jsDay = curr.getDay();
      const dbDay = jsDay === 0 ? 7 : jsDay;
      const dateStr = curr.toISOString().split('T')[0];

      const daySchedules = schedules.filter((s: any) => s.hari === dbDay);
      for (const sched of daySchedules as any[]) {
        totalExpected++;
        const foundAbs = absensiRecords.find((a: any) => 
          a.jadwalId === sched.jadwalId && 
          new Date(a.tanggal).toISOString().split('T')[0] === dateStr
        );

        const isHadir = foundAbs && (foundAbs.status === 'HADIR' || foundAbs.status === 'TELAT');
        if (isHadir) {
          totalHadir++;
        }

        const namaHariMap: Record<number, string> = {
          1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis", 5: "Jumat", 6: "Sabtu", 7: "Minggu"
        };

        details.push({
          tanggal: dateStr,
          jadwalId: sched.jadwalId,
          hari: sched.hari,
          namaHari: namaHariMap[sched.hari] || "Senin",
          jamMulai: sched.jamMulai,
          jamSelesai: sched.jamSelesai,
          mapel: sched.mapel,
          kelas: sched.kelas,
          jenjang: sched.jenjang,
          status: isHadir ? "HADIR" : "TIDAK_HADIR",
          waktuAbsen: foundAbs?.waktuAbsen || null,
        });
      }
      curr.setDate(curr.getDate() + 1);
    }

    totalTidakHadir = Math.max(0, totalExpected - totalHadir);
    const persentase = totalExpected > 0 ? Math.round((totalHadir / totalExpected) * 100) : 100;

    details.sort((a: any, b: any) => {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.jamMulai.localeCompare(a.jamMulai);
    });

    return NextResponse.json({
      success: true,
      data: {
        tahun,
        bulan,
        stats: {
          totalExpected,
          totalHadir,
          totalTidakHadir,
          persentase,
        },
        details,
      },
    });
  } catch (error: any) {
    console.error("Admin Teacher Detail API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
