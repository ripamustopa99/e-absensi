import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const res = await query(`SELECT * FROM setting WHERE key = $1`, [key]);
    return NextResponse.json({ success: true, data: res.rows[0] || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const valueJson = JSON.stringify(body.value);

    await query(
      `INSERT INTO setting (id, key, value, "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2::jsonb, NOW()) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $2::jsonb, "updatedAt" = NOW()`,
      [key, valueJson]
    );

    const res = await query(`SELECT * FROM setting WHERE key = $1`, [key]);
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
