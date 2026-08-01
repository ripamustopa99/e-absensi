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
    const userId = payload.id as string;

    const body = await request.json();
    const { nama, noTelp, tempatLahir, tanggalLahir, jenisKelamin, jabatan } = body;

    if (!nama) {
      return NextResponse.json({ success: false, message: "Nama lengkap wajib diisi" }, { status: 400 });
    }

    await query(
      `UPDATE users
       SET nama = COALESCE($1, nama),
           "noTelp" = $2,
           "tempatLahir" = $3,
           "tanggalLahir" = $4,
           "jenisKelamin" = $5,
           jabatan = COALESCE($6, jabatan),
           "updatedAt" = NOW()
       WHERE id = $7`,
      [
        nama,
        noTelp || null,
        tempatLahir || null,
        tanggalLahir ? new Date(tanggalLahir) : null,
        jenisKelamin || null,
        jabatan || null,
        userId,
      ]
    );

    const result = await query(
      `SELECT id, "kodeAkses", "kodeUnik", nama, role, "jenisKelamin", "tempatLahir", "tanggalLahir", "noTelp", foto, jabatan, "isAktif", "mustChangePass", "createdAt" FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];

    return NextResponse.json({ success: true, message: "Profil berhasil diperbarui", data: user });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
