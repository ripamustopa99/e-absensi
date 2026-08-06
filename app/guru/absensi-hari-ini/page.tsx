/* eslint-disable */
"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Clock,
  CalendarDays,
  CheckCircle2,
  Timer,
  ArrowRight,
  Eye,
  Loader2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { AxiosError } from "axios";

// --- Types ---
type Mapel = { id: string; nama: string };
type Kelas = { id: string; namaKelas: string; jenjang: string };
type TahunAjaran = {
  id: string;
  label: string;
  semester: string;
  isAktif: boolean;
};

type ScheduleItem = {
  id: string;
  hari: number;
  namaHari: string;
  jamMulai: string;
  jamSelesai: string;
  mapel: Mapel;
  kelas: Kelas;
  tahunAjaran: TahunAjaran;
};

type AttendanceCardStatus =
  | "AKTIF"
  | "SUDAH_ABSEN"
  | "BELUM_WAKTUNYA"
  | "SELESAI";

type AttendanceCard = ScheduleItem & {
  cardStatus: AttendanceCardStatus;
  absenTime?: string;
  waitUntil?: string;
};

type RecentLog = {
  id: string;
  tanggal: string;
  mapel: string;
  kelas: string;
  jamMulai: string;
  jamSelesai: string;
  status: "HADIR" | "BELUM_ABSEN" | "IZIN" | "SAKIT";
  absenJam?: string;
};

type ApiResponse = { success: true; data: ScheduleItem[] };
type ApiError = { success: false; message: string };

// --- Mock data for recent attendance log ---
const MOCK_RECENT_LOG: RecentLog[] = [
  {
    id: "1",
    tanggal: "2026-07-19",
    mapel: "Fiqih",
    kelas: "8A",
    jamMulai: "08:00",
    jamSelesai: "09:00",
    status: "HADIR",
    absenJam: "07:58",
  },
  {
    id: "2",
    tanggal: "2026-07-19",
    mapel: "SKI",
    kelas: "8B",
    jamMulai: "09:15",
    jamSelesai: "10:15",
    status: "HADIR",
    absenJam: "09:14",
  },
  {
    id: "3",
    tanggal: "2026-07-18",
    mapel: "Fiqih",
    kelas: "9A",
    jamMulai: "10:30",
    jamSelesai: "11:30",
    status: "HADIR",
    absenJam: "10:28",
  },
  {
    id: "4",
    tanggal: "2026-07-18",
    mapel: "Akidah Akhlak",
    kelas: "7B",
    jamMulai: "13:00",
    jamSelesai: "14:00",
    status: "IZIN",
  },
  {
    id: "5",
    tanggal: "2026-07-17",
    mapel: "Fiqih",
    kelas: "8A",
    jamMulai: "08:00",
    jamSelesai: "09:00",
    status: "HADIR",
    absenJam: "07:55",
  },
  {
    id: "6",
    tanggal: "2026-07-17",
    mapel: "SKI",
    kelas: "9B",
    jamMulai: "09:15",
    jamSelesai: "10:15",
    status: "BELUM_ABSEN",
  },
  {
    id: "7",
    tanggal: "2026-07-16",
    mapel: "Fiqih",
    kelas: "9A",
    jamMulai: "10:30",
    jamSelesai: "11:30",
    status: "HADIR",
    absenJam: "10:30",
  },
];

const LOG_STATUS_MAP: Record<
  RecentLog["status"],
  { label: string; className: string }
> = {
  HADIR: { label: "Hadir", className: "text-primary bg-primary/10" },
  BELUM_ABSEN: {
    label: "Belum Absen",
    className: "text-rose-500 bg-rose-500/10",
  },
  IZIN: { label: "Izin", className: "text-blue-500 bg-blue-500/10" },
  SAKIT: { label: "Sakit", className: "text-amber-500 bg-amber-500/10" },
};

