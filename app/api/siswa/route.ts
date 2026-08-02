import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import * as siswaService from "@/lib/services/siswa.service";
import { siswaCreateSchema } from "@/lib/validations";
import { JWT_SECRET } from "@/lib/jwt";
import { logActivity } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jenjang = searchParams.get("jenjang") || undefined;
    const tingkat = searchParams.get("tingkat") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const excludeImportedMa = searchParams.get("excludeImportedMa") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await siswaService.getSiswaList({ jenjang, tingkat, status, search, excludeImportedMa, page, limit });
    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
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
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = siswaCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Validasi gagal" }, { status: 400 });
    }

    const created = await siswaService.createSiswa(parsed.data);

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/,\s*/)[0] : request.headers.get("x-real-ip") || "127.0.0.1";
    await logActivity(payload.id as string, "TAMBAH_SISWA", "Siswa", { nama: parsed.data.nama, nisn: parsed.data.nisn }, ip);

    return NextResponse.json({ success: true, data: created, message: "Siswa berhasil ditambahkan" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
