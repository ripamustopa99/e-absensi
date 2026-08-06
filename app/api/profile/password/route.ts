/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { passwordChangeSchema } from "@/lib/validations";

import { JWT_SECRET } from "@/lib/jwt";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Data password tidak valid" },
        { status: 400 }
      );
    }

    const { oldPassword, newPassword } = parsed.data;

    const userRes = await query(`SELECT password FROM users WHERE id = $1 LIMIT 1`, [userId]);
    const user = userRes.rows[0];
    if (!user) {
      return NextResponse.json({ success: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    const isOldValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldValid) {
      return NextResponse.json({ success: false, message: "Password lama salah" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      `UPDATE users SET password = $1, "mustChangePass" = false, "updatedAt" = NOW() WHERE id = $2`,
      [hashedPassword, userId]
    );

    return NextResponse.json({ success: true, message: "Password berhasil diperbarui" });
  } catch (error: any) {
    console.error("Password change error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
