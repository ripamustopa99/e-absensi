/* eslint-disable */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggalStr = searchParams.get("tanggal");

    if (!tanggalStr) {
      return NextResponse.json({ success: false, message: "Tanggal wajib diisi" }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM kalender_akademik WHERE tanggal = $1 LIMIT 1`,
      [tanggalStr]
    );

    const holiday = result.rows[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        isHoliday: !!holiday,
        holiday,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: { isHoliday: false, holiday: null } });
  }
}
