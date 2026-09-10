/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { JWT_SECRET } from "@/lib/jwt";

export async function PUT(request: Request) {
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

    const body = await request.json();
    const { absensiId, status, alasan } = body;

    if (!absensiId || !status) {
      return NextResponse.json({ success: false, message: "Data tidak lengkap" }, { status: 400 });
    }

    await query(
      `UPDATE absensi_siswa SET status = $1, alasan = $2 WHERE id = $3`,
      [status, alasan || null, absensiId]
    );

    return NextResponse.json({
      success: true,
      message: "Absensi siswa berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("Admin Update Student Attendance Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
