/* eslint-disable */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

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

    let oldLogoUrl: string | null = null;
    if (key === "CONFIG_APP") {
      const oldRes = await query(`SELECT value FROM setting WHERE key = $1`, [key]);
      const oldVal = oldRes.rows[0]?.value;
      if (oldVal && typeof oldVal === "object" && "logoUrl" in oldVal) {
        oldLogoUrl = (oldVal as any).logoUrl;
      }
    }

    await query(
      `INSERT INTO setting (id, key, value, "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2::jsonb, NOW()) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $2::jsonb, "updatedAt" = NOW()`,
      [key, valueJson]
    );

    if (key === "CONFIG_APP" && oldLogoUrl) {
      const newLogoUrl = body.value?.logoUrl;
      if (newLogoUrl !== oldLogoUrl) {
        await deleteCloudinaryImage(oldLogoUrl);
      }
    }

    const res = await query(`SELECT * FROM setting WHERE key = $1`, [key]);
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
