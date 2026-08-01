import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query(
      `SELECT p.*, json_build_object('nama', u.nama, 'foto', u.foto) as "dibuatOleh"
       FROM pengumuman p
       LEFT JOIN users u ON p."dibuatOlehId" = u.id
       WHERE p."isPublished" = true
       ORDER BY p."createdAt" DESC`
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}
