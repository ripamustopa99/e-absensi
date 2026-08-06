/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const result = await query(
      `SELECT id, "kodeAkses", "kodeUnik", nama, role, "jenisKelamin", "tempatLahir", "tanggalLahir", "noTelp", foto, jabatan, "isAktif", "mustChangePass", "createdAt" FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
  }
}
