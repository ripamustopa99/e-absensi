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
      return NextResponse.json({ success: false, data: { unreadCount: 0 } }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const role = payload.role as string;

    let unreadCount = 0;

    const dbRes = await query(`SELECT COUNT(*) FROM notifikasi WHERE "userId" = $1 AND "isDibaca" = false`, [userId]);
    unreadCount += parseInt(dbRes.rows[0]?.count || "0", 10);

    const today = new Date();
    const todayHari = today.getDay() === 0 ? 7 : today.getDay();
    const todayIso = today.toISOString().split("T")[0];

    if (role === "GURU") {
      const schedRes = await query(`
        SELECT j.id FROM jadwal_mengajar j WHERE j."guruId" = $1 AND j.hari = $2
      `, [userId, todayHari]);

      const absRes = await query(`
        SELECT "jadwalId" FROM absensi_guru
        WHERE "guruId" = $1 AND tanggal = $2 AND (status = 'HADIR' OR status = 'TELAT')
      `, [userId, todayIso]);

      const attendedIds = new Set(absRes.rows.map((r: any) => r.jadwalId));
      const unattended = schedRes.rows.filter((s: any) => !attendedIds.has(s.id));
      unreadCount += unattended.length;

      const annRes = await query(`
        SELECT COUNT(*) FROM pengumuman p
        WHERE p."isPublished" = true
          AND NOT EXISTS (
            SELECT 1 FROM pengumuman_dibaca pd 
            WHERE pd."pengumumanId" = p.id AND pd."userId" = $1
          )
      `, [userId]);
      unreadCount += parseInt(annRes.rows[0]?.count || "0", 10);

      const masukanRes = await query(`
        SELECT COUNT(*) FROM masukan 
        WHERE "userId" = $1 AND "tanggapanAdmin" IS NOT NULL
      `, [userId]);
      unreadCount += parseInt(masukanRes.rows[0]?.count || "0", 10);
    } else if (role === "ADMIN") {
      const masukanRes = await query(`SELECT COUNT(*) FROM masukan WHERE status = 'MENUNGGU'`);
      unreadCount += parseInt(masukanRes.rows[0]?.count || "0", 10);

      const allSchedRes = await query(`
        SELECT j.id FROM jadwal_mengajar j WHERE j.hari = $1
      `, [todayHari]);

      const allAbsRes = await query(`
        SELECT "jadwalId" FROM absensi_guru WHERE tanggal = $1 AND (status = 'HADIR' OR status = 'TELAT')
      `, [todayIso]);

      const attendedSet = new Set(allAbsRes.rows.map((r: any) => r.jadwalId));
      const missedCount = allSchedRes.rows.filter((s: any) => !attendedSet.has(s.id)).length;
      unreadCount += missedCount;
    }

    return NextResponse.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    console.error("Unread count error:", error);
    return NextResponse.json({ success: true, data: { unreadCount: 0 } });
  }
}
