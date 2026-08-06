/* eslint-disable */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";
import { JWT_SECRET } from "@/lib/jwt";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    await query(
      `INSERT INTO pengumuman_dibaca (id, "pengumumanId", "userId", "readAt")
       SELECT gen_random_uuid(), p.id, $1, NOW()
       FROM pengumuman p
       WHERE p."isPublished" = true
         AND NOT EXISTS (
           SELECT 1 FROM pengumuman_dibaca pd
           WHERE pd."pengumumanId" = p.id AND pd."userId" = $1
         )
       ON CONFLICT ("pengumumanId", "userId") DO NOTHING`,
      [userId]
    );

    return NextResponse.json({ success: true, message: "Marked as read" });
  } catch (error: any) {
    console.error("Mark Read Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
