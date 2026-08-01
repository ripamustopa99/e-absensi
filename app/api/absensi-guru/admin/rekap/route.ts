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
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let teacherSql = `SELECT id, "kodeAkses" as nip, nama, jabatan FROM users WHERE role = 'GURU' AND "isAktif" = true`;
    const teacherParams: any[] = [];
    if (search) {
      teacherParams.push(`%${search}%`);
      teacherSql += ` AND (nama ILIKE $1 OR "kodeAkses" ILIKE $1)`;
    }
    teacherSql += ` ORDER BY nama ASC`;

    const teachersRes = await query(teacherSql, teacherParams);
    const allTeachers = teachersRes.rows;

    const totalTeachersCount = allTeachers.length;
    const totalPages = Math.ceil(totalTeachersCount / limit) || 1;
    const paginatedTeachers = allTeachers.slice((page - 1) * limit, page * limit);

    const startDate = new Date(tahun, bulan - 1, 1);
    const endDate = new Date(tahun, bulan, 0);

    const allSchedRes = await query(`SELECT id, "guruId", hari, "tahunAjaranId" FROM jadwal_mengajar`);
    const allSchedules = allSchedRes.rows;

    const allAbsRes = await query(`
      SELECT ag.id, ag."jadwalId", ag."guruId", ag.tanggal, ag.status, ag."waktuAbsen",
             u.nama as guru_nama, u.jabatan as guru_jabatan
      FROM absensi_guru ag
      JOIN users u ON ag."guruId" = u.id
      WHERE EXTRACT(YEAR FROM ag.tanggal) = $1
        AND EXTRACT(MONTH FROM ag.tanggal) = $2
      ORDER BY ag.tanggal DESC, ag."waktuAbsen" DESC
    `, [tahun, bulan]);
    const allAbsensi = allAbsRes.rows;

    function getTeacherStats(teacherId: string) {
      let expected = 0;
      let hadir = 0;

      const tSchedules = allSchedules.filter((s: any) => s.guruId === teacherId);
      if (tSchedules.length === 0) {
        return { totalExpected: 0, totalHadir: 0, totalTidakHadir: 0, persentase: 100 };
      }

      let curr = new Date(startDate);
      while (curr <= endDate) {
        const jsDay = curr.getDay();
        const dbDay = jsDay === 0 ? 7 : jsDay;
        const dateStr = curr.toISOString().split('T')[0];

        const daySchedules = tSchedules.filter((s: any) => s.hari === dbDay);
        for (const sched of daySchedules as any[]) {
          expected++;
          const foundAbs = allAbsensi.find((a: any) => a.jadwalId === sched.id && a.tanggal.toISOString().split('T')[0] === dateStr);
          if (foundAbs && (foundAbs.status === 'HADIR' || foundAbs.status === 'TELAT')) {
            hadir++;
          }
        }
        curr.setDate(curr.getDate() + 1);
      }

      const tidakHadir = Math.max(0, expected - hadir);
      const persentase = expected > 0 ? Math.round((hadir / expected) * 100) : 100;
      return { totalExpected: expected, totalHadir: hadir, totalTidakHadir: tidakHadir, persentase };
    }

    const gurus = paginatedTeachers.map((t: any) => {
      const stats = getTeacherStats(t.id);
      return {
        id: t.id,
        nip: t.nip,
        nama: t.nama,
        jabatan: t.jabatan,
        ...stats,
      };
    });

    let allExpectedSum = 0;
    let allHadirSum = 0;
    let allTidakHadirSum = 0;
    let allPersentaseSum = 0;
    for (const t of allTeachers as any[]) {
      const st = getTeacherStats(t.id);
      allExpectedSum += st.totalExpected;
      allHadirSum += st.totalHadir;
      allTidakHadirSum += st.totalTidakHadir;
      allPersentaseSum += st.persentase;
    }
    const avgPersentase = allTeachers.length > 0 ? Math.round(allPersentaseSum / allTeachers.length) : 100;

    const summary = {
      totalGuru: allTeachers.length,
      totalExpected: allExpectedSum,
      totalHadir: allHadirSum,
      totalTidakHadir: allTidakHadirSum,
      avgPersentase,
    };

    const rekapHarian = allAbsensi.slice(0, 15).map((a: any) => ({
      guru: {
        nama: a.guru_nama,
        jabatan: a.guru_jabatan,
      },
      waktuAbsen: a.waktuAbsen,
      status: a.status,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tahun,
        bulan,
        summary,
        gurus,
        pagination: {
          page,
          limit,
          totalItems: totalTeachersCount,
          totalPages,
        },
        rekapHarian,
      },
    });
  } catch (error: any) {
    console.error("Admin Rekap Guru API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
