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
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;
    const role = payload.role as string;

    const notifications: any[] = [];

    const dbRes = await query(`
      SELECT id, judul, pesan, "isDibaca", "createdAt"
      FROM notifikasi
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 20
    `, [userId]);

    for (const r of dbRes.rows) {
      notifications.push({
        id: r.id,
        judul: r.judul,
        isi: r.pesan,
        isDibaca: r.isDibaca,
        createdAt: r.createdAt,
        type: "db",
      });
    }

    const today = new Date();
    const todayHari = today.getDay() === 0 ? 7 : today.getDay();
    const todayIso = today.toISOString().split("T")[0];

    if (role === "GURU") {
      const schedRes = await query(`
        SELECT j.id, j."jamMulai", j."jamSelesai", m.nama as mapel
        FROM jadwal_mengajar j
        JOIN mapel m ON j."mapelId" = m.id
        WHERE j."guruId" = $1 AND j.hari = $2
      `, [userId, todayHari]);

      const absRes = await query(`
        SELECT "jadwalId" FROM absensi_guru
        WHERE "guruId" = $1 AND tanggal = $2 AND (status = 'HADIR' OR status = 'TELAT')
      `, [userId, todayIso]);

      const attendedIds = new Set(absRes.rows.map((r: any) => r.jadwalId));
      const unattended = schedRes.rows.filter((s: any) => !attendedIds.has(s.id));

      for (const s of unattended as any[]) {
        notifications.push({
          id: `unattended-${s.id}`,
          judul: `Belum Absen: ${s.mapel}`,
          isi: `Jadwal mengajar pukul ${s.jamMulai} - ${s.jamSelesai} WIB belum dilakukan absensinya.`,
          isDibaca: false,
          createdAt: new Date(),
          type: "unattended",
        });
      }

      const annRes = await query(`
        SELECT p.id, p.judul, p.isi, p."tanggalPublish"
        FROM pengumuman p
        WHERE p."isPublished" = true
          AND NOT EXISTS (
            SELECT 1 FROM pengumuman_dibaca pd 
            WHERE pd."pengumumanId" = p.id AND pd."userId" = $1
          )
        ORDER BY p."tanggalPublish" DESC
        LIMIT 5
      `, [userId]);

      for (const a of annRes.rows) {
        notifications.push({
          id: `ann-${a.id}`,
          judul: `Pengumuman: ${a.judul}`,
          isi: a.isi,
          isDibaca: false,
          createdAt: a.tanggalPublish,
          type: "announcement",
        });
      }

      const masukanRes = await query(`
        SELECT id, subjek, pesan, "tanggapanAdmin", status, "createdAt"
        FROM masukan
        WHERE "userId" = $1 AND "tanggapanAdmin" IS NOT NULL
        ORDER BY "createdAt" DESC
        LIMIT 5
      `, [userId]);

      for (const m of masukanRes.rows) {
        notifications.push({
          id: `masukan-${m.id}`,
          judul: `Pusat Bantuan Ditanggapi: ${m.subjek}`,
          isi: `Tanggapan Admin: ${m.tanggapanAdmin}`,
          isDibaca: false,
          createdAt: m.createdAt,
          type: "bantuan",
        });
      }
    } else if (role === "ADMIN") {
      const masukanRes = await query(`
        SELECT m.id, m.subjek, m.pesan, m."createdAt", u.nama as user_nama
        FROM masukan m
        JOIN users u ON m."userId" = u.id
        WHERE m.status = 'MENUNGGU'
        ORDER BY m."createdAt" DESC
        LIMIT 10
      `);

      for (const m of masukanRes.rows) {
        notifications.push({
          id: `admin-masukan-${m.id}`,
          judul: `Laporan Baru dari ${m.user_nama}`,
          isi: `${m.subjek}: ${m.pesan}`,
          isDibaca: false,
          createdAt: m.createdAt,
          type: "bantuan",
        });
      }

      const allSchedRes = await query(`
        SELECT j.id, j."jamMulai", j."jamSelesai", m.nama as mapel, u.nama as guru_nama
        FROM jadwal_mengajar j
        JOIN mapel m ON j."mapelId" = m.id
        JOIN users u ON j."guruId" = u.id
        WHERE j.hari = $1
      `, [todayHari]);

      const allAbsRes = await query(`
        SELECT "jadwalId" FROM absensi_guru WHERE tanggal = $1 AND (status = 'HADIR' OR status = 'TELAT')
      `, [todayIso]);

      const attendedSet = new Set(allAbsRes.rows.map((r: any) => r.jadwalId));
      const missedSchedules = allSchedRes.rows.filter((s: any) => !attendedSet.has(s.id));

      for (const s of missedSchedules as any[]) {
        notifications.push({
          id: `missed-${s.id}`,
          judul: `Absensi Terlewat: ${s.guru_nama}`,
          isi: `Guru ${s.guru_nama} belum absen untuk mapel ${s.mapel} (${s.jamMulai} - ${s.jamSelesai}).`,
          isDibaca: false,
          createdAt: new Date(),
          type: "missed",
        });
      }
    }

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
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
    const userId = payload.id as string;

    await query(`UPDATE notifikasi SET "isDibaca" = true WHERE "userId" = $1`, [userId]);

    return NextResponse.json({ success: true, message: "Notifikasi ditandai dibaca" });
  } catch (error: any) {
    console.error("Mark read notifications error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
