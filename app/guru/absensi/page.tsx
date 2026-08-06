/* eslint-disable */
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import {
  Clock,
  CalendarDays,
  Timer,
  ArrowRight,
  Eye,
  Loader2,
  BookOpen,
  UserCheck,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import type { AxiosError } from "axios";

// --- Types (Hari Ini) ---
type Mapel = { id: string; nama: string };
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
  tingkatList: string[];
  tahunAjaran: TahunAjaran;
};

type AttendanceCardStatus =
  | "AKTIF"
  | "SELESAI"
  | "HABIS"
  | "BELUM_WAKTUNYA"
  | "LIBUR";

type AttendanceCard = ScheduleItem & {
  cardStatus: AttendanceCardStatus;
  absenTime?: string;
  waitUntil?: string;
  isEditable: boolean;
  statusAbsensi?: { sudahAbsen: boolean };
};

// --- Types (Riwayat) ---
type SessionStats = {
  HADIR: number;
  IZIN: number;
  SAKIT: number;
  ALPA: number;
};

type SessionRiwayat = {
  id: string;
  jadwalId: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  mapel: string;
  kelas: string;
  isEditable: boolean;
  stats: SessionStats;
};

type ApiJadwalResponse = {
  success: true;
  data: (ScheduleItem & {
    statusAbsensi: {
      sudahAbsen: boolean;
      isBisaAbsen: boolean;
      isHoliday: boolean;
    };
  })[];
};

type ApiError = { success: false; message: string };

