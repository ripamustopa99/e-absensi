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
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const role = payload.role as string;

    let jadwalRes;
    if (role === "ADMIN") {
      jadwalRes = await query(
        `SELECT j.*, row_to_json(m) as mapel, row_to_json(ta) as "tahunAjaran", row_to_json(g) as guru
         FROM jadwal_mengajar j
         LEFT JOIN mapel m ON j."mapelId" = m.id
         LEFT JOIN tahun_ajaran ta ON j."tahunAjaranId" = ta.id
         LEFT JOIN users g ON j."guruId" = g.id
         WHERE j.id = $1 LIMIT 1`,
        [id]
      );
    } else {
      jadwalRes = await query(
        `SELECT j.*, row_to_json(m) as mapel, row_to_json(ta) as "tahunAjaran", row_to_json(g) as guru
         FROM jadwal_mengajar j
         LEFT JOIN mapel m ON j."mapelId" = m.id
         LEFT JOIN tahun_ajaran ta ON j."tahunAjaranId" = ta.id
         LEFT JOIN users g ON j."guruId" = g.id
         WHERE j.id = $1 AND j."guruId" = $2 LIMIT 1`,
        [id, userId]
      );
    }

    const jadwal = jadwalRes.rows[0];
    if (!jadwal) {
      return NextResponse.json({ success: false, message: "Jadwal tidak ditemukan" }, { status: 404 });
    }

    const tingkatRes = await query(
      `SELECT tingkat FROM jadwal_tingkat WHERE "jadwalMengajarId" = $1`,
      [id]
    );
    const tingkatNames = tingkatRes.rows.map((t) => t.tingkat);

    let siswaRes;
    if (tingkatNames.length > 0) {
      siswaRes = await query(
        `SELECT id, nama, nisn, "jenisKelamin", tingkat FROM siswa WHERE status = 'AKTIF' AND jenjang = $1 AND tingkat = ANY($2::text[]) ORDER BY nama ASC`,
        [jadwal.jenjang, tingkatNames]
      );
    } else {
      siswaRes = { rows: [] };
    }

    return NextResponse.json({
      success: true,
      data: { ...jadwal, tingkatList: tingkatRes.rows, siswa: siswaRes.rows },
    });
  } catch (error: any) {
    console.error("Jadwal Detail API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
