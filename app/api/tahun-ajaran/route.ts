/* eslint-disable */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureDefaultTahunAjaran } from "@/lib/academic-helper";

export async function GET() {
  try {
    await ensureDefaultTahunAjaran();
    const result = await query(`SELECT * FROM tahun_ajaran ORDER BY label DESC`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