function getTodayHari(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getTodayDateString(): string {
  return new Date().toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
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

function deriveCardStatus(
  jadwal: ScheduleItem & {
    statusAbsensi?: {
      sudahAbsen: boolean;
      isBisaAbsen: boolean;
      isHoliday: boolean;
    };
  },
  isHoliday: boolean,
): AttendanceCard {
  if (isHoliday) {
    return { ...jadwal, cardStatus: "LIBUR", isEditable: false };
  }
  const nowMinutes = getMinutesNow();
  const startMinutes = timeToMinutes(jadwal.jamMulai);
  const endMinutes = timeToMinutes(jadwal.jamSelesai);
  const isEditable =
    nowMinutes >= startMinutes - 15 && nowMinutes <= endMinutes + 15;

  // Jika sudah absen
  if (jadwal.statusAbsensi?.sudahAbsen) {
    return { ...jadwal, cardStatus: "SELESAI", isEditable };
  }

  // Jika belum absen dan waktu sudah habis (> endMinutes + 15)
  if (nowMinutes > endMinutes + 15) {
    return { ...jadwal, cardStatus: "HABIS", isEditable: false };
  }

  // Jika dalam rentang waktu aktif
  if (isEditable) {
    return { ...jadwal, cardStatus: "AKTIF", isEditable: true };
  }

  // Belum waktunya
  const waitMinutes = startMinutes - 15 - nowMinutes;
  const h = Math.floor(waitMinutes / 60);
  const m = waitMinutes % 60;
  const waitStr =
    h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")} menit`;

  return {
    ...jadwal,
    cardStatus: "BELUM_WAKTUNYA",
    waitUntil: waitStr,
    isEditable: false,
  };
}

export default function AbsensiPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [schedules, setSchedules] = useState<AttendanceCard[]>([]);
  const [isLoadingHariIni, setIsLoadingHariIni] = useState(true);
  const [holidayToday, setHolidayToday] = useState<{
    jenis: string;
    keterangan: string;
  } | null>(null);

  const [riwayatSchedules, setRiwayatSchedules] = useState<SessionRiwayat[]>(
    [],
  );
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(true);
  const [riwayatPage, setRiwayatPage] = useState(1);
  const [riwayatTotalPages, setRiwayatTotalPages] = useState(1);
  const [riwayatTotal, setRiwayatTotal] = useState(0);

  const now = new Date();
  const [filterTahun, setFilterTahun] = useState<number>(now.getFullYear());
  const [filterBulan, setFilterBulan] = useState<number>(now.getMonth() + 1);
  const [tahunAjaranList, setTahunAjaranList] = useState<
    { id: string; label: string; isAktif: boolean }[]
  >([]);
  const [searchRiwayat, setSearchRiwayat] = useState("");
  void setRiwayatPage; void riwayatTotalPages; void riwayatTotal; void filterTahun; void filterBulan; void setFilterBulan; void tahunAjaranList; void setSearchRiwayat;

  const [selectedJadwal, setSelectedJadwal] = useState<AttendanceCard | null>(
    null,
  );
  const [isReadyToTeach, setIsReadyToTeach] = useState(false);
  const [isSubmittingAbsenGuru, setIsSubmittingAbsenGuru] = useState(false);

  const todayHari = getTodayHari();
  const todayDateStr = getTodayDateString();
  const todayIso = getTodayIso();

  // Fetch Tahun Ajaran
  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const res = await api.get<{
          success: true;
          data: { id: string; label: string; isAktif: boolean }[];
        }>("/tahun-ajaran");
        if (res.data.success && res.data.data.length > 0) {
          setTahunAjaranList(res.data.data);
          const active =
            res.data.data.find((t) => t.isAktif) || res.data.data[0];
          if (active) {
            const firstYear = parseInt(
              active.label.split("/")[0] ?? String(now.getFullYear()),
              10,
            );
            setFilterTahun(firstYear);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchTahunAjaran();
  }, []);

  // Fetch Hari Ini & Kalender Akademik Holiday check
  useEffect(() => {
    const fetchSchedulesAndHoliday = async () => {
      try {
        const [res, holidayRes] = await Promise.all([
          api.get<ApiJadwalResponse>("/jadwal"),
          api.get<{
            success: boolean;
            data: { isHoliday: boolean; holiday: any };
          }>(`/kalender/check?tanggal=${todayIso}`),
        ]);

        const isHoliday = holidayRes.data.data.isHoliday;
        if (isHoliday) {
          setHolidayToday(holidayRes.data.data.holiday);
        }

        const todaySchedules = res.data.data
          .filter((j) => j.hari === todayHari)
          .sort(
            (a, b) => timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai),
          );

        const cards: AttendanceCard[] = todaySchedules
          .map((j) => deriveCardStatus(j, isHoliday))
          .sort((a, b) => {
            const isASelesai = a.cardStatus === "SELESAI";
            const isBSelesai = b.cardStatus === "SELESAI";

            if (!isASelesai && isBSelesai) return -1;
            if (isASelesai && !isBSelesai) return 1;

            return timeToMinutes(a.jamMulai) - timeToMinutes(b.jamMulai);
          });
        setSchedules(cards);
      } catch (err) {
        const error = err as AxiosError<ApiError>;
        toast.error(
          error.response?.data?.message ?? "Gagal memuat jadwal hari ini",
        );
      } finally {
        setIsLoadingHariIni(false);
      }
    };
    fetchSchedulesAndHoliday();
  }, [todayHari, todayIso, pathname]);

  const summaryHariIni = useMemo(() => {
    const total = schedules.length;
    const sudah = schedules.filter((s) => s.cardStatus === "SELESAI").length;
    const belum = total - sudah;
    return { total, sudah, belum };
  }, [schedules]);

  // Fetch Riwayat
  useEffect(() => {
    const fetchRiwayatData = async () => {
      setIsLoadingRiwayat(true);
      try {
        const res = await api.get<{
          success: true;
          data: {
            sessions: SessionRiwayat[];
            total: number;
            totalPages: number;
            page: number;
          };
        }>(`/absensi-siswa/riwayat?limit=10&page=${riwayatPage}`);
        setRiwayatSchedules(res.data.data?.sessions || []);
        setRiwayatTotal(res.data.data?.total || 0);
        setRiwayatTotalPages(res.data.data?.totalPages || 1);
      } catch (err) {
        toast.error("Gagal memuat riwayat absensi siswa");
      } finally {
        setIsLoadingRiwayat(false);
      }
    };
    fetchRiwayatData();
  }, [riwayatPage, pathname]);

  const filteredRiwayat = (riwayatSchedules || []).filter((item) => {
    const query = searchRiwayat.toLowerCase();
    return (
      item.mapel.toLowerCase().includes(query) ||
      item.kelas.toLowerCase().includes(query)
    );
  });

  const handleMulaiAbsen = (card: AttendanceCard) => {
    // Jika di halaman admin sudah dikonfirmasi (sudahAbsen), jangan munculkan modal konfirmasi lagi, langsung arahkan ke halaman absensi
    if (card.statusAbsensi?.sudahAbsen) {
      router.push(`/guru/absensi/${card.id}?tanggal=${todayIso}`);
      return;
    }
    setSelectedJadwal(card);
    setIsReadyToTeach(false);
  };

  const submitAbsensiGuru = () => {
    if (!selectedJadwal || !isReadyToTeach) return;
    setIsSubmittingAbsenGuru(true);
    router.push(`/guru/absensi/${selectedJadwal.id}?tanggal=${todayIso}`);
  };

  const handleClickSession = (session: SessionRiwayat) => {
    router.push(`/guru/absensi/${session.jadwalId}?tanggal=${session.tanggal}`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-0">
        {/* =========================================
            BAGIAN 1: ABSENSI HARI INI
            ========================================= */}
        <div className="space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                Absensi Hari Ini
              </h1>
              <p className="text-[14px] text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                <CalendarDays size={15} className="text-primary" />
                {todayDateStr}
              </p>
            </div>
          </div>

          {isLoadingHariIni ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-16 text-center shadow-sm">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {schedules.map((card) => (
                <ScheduleCard
                  key={card.id}
                  card={card}
                  todayIso={todayIso}
                  isHoliday={!!holidayToday}
                  onMulaiAbsen={handleMulaiAbsen}
                />
              ))}
            </div>
          )}

          {/* Footer Summary */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-start gap-6 shadow-sm">
            <div className="flex items-center gap-6 text-[13px] font-medium text-[var(--text-secondary)]">
              <span>
                Total Jadwal:{" "}
                <strong className="text-[var(--text-primary)]">
                  {summaryHariIni.total}
                </strong>
              </span>
              <span>
                Sudah Absen:{" "}
                <strong className="text-primary">{summaryHariIni.sudah}</strong>
              </span>
              <span>
                Belum Absen:{" "}
                <strong className="text-amber-500">
                  {summaryHariIni.belum}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* =========================================
          BAGIAN 2: RIWAYAT ABSENSI SISWA
          ========================================= */}
        <div className="space-y-6 pt-6 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UserCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Riwayat Absensi Terakhir
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Menampilkan 7 sesi absensi terbaru
                </p>
              </div>
            </div>
            <Link
              href="/guru/riwayat"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--surface-subtle)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[12px] font-bold transition-all"
            >
              Selengkapnya <ArrowRight size={14} />
            </Link>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <DataTable
              loading={isLoadingRiwayat}
              data={filteredRiwayat.slice(0, 7)}
              headers={[
                "Tanggal & Waktu",
                "Kelas & Mapel",
                "Hadir",
                "Sakit",
                "Izin",
                "Alpa",
                "Aksi",
              ]}
              emptyMessage="Belum ada riwayat absensi yang tercatat."
              minWidth="min-w-[800px]"
              renderRow={(item) => {
                const dateObj = new Date(item.tanggal);
                const dateFormatted = dateObj.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--surface-subtle)]/50 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-bold text-[var(--text-primary)] whitespace-nowrap">
                          {dateFormatted}
                        </span>
                        <span className="text-[12px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5 whitespace-nowrap">
                          <Clock size={12} className="text-blue-500 shrink-0" />{" "}
                          {item.waktuMulai} - {item.waktuSelesai}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <BookOpen size={14} className="text-purple-500" />{" "}
                          {item.mapel}
                        </span>
                        <span className="text-[12px] font-bold text-[var(--text-tertiary)]">
                          Kelas {item.kelas}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="inline-block px-3 py-1 bg-[#0FBE85]/10 text-[#0FBE85] border border-[#0FBE85]/20 font-bold text-[13px] rounded-md">
                        {item.stats.HADIR}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-[13px] rounded-md">
                        {item.stats.SAKIT}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-[13px] rounded-md">
                        {item.stats.IZIN}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold text-[13px] rounded-md">
                        {item.stats.ALPA}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleClickSession(item)}
                        className="text-[12px] font-bold text-[#0FBE85] hover:underline cursor-pointer"
                      >
                        Lihat
                      </button>
                    </td>
                  </tr>
                );
              }}
              renderMobileCard={(item) => {
                const dateObj = new Date(item.tanggal);
                const dateFormatted = dateObj.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <div
                    key={item.id}
                    className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">
                          {dateFormatted}
                        </span>
                        <p className="text-[14px] font-bold text-[var(--text-primary)] mt-1">
                          {item.mapel} - Kelas {item.kelas}
                        </p>
                        <p className="text-[12px] text-[var(--text-secondary)]">
                          {item.waktuMulai} - {item.waktuSelesai}
                        </p>
                      </div>
                      <button
                        onClick={() => handleClickSession(item)}
                        className="px-3 py-1.5 bg-[#0FBE85]/10 text-[#0FBE85] rounded-lg text-[12px] font-bold"
                      >
                        Lihat
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] text-center text-[12px]">
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                        <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">
                          Hadir
                        </span>
                        <span className="font-bold text-[#0FBE85]">
                          {item.stats.HADIR}
                        </span>
                      </div>
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                        <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">
                          Sakit
                        </span>
                        <span className="font-bold text-amber-500">
                          {item.stats.SAKIT}
                        </span>
                      </div>
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                        <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">
                          Izin
                        </span>
                        <span className="font-bold text-blue-500">
                          {item.stats.IZIN}
                        </span>
                      </div>
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                        <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">
                          Alpa
                        </span>
                        <span className="font-bold text-rose-500">
                          {item.stats.ALPA}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* Teacher Attendance Confirmation Modal */}
      <Modal
        isOpen={!!selectedJadwal}
        onClose={() => setSelectedJadwal(null)}
        title="Konfirmasi Absensi"
        description="Validasi sesi mengajar hari ini"
        maxWidth="md"
      >
        {selectedJadwal && (
          <div className="space-y-5">
            <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-[13px]">
                <CalendarDays size={16} className="text-primary" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {todayDateStr}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <Clock size={16} className="text-blue-500" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedJadwal.jamMulai} - {selectedJadwal.jamSelesai} WIB
                </span>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <BookOpen size={16} className="text-amber-500" />
                <span className="font-semibold text-[var(--text-primary)]">
                  Jenjang{" "}
                  {selectedJadwal.tahunAjaran
                    ? selectedJadwal.tahunAjaran.label
                    : ""}{" "}
                  - Tingkat {selectedJadwal.tingkatList.join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <CheckSquare size={16} className="text-purple-500" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedJadwal.mapel.nama}
                </span>
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group pt-2">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isReadyToTeach}
                  onChange={(e) => setIsReadyToTeach(e.target.checked)}
                />
                <div
                  className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${isReadyToTeach ? "bg-primary border-primary" : "border-[var(--border)] group-hover:border-primary"}`}
                >
                  {isReadyToTeach && (
                    <CheckSquare size={14} className="text-white" />
                  )}
                </div>
              </div>
              <span className="text-[14px] font-bold text-[var(--text-primary)] leading-tight select-none">
                Saya sudah di kelas dan siap mengajar.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedJadwal(null)}
                className="px-4 py-2 rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors border border-[var(--border)] cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={submitAbsensiGuru}
                disabled={!isReadyToTeach || isSubmittingAbsenGuru}
                className="px-5 py-2 rounded-[var(--radius-md)] text-[13px] font-bold bg-primary text-white hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingAbsenGuru ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />{" "}
                    Mengarahkan...
                  </>
                ) : (
                  <>
                    MASUK KE DAFTAR SISWA <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// --- Schedule Card Sub-component ---
function ScheduleCard({
  card,
  todayIso,
  isHoliday,
  onMulaiAbsen,
}: {
  card: AttendanceCard;
  todayIso: string;
  isHoliday: boolean;
  onMulaiAbsen: (card: AttendanceCard) => void;
}) {
  const statusConfig: Record<
    AttendanceCardStatus,
    { label: string; className: string }
  > = {
    LIBUR: {
      label: "LIBUR / KEGIATAN",
      className:
        "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    },
    AKTIF: {
      label: "AKTIF",
      className: "bg-primary/10 border-primary/30 text-primary",
    },
    SELESAI: {
      label: "SELESAI",
      className: "bg-primary/10 border-primary/30 text-primary",
    },
    HABIS: {
      label: "HABIS",
      className:
        "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
    },
    BELUM_WAKTUNYA: {
      label: "BELUM WAKTUNYA",
      className:
        "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--text-tertiary)]",
    },
  };

  const cfg = statusConfig[card.cardStatus];
  const isActive = card.cardStatus === "AKTIF";

  return (
    <div
      className={`bg-[var(--surface)] border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between ${isActive ? "border-primary/40 ring-1 ring-primary/10" : "border-[var(--border)]"}`}
    >
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-primary)]">
            <Clock
              size={13}
              className={
                isActive ? "text-primary" : "text-[var(--text-secondary)]"
              }
            />
            {card.jamMulai} - {card.jamSelesai}
          </div>
          <span
            className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wide ${cfg.className}`}
          >
            {cfg.label}
          </span>
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-tight">
            {card.mapel.nama}
          </h3>
          <p className="text-[12px] text-[var(--text-secondary)] font-medium mt-0.5">
            Tingkat {card.tingkatList.join(", ")}
          </p>
        </div>
      </div>

      <div className="mt-auto">
        {isHoliday ? (
          <div className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[12px] font-bold rounded-xl cursor-not-allowed">
            LIBUR SEKOLAH (TOMBOL MATI)
          </div>
        ) : card.cardStatus === "AKTIF" ? (
          <button
            onClick={() => onMulaiAbsen(card)}
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary-hover transition-all shadow-sm cursor-pointer"
          >
            <BookOpen size={14} /> ABSEN SEKARANG
          </button>
        ) : card.cardStatus === "SELESAI" ? (
          card.isEditable ? (
            <Link
              href={`/guru/absensi/${card.id}?tanggal=${todayIso}`}
              className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl hover:bg-[var(--border-subtle)] transition-colors"
            >
              <Eye size={14} /> LIHAT / EDIT
            </Link>
          ) : (
            <Link
              href={`/guru/absensi/${card.id}?tanggal=${todayIso}`}
              className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[12px] font-bold rounded-xl hover:bg-[var(--border-subtle)] transition-colors"
            >
              <Eye size={14} /> LIHAT
            </Link>
          )
        ) : card.cardStatus === "HABIS" ? (
          <Link
            href={`/guru/absensi/${card.id}?tanggal=${todayIso}`}
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[12px] font-bold rounded-xl hover:bg-[var(--border-subtle)] transition-colors"
          >
            <Eye size={14} /> LIHAT
          </Link>
        ) : (
          <div className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-tertiary)] text-[12px] font-bold rounded-xl cursor-not-allowed">
            <Timer size={14} /> Tunggu {card.waitUntil}
          </div>
        )}
      </div>
    </div>
  );
}
