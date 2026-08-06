/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function PUT(
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
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden: Hanya Admin yang dapat menanggapi masukan" }, { status: 403 });
    }

    const body = await request.json();
    const { status, tanggapanAdmin } = body;

    await query(
      `UPDATE masukan
       SET status = COALESCE($1, status), "tanggapanAdmin" = COALESCE($2, "tanggapanAdmin")
       WHERE id = $3`,
      [status || null, tanggapanAdmin || null, id]
    );

    return NextResponse.json({ success: true, message: "Tanggapan berhasil diperbarui" });
  } catch (error: any) {
    console.error("PUT Masukan Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    if (role !== "ADMIN") {
      // Check if user owns this masukan
      const check = await query(`SELECT "userId" FROM masukan WHERE id = $1 LIMIT 1`, [id]);
      if (check.rows.length === 0 || check.rows[0].userId !== userId) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
    }

    await query(`DELETE FROM masukan WHERE id = $1`, [id]);

    return NextResponse.json({ success: true, message: "Masukan berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE Masukan Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
