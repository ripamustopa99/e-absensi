/* eslint-disable */
"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import {
  Clock, BookOpen, CalendarDays,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import MobileFilterDrawer from "@/components/shared/MobileFilterDrawer";
import DataTable from "@/components/shared/DataTable";

// --- Types ---
type Mapel = { id: string; nama: string };
type TahunAjaran = { id: string; label: string; semester: string; isAktif: boolean };

type StatusAbsensi = {
  isHoliday: boolean;
  holidayKeterangan: string | null;
  isTodayScheduled: boolean;
  isInTimeWindow: boolean;
  sudahAbsen: boolean;
  isBisaAbsen: boolean;
};

type JadwalGuru = {
  id: string;
  hari: number;
  namaHari: string;
  jamMulai: string;
  jamSelesai: string;
  mapel: Mapel;
  jenjang: string;
  tingkatList: ({ tingkat: string } | string)[];
  tahunAjaran: TahunAjaran;
  statusAbsensi: StatusAbsensi;
};

type ApiResponse = { success: true; data: JadwalGuru[] };
type ApiError = { success: false; message: string };

// --- Utilities ---
const HARI_MAP: Record<number, string> = {
  1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis", 5: "Jumat", 6: "Sabtu", 7: "Minggu"
};

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

function formatTingkat(tingkatList: ({ tingkat: string } | string)[]): string {
  if (!tingkatList || !Array.isArray(tingkatList)) return "";
  return tingkatList.map(t => (typeof t === "string" ? t : t.tingkat)).filter(Boolean).join(", ");
}

