/* eslint-disable */
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") || formData.get("photo") || formData.get("logo");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: "File tidak ditemukan" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "sekolah_app_logos" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const url = result.secure_url;
    return NextResponse.json({ success: true, data: { url, foto: url } });
  } catch (err: any) {
    console.error("Upload Error:", err);
    const message = err?.message?.includes("Signature")
      ? "Gagal mengunggah ke Cloudinary (Signature tidak valid). Periksa konfigurasi CLOUDINARY_API_SECRET di .env"
      : (err?.message || "Koneksi tidak stabil atau gagal mengunggah file.");
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
