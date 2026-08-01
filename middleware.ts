import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("accessToken")?.value;

  // 1. Handle root path "/"
  if (pathname === "/") {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = (payload.role as string || "").toUpperCase();
      if (role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/guru", request.url));
      }
    } catch {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete("accessToken");
      res.cookies.delete("refreshToken");
      return res;
    }
  }

  // 2. Handle /login page: if already logged in, redirect to dashboard
  if (pathname.startsWith("/login")) {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = (payload.role as string || "").toUpperCase();
        const target = role === "ADMIN" ? "/admin" : "/guru";
        return NextResponse.redirect(new URL(target, request.url));
      } catch {
        // Invalid token, allow access to login and clear cookies
        const res = NextResponse.next();
        res.cookies.delete("accessToken");
        res.cookies.delete("refreshToken");
        return res;
      }
    }
    return NextResponse.next();
  }

  const isPublicApi = pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/public") || pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico");
  if (isPublicApi) {
    return NextResponse.next();
  }

  // 3. Protected routes check
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = (payload.role as string || "").toUpperCase();

    // Strict Role Path Protection
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/guru", request.url));
    }

    if (pathname.startsWith("/guru") && role !== "GURU" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, message: "Unauthorized - Invalid token" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("accessToken");
    res.cookies.delete("refreshToken");
    return res;
  }
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/guru/:path*", "/api/:path*"],
};
