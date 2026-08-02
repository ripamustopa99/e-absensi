import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/jwt";
import { logActivity } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.id as string;
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(/,\s*/)[0] : request.headers.get("x-real-ip") || "127.0.0.1";
        await logActivity(userId, "LOGOUT", "Auth", { message: "Pengguna keluar sistem" }, ip);
      } catch {}
    }
  } catch {}

  const response = NextResponse.json({ success: true, message: "Logout berhasil" });
  response.cookies.set("accessToken", "", { maxAge: 0 });
  response.cookies.set("refreshToken", "", { maxAge: 0 });
  return response;
}
