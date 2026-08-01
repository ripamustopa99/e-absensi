"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  BookOpen,
  Users,
  CalendarCheck,
  Clock,
  CalendarDays,
  Megaphone,
  CheckSquare,
  PartyPopper,
  ArrowRight,
  Loader2,
  Eye,
} from "lucide-react";

type ScheduleItem = {
  id: string;
  hari: number;
  namaHari: string;
  jamMulai: string;
  jamSelesai: string;
  mapel: { id: string; nama: string };
  kelas: { id: string; namaKelas: string; jenjang: string };
};

type Pengumuman = {
  id: string;
  judul: string;
  isi: string;
  pinned: boolean;
  tanggalPublish: string;
  foto: string | null;
};

export default function GuruDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [holidayInfo, setHolidayInfo] = useState<any>(null);
  const [teacherAttendancePct, setTeacherAttendancePct] = useState<number>(100);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayHari = today.getDay() === 0 ? 7 : today.getDay();
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const todayDateStr = today.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          profileRes,
          jadwalRes,
          kalenderRes,
          pengumumanRes,
          tahunAjaranRes,
        ] = await Promise.all([
          api.get<{ data: any }>("/profile/me"),
          api.get<{ data: any[] }>("/jadwal"),
          api.get<{ data: { isHoliday: boolean; holiday: any } }>(
            `/kalender/check?tanggal=${todayIso}`,
          ),
          api.get<{ data: Pengumuman[] }>("/pengumuman?isPublished=true"),
          api.get<{ data: any[] }>("/tahun-ajaran"),
        ]);

        setProfile(profileRes.data.data);
        setHolidayInfo(
          kalenderRes.data.data.isHoliday
            ? kalenderRes.data.data.holiday
            : null,
        );
        setAnnouncements(
          (Array.isArray(pengumumanRes.data.data)
            ? pengumumanRes.data.data
            : []
          ).slice(0, 3),
        );

        const todaySchedules = jadwalRes.data.data
          .filter((j: any) => j.hari === todayHari)
          .sort(
            (a: any, b: any) =>
              timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai),
          );
        setSchedules(todaySchedules);

        // Fetch rekap guru properly using active tahun ajaran
        const tahunAjaranList = tahunAjaranRes.data.data;
        const aktifTahun =
          tahunAjaranList.find((t: any) => t.isAktif) || tahunAjaranList[0];

        if (aktifTahun) {
          // Ganjil: Jul - Dec (6-11), Genap: Jan - Jun (0-5)
          const currentMonth = today.getMonth();
          const semester = currentMonth >= 6 ? "GANJIL" : "GENAP";
          const currentMonthStr = String(currentMonth + 1).padStart(2, "0");

          try {
            const rekapGuruRes = await api.get<{
              data: { stats: { persentase: number } };
            }>(
              `/absensi-guru/rekap?tahunAjaranId=${aktifTahun.id}&semester=${semester}&bulan=${currentMonthStr}`,
            );
            setTeacherAttendancePct(
              rekapGuruRes.data.data?.stats?.persentase ?? 100,
            );
          } catch (e) {
            setTeacherAttendancePct(100);
          }
        }
      } catch (err) {
        console.error("Dashboard guru fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [todayHari, todayIso]);

  const totalStudentsToday = schedules.reduce((acc, s) => acc + 32, 0); // Approx students per class

  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 size={36} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ─── Header & Greeting ─── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)]">
            Selamat Datang, {profile?.nama || "Ustadz / Ustadzah"}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1 flex items-center gap-2">
            <CalendarDays size={14} className="text-primary" />
            {todayDateStr}
          </p>
        </div>
        <Link
          href="/guru/absensi"
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
          <CheckSquare size={16} /> Kelola Absensi Hari Ini
        </Link>
      </div>

      {/* ─── Holiday Banner (Tombol Mati jika libur) ─── */}
      {holidayInfo && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in duration-200">
          <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <PartyPopper size={24} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-amber-700 dark:text-amber-400">
              Hari Ini Libur / Kegiatan Sekolah: {holidayInfo.keterangan}
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1">
              Berdasarkan kalender akademik, seluruh sesi absensi mengajar untuk
              hari ini dinonaktifkan secara otomatis oleh sistem.
            </p>
          </div>
        </div>
      )}

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-[var(--text-secondary)]">
              Jadwal Hari Ini
            </span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <BookOpen size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">
            {schedules.length}{" "}
            <span className="text-[13px] font-medium text-[var(--text-tertiary)]">
              sesi mengajar
            </span>
          </p>
          <p className="text-[12px] font-semibold text-primary mt-2">
            {holidayInfo
              ? "Libur akademik"
              : schedules.length > 0
                ? "Jadwal aktif hari ini"
                : "Tidak ada jadwal"}
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-[var(--text-secondary)]">
              Kehadiran Mengajar Saya
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <CalendarCheck size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
            {teacherAttendancePct}%
          </p>
          <p className="text-[12px] font-semibold text-[var(--text-tertiary)] mt-2">
            Akumulasi bulan berjalan
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-[var(--text-secondary)]">
              Perkiraan Siswa Diajar
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Users size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-500">
            {totalStudentsToday}{" "}
            <span className="text-[13px] font-medium text-[var(--text-tertiary)]">
              siswa
            </span>
          </p>
          <p className="text-[12px] font-semibold text-[var(--text-tertiary)] mt-2">
            Total di kelas hari ini
          </p>
        </div>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Jadwal Mengajar Timeline */}
        <div className="xl:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              Timeline Mengajar Hari Ini
            </h2>
            <Link
              href="/guru/jadwal"
              className="text-[12px] font-bold text-primary hover:underline"
            >
              Lihat Jadwal Lengkap →
            </Link>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <p className="text-[13px]">
                Tidak ada jadwal mengajar pada hari ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((item) => {
                const startMins = timeToMinutes(item.jamMulai);
                const endMins = timeToMinutes(item.jamSelesai);
                const isActive =
                  !holidayInfo &&
                  nowMinutes >= startMins - 15 &&
                  nowMinutes <= endMins + 15;
                const isFinished = !holidayInfo && nowMinutes > endMins + 15;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      holidayInfo
                        ? "bg-[var(--surface-subtle)] border-[var(--border)] opacity-60"
                        : isActive
                          ? "bg-primary/5 border-primary/30 ring-1 ring-primary/10"
                          : "bg-[var(--surface-subtle)] border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs shrink-0">
                        <Clock size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--text-primary)]">
                          {item.mapel.nama} —{" "}
                          {item.kelas?.jenjang
                            ? `Kelas ${item.kelas.jenjang}`
                            : "Data Kelas Tidak Tersedia"}
                        </p>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                          Jam: {item.jamMulai} - {item.jamSelesai} WIB
                        </p>
                      </div>
                    </div>

                    <div>
                      {holidayInfo ? (
                        <span className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black rounded-lg">
                          LIBUR SEKOLAH
                        </span>
                      ) : isActive ? (
                        <Link
                          href={`/guru/absensi/${item.id}?tanggal=${todayIso}`}
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-[12px] font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
                        >
                          <CheckSquare size={14} /> ISI ABSEN
                        </Link>
                      ) : isFinished ? (
                        <Link
                          href={`/guru/absensi/${item.id}?tanggal=${todayIso}`}
                          className="px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={13} /> LIHAT ABSEN
                        </Link>
                      ) : (
                        <span className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-tertiary)] text-[11px] font-bold rounded-lg">
                          BELUM WAKTUNYA
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Pengumuman & Quick Actions */}
        <div className="space-y-6">
          {/* Pengumuman Widget */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Megaphone size={16} className="text-primary" /> Pengumuman
                Terbaru
              </h2>
              <Link
                href="/guru/pengumuman"
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Semua →
              </Link>
            </div>

            {announcements.length === 0 ? (
              <p className="text-center py-6 text-[12px] text-[var(--text-tertiary)]">
                Belum ada pengumuman.
              </p>
            ) : (
              <div className="space-y-3">
                {announcements.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] space-y-1"
                  >
                    <p className="text-[13px] font-bold text-[var(--text-primary)] line-clamp-1">
                      {p.judul}
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2">
                      {p.isi}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-3">
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] mb-2">
              Aksi Cepat
            </h2>
            <Link
              href="/guru/rekap/siswa"
              className="w-full flex items-center justify-between p-3.5 bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-[var(--text-primary)] transition-all group"
            >
              <span>Rekap Absensi Siswa</span>
              <ArrowRight
                size={16}
                className="text-[var(--text-tertiary)] group-hover:text-primary transition-colors"
              />
            </Link>
            <Link
              href="/guru/rekap/saya"
              className="w-full flex items-center justify-between p-3.5 bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-[var(--text-primary)] transition-all group"
            >
              <span>Kehadiran Mengajar Saya</span>
              <ArrowRight
                size={16}
                className="text-[var(--text-tertiary)] group-hover:text-primary transition-colors"
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