export default function JadwalGuruPage() {
  const [jadwals, setJadwals] = useState<JadwalGuru[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterJenjang, setFilterJenjang] = useState("ALL");
  const [filterSemester, setFilterSemester] = useState("ALL");
  const [filterTingkat, setFilterTingkat] = useState("ALL");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Available Tingkat based on selected Jenjang
  const availableTingkat = useMemo(() => {
    if (filterJenjang === "MA") return ["X", "XI", "XII"];
    if (filterJenjang === "MTs") return ["VII", "VIII", "IX"];
    const set = new Set<string>();
    jadwals.forEach(j => (j.tingkatList || []).forEach(t => {
      const val = typeof t === "string" ? t : t?.tingkat;
      if (val) set.add(val);
    }));
    return Array.from(set).sort();
  }, [jadwals, filterJenjang]);

  useEffect(() => {
    if (filterJenjang === "ALL") {
      setFilterTingkat("ALL");
    }
  }, [filterJenjang]);

  // Semester Options
  const semesterOptions = useMemo(() => {
    const set = new Set<string>();
    jadwals.forEach(j => {
      if (j.tahunAjaran) {
        set.add(`${j.tahunAjaran.semester} ${j.tahunAjaran.label}`);
      }
    });
    return Array.from(set);
  }, [jadwals]);

  const todayHari = getTodayHari();
  const todayDateStr = getTodayDateString();

  useEffect(() => {
    const fetchJadwal = async () => {
      try {
        const res = await api.get<ApiResponse>("/jadwal");
        setJadwals(res.data.data);
      } catch (err) {
        console.error("Error fetching jadwal:", err);
        const error = err as AxiosError<ApiError>;
        toast.error(error.response?.data?.message ?? "Gagal memuat jadwal");
      } finally {
        setLoading(false);
      }
    };
    fetchJadwal();
  }, []);

  const filteredJadwals = jadwals.filter((j) => {
    const matchJenjang = filterJenjang === "ALL" || (j.jenjang === filterJenjang);
    const matchSemester = filterSemester === "ALL" || !j.tahunAjaran || `${j.tahunAjaran?.semester || ''} ${j.tahunAjaran?.label || ''}`.trim() === filterSemester;
    const matchTingkat = filterTingkat === "ALL" || (j.tingkatList || []).some(t => (typeof t === "string" ? t : t?.tingkat) === filterTingkat);
    return matchJenjang && matchSemester && matchTingkat;
  });

  const sortedFilteredJadwals = useMemo(() => {
    return [...filteredJadwals].sort((a, b) => {
      if (a.hari !== b.hari) return a.hari - b.hari;
      return a.jamMulai.localeCompare(b.jamMulai);
    });
  }, [filteredJadwals]);

  const todayJadwals = jadwals.filter(j => j.hari === todayHari);
  const isTodayHoliday = todayJadwals.length > 0 && todayJadwals.every(j => j.statusAbsensi?.isHoliday);
  const holidayName = todayJadwals.find(j => j.statusAbsensi?.isHoliday)?.statusAbsensi?.holidayKeterangan ?? "Libur Akademik";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative pb-10">
      {/* Holiday Banner */}
      {isTodayHoliday && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="text-rose-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-[14px] font-bold text-rose-800 dark:text-rose-400">Hari Libur Akademik</h3>
            <p className="text-[13px] text-rose-600 dark:text-rose-300 mt-0.5">
              Hari ini adalah {holidayName}. Seluruh sesi absensi dinonaktifkan secara otomatis oleh sistem.
            </p>
          </div>
        </div>
      )}

      {/* Header & Filters */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
              Jadwal Mengajar
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
              <CalendarDays size={14} />
              {todayDateStr}
            </p>
          </div>

          {/* Mobile Filter Trigger */}
          <div className="md:hidden">
            <MobileFilterDrawer
              isOpen={isMobileFilterOpen}
              onOpen={() => setIsMobileFilterOpen(true)}
              onClose={() => setIsMobileFilterOpen(false)}
              onReset={() => {
                setFilterJenjang("ALL");
                setFilterTingkat("ALL");
                setFilterSemester("ALL");
              }}
              title="Filter Jadwal Mengajar"
            >
              <div className="space-y-3 text-[13px]">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Jenjang</label>
                  <select value={filterJenjang} onChange={(e) => setFilterJenjang(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-md text-[13px]">
                    <option value="ALL">Semua Jenjang</option>
                    <option value="MA">MA</option>
                    <option value="MTs">MTs</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Tingkat</label>
                  <select
                    value={filterTingkat}
                    onChange={(e) => setFilterTingkat(e.target.value)}
                    disabled={filterJenjang === "ALL"}
                    className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-md text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="ALL">Semua Tingkat</option>
                    {availableTingkat.map(t => <option key={t} value={t}>Tingkat {t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Semester</label>
                  <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-md text-[13px]">
                    <option value="ALL">Semua Semester</option>
                    {semesterOptions.map(sem => <option key={sem} value={sem}>{sem}</option>)}
                  </select>
                </div>
              </div>
            </MobileFilterDrawer>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-3">
          <select
            value={filterJenjang}
            onChange={(e) => setFilterJenjang(e.target.value)}
            className="px-3 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
          >
            <option value="ALL">Semua Jenjang</option>
            <option value="MA">MA</option>
            <option value="MTs">MTs</option>
          </select>
          
          <select
            value={filterTingkat}
            onChange={(e) => setFilterTingkat(e.target.value)}
            disabled={filterJenjang === "ALL"}
            className="px-3 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="ALL">Semua Tingkat</option>
            {availableTingkat.map(t => <option key={t} value={t}>Tingkat {t}</option>)}
          </select>

          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="px-3 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
          >
            <option value="ALL">Semua Semester</option>
            {semesterOptions.map(sem => <option key={sem} value={sem}>{sem}</option>)}
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <DataTable
          loading={false}
          data={sortedFilteredJadwals}
          headers={["No", "Waktu (Hari & Jam)", "Jenjang", "Tingkat", "Mata Pelajaran"]}
          minWidth="min-w-[900px]"
          emptyMessage="Tidak ada jadwal mengajar ditemukan."
          emptyIcon={<BookOpen size={36} className="mx-auto mb-3 opacity-50" />}
          renderRow={(jadwal, idx) => {
            const s = jadwal.statusAbsensi || { isHoliday: false, holidayKeterangan: null, isTodayScheduled: false, isInTimeWindow: false, sudahAbsen: false, isBisaAbsen: false };

            return (
              <tr key={jadwal.id} className="transition-colors hover:bg-[var(--surface-subtle)]/50">
                <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">
                  {idx + 1}
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex w-[70px] text-[14px] font-bold text-[var(--text-primary)]">
                      {jadwal.namaHari || HARI_MAP[jadwal.hari] || "Hari"}
                    </span>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--border)]">
                      <Clock size={13} className="text-primary" />
                      {jadwal.jamMulai} - {jadwal.jamSelesai}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-5">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-bold uppercase tracking-wider">
                    {jadwal.jenjang}
                  </span>
                </td>
                <td className="py-4 px-5">
                  <div className="flex flex-wrap gap-1">
                    {(jadwal.tingkatList || []).map(t => {
                      const tingkatVal = typeof t === "string" ? t : t?.tingkat;
                      return (
                        <span key={tingkatVal} className="inline-flex px-2 py-1 rounded-[var(--radius-md)] text-[12px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200">
                          Tingkat {tingkatVal}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
                      <BookOpen size={14} />
                    </div>
                    <div>
                      <span className="text-[14px] font-bold text-[var(--text-primary)]">{jadwal.mapel?.nama ?? "-"}</span>
                      {s.isHoliday && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-bold rounded border border-rose-100">
                          <AlertTriangle size={12} /> {s.holidayKeterangan ?? "Libur"}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          }}
          renderMobileCard={(jadwal, idx) => (
            <div key={jadwal.id} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)]">#{idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded-[var(--radius-md)] text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {jadwal.namaHari || HARI_MAP[jadwal.hari] || "Hari"}
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded-[var(--radius-md)] text-[11px] font-bold bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {jadwal.jenjang}
                      </span>
                    </div>
                  </div>
                  <p className="text-[14px] font-bold text-[var(--text-primary)] mt-1">{jadwal.mapel?.nama ?? "-"}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5 font-medium bg-[var(--surface-subtle)] px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--border)]">
                  <Clock size={13} className="text-primary" />
                  {jadwal.jamMulai} - {jadwal.jamSelesai}
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  Tingkat {formatTingkat(jadwal.tingkatList)}
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
