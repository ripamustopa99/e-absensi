/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const modul = searchParams.get("modul") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const offset = (page - 1) * limit;

    let whereSql = `WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereSql += ` AND (u.nama ILIKE $${params.length} OR la.aksi ILIKE $${params.length} OR la.modul ILIKE $${params.length})`;
    }

    if (modul !== "ALL") {
      params.push(modul);
      whereSql += ` AND la.modul = $${params.length}`;
    }

    const countRes = await query(`
      SELECT COUNT(*) 
      FROM log_aktivitas la
      JOIN users u ON la."userId" = u.id
      ${whereSql}
    `, params);

    const total = parseInt(countRes.rows[0]?.count || "0", 10);
    const totalPages = Math.ceil(total / limit) || 1;

    const dataSql = `
      SELECT 
        la.id,
        la.aksi,
        la.modul,
        la.detail,
        la."ipAddress",
        la."createdAt",
        u.id as user_id,
        u.nama as user_nama,
        u.role as user_role,
        u."kodeAkses" as user_kode
      FROM log_aktivitas la
      JOIN users u ON la."userId" = u.id
      ${whereSql}
      ORDER BY la."createdAt" DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await query(dataSql, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error("Admin Log Aktivitas API Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
