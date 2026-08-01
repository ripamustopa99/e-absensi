import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logout berhasil" });
  response.cookies.set("accessToken", "", { maxAge: 0 });
  response.cookies.set("refreshToken", "", { maxAge: 0 });
  return response;
}
