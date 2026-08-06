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
    const role = payload.role as string;

    let result;
    if (role === "ADMIN") {
      result = await query(
        `SELECT m.*, json_build_object('nama', u.nama, 'role', u.role, 'nip', u."noTelp") as user
         FROM masukan m
         LEFT JOIN users u ON m."userId" = u.id
         ORDER BY m."createdAt" DESC`
      );
    } else {
      result = await query(
        `SELECT m.*, json_build_object('nama', u.nama, 'role', u.role, 'nip', u."noTelp") as user
         FROM masukan m
         LEFT JOIN users u ON m."userId" = u.id
         WHERE m."userId" = $1
         ORDER BY m."createdAt" DESC`,
        [userId]
      );
    }

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("GET Masukan Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();
    const { kategori, subjek, pesan } = body;

    if (!subjek || !pesan) {
      return NextResponse.json({ success: false, message: "Subjek dan pesan wajib diisi" }, { status: 400 });
    }

    await query(
      `INSERT INTO masukan (id, "userId", kategori, subjek, pesan, status, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'MENUNGGU', NOW())`,
      [userId, kategori || "SARAN", subjek, pesan]
    );

    return NextResponse.json({ success: true, message: "Masukan atau kendala berhasil dikirim" });
  } catch (error: any) {
    console.error("POST Masukan Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
