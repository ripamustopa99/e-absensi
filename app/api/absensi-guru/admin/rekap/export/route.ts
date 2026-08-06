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
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const tahun = parseInt(searchParams.get("tahun") || String(now.getFullYear()), 10);
    const bulan = parseInt(searchParams.get("bulan") || String(now.getMonth() + 1), 10);

    const teachersRes = await query(`SELECT id, "kodeAkses" as nip, nama, jabatan FROM users WHERE role = 'GURU' AND "isAktif" = true ORDER BY nama ASC`);
    const allTeachers = teachersRes.rows;

    const startDate = new Date(tahun, bulan - 1, 1);
    const endDate = new Date(tahun, bulan, 0);

    const allSchedRes = await query(`SELECT id, "guruId", hari FROM jadwal_mengajar`);
    const allSchedules = allSchedRes.rows;

    const allAbsRes = await query(`
      SELECT ag.id, ag."jadwalId", ag."guruId", ag.tanggal, ag.status, ag."waktuAbsen"
      FROM absensi_guru ag
      WHERE EXTRACT(YEAR FROM ag.tanggal) = $1
        AND EXTRACT(MONTH FROM ag.tanggal) = $2
    `, [tahun, bulan]);
    const allAbsensi = allAbsRes.rows;

    let csv = "NIP,Nama Guru,Jabatan,Total Jadwal,Hadir,Tidak Hadir,Persentase Kehadiran\n";

    for (const t of allTeachers as any[]) {
      let expected = 0;
      let hadir = 0;

      const tSchedules = allSchedules.filter((s: any) => s.guruId === t.id);
      const curr = new Date(startDate);
      while (curr <= endDate) {
        const jsDay = curr.getDay();
        const dbDay = jsDay === 0 ? 7 : jsDay;
        const dateStr = curr.toISOString().split('T')[0];

        const daySchedules = tSchedules.filter((s: any) => s.hari === dbDay);
        for (const sched of daySchedules as any[]) {
          expected++;
          const foundAbs = allAbsensi.find((a: any) => a.jadwalId === sched.id && new Date(a.tanggal).toISOString().split('T')[0] === dateStr);
          if (foundAbs && (foundAbs.status === 'HADIR' || foundAbs.status === 'TELAT')) {
            hadir++;
          }
        }
        curr.setDate(curr.getDate() + 1);
      }

      const tidakHadir = Math.max(0, expected - hadir);
      const persentase = expected > 0 ? Math.round((hadir / expected) * 100) : 100;

      csv += `"${t.nip || '-'}","${t.nama}","${t.jabatan || '-'}",${expected},${hadir},${tidakHadir},"${persentase}%"\n`;
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Rekap_Kehadiran_Guru_${bulan}_${tahun}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export Admin Rekap Guru Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
