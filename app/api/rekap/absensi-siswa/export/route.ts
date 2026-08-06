/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { ensureAbsensiSiswaTableExists } from "@/lib/academic-helper";

export async function GET(request: Request) {
  try {
    await ensureAbsensiSiswaTableExists();
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jenjang = searchParams.get("jenjang") || "MTS";
    const tingkat = searchParams.get("tingkat") || "VII";
    const bulan = searchParams.get("bulan");
    const tahun = searchParams.get("tahun");

    const studentQuery = `SELECT id, nama, nisn FROM siswa WHERE jenjang = $1 AND tingkat = $2 AND status = 'AKTIF' ORDER BY nama ASC`;
    const studentsRes = await query(studentQuery, [jenjang, tingkat]);
    const students = studentsRes.rows;

    let csvContent = "NISN,Nama Siswa,Hadir,Sakit,Izin,Alpa,Total Kehadiran,Persentase\n";

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

      const totalAbsensi = sHadir + sSakit + sIzin + sAlpa;
      const persentase = totalAbsensi > 0 ? ((sHadir / totalAbsensi) * 100).toFixed(1) + "%" : "0%";

      csvContent += `"${stu.nisn}","${stu.nama}",${sHadir},${sSakit},${sIzin},${sAlpa},${totalAbsensi},"${persentase}"\n`;
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rekap-absensi-${jenjang}-${tingkat}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export Rekap Siswa API Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