// --- Utilities ---
function getTodayHari(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function getTodayDateString(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getMinutesNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function _formatWaitTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")} menit`;
}

function deriveCardStatus(jadwal: ScheduleItem): AttendanceCard {
  const nowMinutes = getMinutesNow();
  const startMinutes = timeToMinutes(jadwal.jamMulai);
  const endMinutes = timeToMinutes(jadwal.jamSelesai);

  // Active window: 15 min before start until 15 min after end
  if (nowMinutes >= startMinutes - 15 && nowMinutes <= endMinutes + 15) {
    return { ...jadwal, cardStatus: "AKTIF" };
  }
  if (nowMinutes > endMinutes + 15) {
    // Mock: mark some as already attended for demo
    return { ...jadwal, cardStatus: "SELESAI" };
  }
  // Not yet time
  const _waitMinutes = startMinutes - 15 - nowMinutes;
  void _waitMinutes;
  void _formatWaitTime;
  return {
    ...jadwal,
    cardStatus: "BELUM_WAKTUNYA",
    waitUntil: jadwal.jamMulai,
  };
}

function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// --- Page Component ---
export default function AbsensiHariIniPage() {
  const pathname = usePathname();
  const [schedules, setSchedules] = useState<AttendanceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayHari = getTodayHari();
  const todayDateStr = getTodayDateString();
  const todayIso = getTodayIso();

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await api.get<ApiResponse>("/jadwal");
        const todaySchedules = res.data.data
          .filter((j) => j.hari === todayHari)
          .sort(
            (a, b) => timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai),
          );

        // Mock: Mark the second item as SUDAH_ABSEN for demo
        const cards: AttendanceCard[] = todaySchedules.map((j, idx) => {
          if (idx === 1) {
            return {
              ...j,
              cardStatus: "SUDAH_ABSEN" as const,
              absenTime: j.jamMulai.replace(
                /:\d{2}$/,
                `:${String(Math.max(0, parseInt(j.jamMulai.split(":")[1] ?? "0", 10) - 1)).padStart(2, "0")}`,
              ),
            };
          }
          return deriveCardStatus(j);
        });

        setSchedules(cards);
      } catch (err) {
        console.error("DEBUG: Failed to fetch schedules:", err);
        const error = err as AxiosError<ApiError>;
        toast.error(
          error.response?.data?.message ?? "Gagal memuat jadwal hari ini",
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, [todayHari, pathname]);

  const summaryData = useMemo(() => {
    const total = schedules.length;
    const sudah = schedules.filter(
      (s) => s.cardStatus === "SUDAH_ABSEN" || s.cardStatus === "SELESAI",
    ).length;
    const belum = total - sudah;
    return { total, sudah, belum };
  }, [schedules]);

  const _unattendedSchedules = schedules.filter((s) => s.cardStatus === "AKTIF");
  void _unattendedSchedules;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-40">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl shadow-sm">
        <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
          Absensi Hari Ini
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1 flex items-center gap-2">
          <CalendarDays size={15} className="text-primary" />
          {todayDateStr}
        </p>
      </div>

      {/* Schedule Cards */}
      {schedules.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-16 text-center">
          <CalendarDays
            size={36}
            className="text-[var(--text-tertiary)] mx-auto mb-3"
          />
          <p className="font-bold text-[var(--text-primary)]">
            Tidak ada jadwal hari ini
          </p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Anda tidak memiliki jam mengajar pada hari ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((card) => (
            <ScheduleCard key={card.id} card={card} todayIso={todayIso} />
          ))}
        </div>
      )}

      {/* Footer Summary */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-6 text-[13px] font-medium text-[var(--text-secondary)]">
          <span>
            Total Jadwal:{" "}
            <strong className="text-[var(--text-primary)]">
              {summaryData.total}
            </strong>
          </span>
          <span>
            Sudah: <strong className="text-primary">{summaryData.sudah}</strong>
          </span>
          <span>
            Belum:{" "}
            <strong className="text-amber-500">{summaryData.belum}</strong>
          </span>
        </div>
        <Link
          href="/guru/riwayat"
          className="inline-flex items-center gap-2 text-[13px] font-bold text-primary hover:underline"
        >
          Lihat Riwayat Absensi <ArrowRight size={14} />
        </Link>
      </div>

      {/* Recent Attendance Log Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)]">
          <h2 className="text-[14px] font-bold text-[var(--text-primary)]">
            Log Absensi Beberapa Hari Terakhir
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Tanggal
                </th>
                <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Mata Pelajaran
                </th>
                <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Kelas
                </th>
                <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Waktu
                </th>
                <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Absen Jam
                </th>
                <th className="text-right py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {MOCK_RECENT_LOG.map((log) => {
                const statusStyle = LOG_STATUS_MAP[log.status];
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--surface-subtle)]/50 transition-colors"
                  >
                    <td className="py-3.5 px-5 text-[13px] font-medium text-[var(--text-primary)]">
                      {new Date(log.tanggal + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-[13px] font-bold text-[var(--text-primary)]">
                      {log.mapel}
                    </td>
                    <td className="py-3.5 px-5 text-[13px] text-[var(--text-secondary)]">
                      {log.kelas}
                    </td>
                    <td className="py-3.5 px-5 text-[12px] text-[var(--text-secondary)]">
                      {log.jamMulai} - {log.jamSelesai}
                    </td>
                    <td className="py-3.5 px-5 text-[13px] text-[var(--text-primary)] font-medium">
                      {log.absenJam ?? "—"}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Schedule Card Sub-component ---
function ScheduleCard({
  card,
  todayIso,
}: {
  card: AttendanceCard;
  todayIso: string;
}) {
  const statusConfig: Record<
    AttendanceCardStatus,
    { label: string; className: string; textClass: string }
  > = {
    AKTIF: {
      label: "AKTIF",
      className: "bg-primary/10 border-primary/30 text-primary",
      textClass: "text-primary",
    },
    SUDAH_ABSEN: {
      label: "SUDAH ABSEN",
      className:
        "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
      textClass: "text-blue-600 dark:text-blue-400",
    },
    BELUM_WAKTUNYA: {
      label: "BELUM WAKTUNYA",
      className:
        "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--text-tertiary)]",
      textClass: "text-[var(--text-tertiary)]",
    },
    SELESAI: {
      label: "SELESAI",
      className:
        "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--text-tertiary)]",
      textClass: "text-[var(--text-tertiary)]",
    },
  };

  const cfg = statusConfig[card.cardStatus];
  const isActive = card.cardStatus === "AKTIF";

  return (
    <div
      className={`bg-[var(--surface)] border rounded-2xl p-5 shadow-sm transition-all ${isActive ? "border-primary/40 ring-1 ring-primary/10" : "border-[var(--border)]"}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--text-primary)]">
              <Clock size={14} className="text-primary" />
              {card.jamMulai} - {card.jamSelesai}
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wide ${cfg.className}`}
            >
              {cfg.label}
            </span>
          </div>

          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
            {card.mapel.nama}
          </h3>

          <div className="flex items-center gap-4 text-[12px] text-[var(--text-secondary)] font-medium">
            <span>Kelas: {card.kelas.namaKelas}</span>
            <span>Ruang: {card.kelas.namaKelas}</span>
          </div>

          {card.cardStatus === "SUDAH_ABSEN" && card.absenTime && (
            <p className="text-[12px] font-medium text-blue-500 flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={13} /> Absen jam: {card.absenTime}
            </p>
          )}
        </div>

        {/* Right action */}
        <div className="shrink-0 flex items-start">
          {card.cardStatus === "AKTIF" && (
            <Link
              href={`/guru/absensi/${card.id}?tanggal=${todayIso}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[13px] font-bold rounded-xl hover:bg-primary-hover transition-all shadow-sm"
            >
              <BookOpen size={16} />
              ABSEN SISWA SEKARANG
            </Link>
          )}
          {card.cardStatus === "SUDAH_ABSEN" && (
            <Link
              href={`/guru/absensi/${card.id}?tanggal=${todayIso}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] font-bold rounded-xl hover:bg-[var(--border-subtle)] transition-colors"
            >
              <Eye size={16} />
              LIHAT DETAIL
            </Link>
          )}
          {card.cardStatus === "BELUM_WAKTUNYA" && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-tertiary)] text-[13px] font-bold rounded-xl cursor-default">
              <Timer size={16} />
              Tunggu {card.waitUntil}
            </div>
          )}
          {card.cardStatus === "SELESAI" && (
            <Link
              href={`/guru/absensi/${card.id}?tanggal=${todayIso}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[13px] font-bold rounded-xl hover:bg-[var(--border-subtle)] transition-colors"
            >
              <Eye size={16} />
              LIHAT DETAIL
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
