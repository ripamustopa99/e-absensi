/* eslint-disable */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { loginSchema } from "@/lib/validations";
import { JWT_SECRET } from "@/lib/jwt";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";

    // IP-based Rate Limiting: max 10 requests per minute
    const limiter = rateLimit(`login_${clientIp}`, 10, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { success: false, message: `Terlalu banyak percobaan login dari IP Anda. Silakan coba lagi dalam ${limiter.resetInSeconds} detik.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Data login tidak valid" },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;

    const result = await query(
      `SELECT * FROM users WHERE "kodeAkses" = $1 OR "kodeUnik" = $1 LIMIT 1`,
      [identifier]
    );

    const user = result.rows[0];

    if (!user || !user.isAktif) {
      return NextResponse.json(
        { success: false, message: "Kode unik atau password salah" },
        { status: 400 }
      );
    }

    // Check account lockout (locked for 15 minutes if lockUntil is in the future)
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { success: false, message: `Akun Anda telah dikunci sementara karena 5 kali salah memasukkan password. Silakan coba lagi dalam ${remainingMinutes} menit atau hubungi Admin.` },
        { status: 429 }
      );
    }

    // If lockUntil has expired, auto-reset failed login attempts
    if (user.lockUntil && new Date(user.lockUntil) <= new Date()) {
      await query(
        `UPDATE users SET "failedLoginAttempts" = 0, "lockUntil" = NULL WHERE id = $1`,
        [user.id]
      );
      user.failedLoginAttempts = 0;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockQuery = `UPDATE users SET "failedLoginAttempts" = $1 WHERE id = $2`;
      const lockParams: any[] = [newAttempts, user.id];

      if (newAttempts >= 5) {
        // Lock for 15 minutes instead of permanent lock
        lockQuery = `UPDATE users SET "failedLoginAttempts" = $1, "lockUntil" = NOW() + INTERVAL '15 minutes' WHERE id = $2`;
      }
      await query(lockQuery, lockParams);

      const remaining = Math.max(0, 5 - newAttempts);
      const msg = newAttempts >= 5 
        ? "Akun Anda telah dikunci sementara selama 15 menit karena 5 kali salah memasukkan password." 
        : `Kode unik atau password salah. Tersisa ${remaining} kesempatan sebelum akun dikunci sementara.`;

      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    // Successful login: reset failed attempts & lockout
    await query(
      `UPDATE users SET "failedLoginAttempts" = 0, "lockUntil" = NULL WHERE id = $1`,
      [user.id]
    );

    // Log login activity with IP address and User-Agent
    try {
      await query(
        `INSERT INTO log_aktivitas (id, "userId", aksi, modul, detail, "ipAddress", "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
        [user.id, "LOGIN", "AUTENTIKASI", JSON.stringify({ success: true, userAgent }), clientIp]
      );
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    const token = await new SignJWT({ id: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("12h")
      .sign(JWT_SECRET);

    const refreshToken = await new SignJWT({ id: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          kodeAkses: user.kodeAkses,
          kodeUnik: user.kodeUnik,
          nama: user.nama,
          role: user.role,
          mustChangePass: user.mustChangePass,
        },
      },
    });

    response.cookies.set({
      name: "accessToken",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/",
    });

    response.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
