/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import cloudinary from "@/lib/cloudinary";
import { query } from "@/lib/db";

import { JWT_SECRET } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const formData = await request.formData();
    const file = formData.get("photo") || formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: "File foto tidak ditemukan" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "sekolah_app_profiles" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const fotoUrl = result.secure_url;

    // Update user foto in database
    await query(`UPDATE users SET foto = $1, "updatedAt" = NOW() WHERE id = $2`, [fotoUrl, userId]);

    return NextResponse.json({
      success: true,
      message: "Foto profil berhasil diperbarui",
      data: { foto: fotoUrl },
    });
  } catch (error: any) {
    console.error("Profile Photo Upload Error:", error);
    const message = error?.message || "Gagal mengunggah foto";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
