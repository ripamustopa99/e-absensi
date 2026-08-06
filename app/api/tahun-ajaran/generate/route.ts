/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function POST(request: Request) {
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

    // Get latest or active tahun ajaran
    const latestRes = await query(`SELECT * FROM tahun_ajaran ORDER BY label DESC LIMIT 1`);
    let nextStartYear = new Date().getFullYear();
    let nextEndYear = nextStartYear + 1;

    if (latestRes.rows.length > 0) {
      const latest = latestRes.rows.name || latestRes.rows[0];
      const label = latest.label; // e.g. "2025/2026"
      const parts = label.split("/");
      if (parts.length === 2) {
        const start = parseInt(parts[0], 10);
        if (!isNaN(start)) {
          nextStartYear = start + 1;
          nextEndYear = nextStartYear + 1;
        }
      }
    }

    const label = `${nextStartYear}/${nextEndYear}`;
    const tanggalMulaiGanjil = `${nextStartYear}-07-13`;
    const tanggalSelesaiGanjil = `${nextStartYear}-12-19`;
    const tanggalMulaiGenap = `${nextEndYear}-01-05`;
    const tanggalSelesaiGenap = `${nextEndYear}-06-20`;

    // Set all other tahun_ajaran to isAktif = false
    await query(`UPDATE tahun_ajaran SET "isAktif" = false`);

    // Insert new tahun ajaran as active
    const insertRes = await query(
      `INSERT INTO tahun_ajaran (id, label, "isAktif", "tanggalMulaiGanjil", "tanggalSelesaiGanjil", "tanggalMulaiGenap", "tanggalSelesaiGenap")
       VALUES (gen_random_uuid(), $1, true, $2, $3, $4, $5)
       RETURNING *`,
      [label, tanggalMulaiGanjil, tanggalSelesaiGanjil, tanggalMulaiGenap, tanggalSelesaiGenap]
    );

    // Also update CONFIG_AKADEMIK setting
    const newTa = insertRes.rows[0];
    await query(
      `INSERT INTO setting (id, key, value, "updatedAt") 
       VALUES (gen_random_uuid(), 'CONFIG_AKADEMIK', $1::jsonb, NOW()) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $1::jsonb, "updatedAt" = NOW()`,
      [
        JSON.stringify({
          tahunAjaranId: newTa.id,
          tanggalMulaiGanjil,
          tanggalSelesaiGanjil,
          tanggalMulaiGenap,
          tanggalSelesaiGenap,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Tahun ajaran ${label} berhasil digenerate dan diaktifkan`,
      data: newTa,
    });
  } catch (error: any) {
    console.error("Generate Tahun Ajaran Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
