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

    return NextResponse.json({ success: true, data: { url: result.secure_url, foto: result.secure_url } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Gagal mengunggah file" }, { status: 500 });
  }
}
