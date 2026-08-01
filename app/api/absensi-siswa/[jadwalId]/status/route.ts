import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { ensureAbsensiSiswaTableExists } from "@/lib/academic-helper";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jadwalId: string }> }
) {
  try {
    await ensureAbsensiSiswaTableExists();
    const { jadwalId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get("tanggal") || new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const result = await query(
      `SELECT "siswaId", status, alasan FROM absensi_siswa WHERE "jadwalId" = $1 AND tanggal = $2`,
      [jadwalId, tanggal]
    );

    const records = result.rows;
    const sudahAbsen = records.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        sudahAbsen,
        records,
      },
    });
  } catch (error: any) {
    console.error("Absensi Siswa Status API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
