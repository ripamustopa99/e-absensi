/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Filter,
  TrendingUp,
  Users,
} from "lucide-react";
import type { AxiosError } from "axios";
import ModuleToolbar from "@/components/shared/ModuleToolbar";
import DataTable from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";

type StatusAbsensiSiswa = "HADIR" | "SAKIT" | "IZIN" | "ALPA";

type StudentAttendance = {
  id: string;
  siswa: {
    id: string;
    nama: string;
    nisn: string;
  };
  totalHadir: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  totalAbsensi: number;
  persentaseKehadiran: number;
};

type TingkatData = {
  jenjang: string;
  tingkat: string;
};

type TahunAjaran = {
  id: string;
  label: string;
  isAktif: boolean;
};

type ApiResponse = {
  success: true;
  data: {
    stats: {
      totalHadir: number;
      totalSakit: number;
      totalIzin: number;
      totalAlpa: number;
      total: number;
    };
    students: StudentAttendance[];
    tingkatInfo?: { jenjang: string; tingkat: string };
    total?: number;
    totalPages?: number;
    currentPage?: number;
  };
};

const currentYear = new Date().getFullYear();

const monthOptions = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const semesterOptions = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
];

export default function GuruRekapPage() {
  const [data, setData] = useState<ApiResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Filter states
  const [selectedTingkatKey, setSelectedTingkatKey] = useState("");
  const [filterMode, setFilterMode] = useState<"bulan" | "semester">("bulan");
  const [bulan, setBulan] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const [tahun, setTahun] = useState(String(currentYear));
  const [semester, setSemester] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [tingkatList, setTingkatList] = useState<TingkatData[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);

  // Pagination states (backend controlled)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isCheckingTingkat, setIsCheckingTingkat] = useState(true);

  // Fetch allowed tingkat list for guru and set default selection
  const fetchTingkatList = useCallback(async () => {
    try {
      const res = await api.get<{ success: true; data: TingkatData[] }>("/rekap/absensi-siswa/guru/tingkat");
      const list = res.data.data;
      setTingkatList(list);
      if (list.length > 0 && !selectedTingkatKey) {
        const first = list[0];
        if (first) {
          setSelectedTingkatKey(`${first.jenjang}-${first.tingkat}`);
        }
      }
    } catch (err) {
      console.error("Error fetching tingkat:", err);
    } finally {
      setIsCheckingTingkat(false);
    }
  }, [selectedTingkatKey]);

  // Fetch dynamic academic years from database
  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const res = await api.get<{ success: true; data: TahunAjaran[] }>("/tahun-ajaran");
        if (res.data.success && res.data.data.length > 0) {
          setTahunAjaranList(res.data.data);
          const active = res.data.data.find((t) => t.isAktif) || res.data.data[0];
          if (active) {
            const firstYear = parseInt(active.label.split("/")[0] ?? String(currentYear), 10);
            setTahun(String(firstYear));
          }
        }
      } catch (err) {
        console.error("Error fetching tahun ajaran:", err);
      }
    };
    fetchTahunAjaran();
  }, []);

  // Fetch attendance data with backend verification and backend pagination
  const fetchData = useCallback(
    async (
      tingkatKey?: string,
      month?: string,
      year?: string,
      search?: string,
      currentPage: number = 1,
    ) => {
      if (!tingkatKey) return;
      const [jenjang, tingkat] = tingkatKey.split("-");
      if (!jenjang || !tingkat) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("jenjang", jenjang);
        params.append("tingkat", tingkat);
        if (search) params.append("search", search);
        if (month && year) {
          params.append("bulan", month);
          params.append("tahun", year);
        }
        params.append("page", currentPage.toString());
        params.append("limit", limit.toString());

        const res = await api.get<ApiResponse>(`/rekap/absensi-siswa/guru?${params.toString()}`);
        setData(res.data.data);
        setTotal(res.data.data.total ?? 0);
        setTotalPages(res.data.data.totalPages ?? 1);
      } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        toast.error(
          error.response?.data?.message ??
            "Gagal memuat data rekap absensi. Pastikan Anda memiliki hak akses ke tingkat ini.",
        );
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  // Initial fetch
  useEffect(() => {
    fetchTingkatList();
  }, [fetchTingkatList]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedTingkatKey, bulan, tahun, searchQuery]);

  // Fetch when filters or page change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedTingkatKey) {
        fetchData(selectedTingkatKey, bulan, tahun, searchQuery, page);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedTingkatKey, bulan, tahun, searchQuery, page, fetchData]);

  const handleReset = () => {
    if (tingkatList.length > 0) {
      const first = tingkatList[0];
      if (first) {
        setSelectedTingkatKey(`${first.jenjang}-${first.tingkat}`);
      }
    } else {
      setSelectedTingkatKey("");
    }
    setBulan(String(new Date().getMonth() + 1).padStart(2, "0"));
    setTahun(String(currentYear));
    setSemester("1");
    setSearchQuery("");
    setFilterMode("bulan");
    setPage(1);
  };

  const handleExport = async () => {
    if (!selectedTingkatKey) return;
    const [jenjang, tingkat] = selectedTingkatKey.split("-");
    if (!jenjang || !tingkat) return;

    try {
      setSearching(true);

      const params = new URLSearchParams();
      params.append("jenjang", jenjang);
      params.append("tingkat", tingkat);
      if (searchQuery) params.append("search", searchQuery);

      if (filterMode === "bulan") {
        params.append("bulan", bulan);
        params.append("tahun", tahun);
      } else {
        params.append("semester", semester);
        params.append("tahun", tahun);
      }

      params.append("export", "true");

      const res = await api.get(
        `/rekap/absensi-siswa/export?${params.toString()}`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `rekap-absensi-${jenjang}-Tingkat-${tingkat}-${bulan}-${tahun}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Laporan berhasil diunduh");
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(
        error.response?.data?.message ??
          "Gagal mengunduh laporan. Silakan coba lagi.",
      );
    } finally {
      setSearching(false);
    }
  };

  const statusMap = {
    HADIR: { label: "Hadir", color: "text-primary", bg: "bg-primary/10" },
    SAKIT: { label: "Sakit", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
    IZIN: { label: "Izin", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
    ALPA: { label: "Alpa", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
  };

  const stats = data?.stats || {
    totalHadir: 0,
    totalSakit: 0,
    totalIzin: 0,
    totalAlpa: 0,
    total: 0,
  };
  const statTotal = stats.total || 1;

  const studentList = useMemo(() => {
    if (!data?.students) return [];
    return data.students;
  }, [data?.students]);

  const selectedTingkatLabel = useMemo(() => {
    if (!selectedTingkatKey) return "Pilih Tingkat";
    const [jenjang, tingkat] = selectedTingkatKey.split("-");
    return `${jenjang} - Tingkat ${tingkat}`;
  }, [selectedTingkatKey]);

  const filterPeriodLabel = useMemo(() => {
    if (filterMode === "bulan") {
      const monthName = monthOptions.find((m) => m.value === bulan)?.label;
      return `${monthName} ${tahun}`;
    } else {
      const semName = semesterOptions.find((s) => s.value === semester)?.label;
      return `${semName} Tahun ${tahun}`;
    }
  }, [filterMode, bulan, tahun, semester]);

  const desktopFilters = (
    <>
      <select
        value={selectedTingkatKey}
        onChange={(e) => setSelectedTingkatKey(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-bold text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary transition-colors min-w-[180px] cursor-pointer shadow-sm"
      >
        <option value="">Pilih Tingkat</option>
        {tingkatList.map((item) => {
          const key = `${item.jenjang}-${item.tingkat}`;
          return (
            <option key={key} value={key}>
              {item.jenjang} - Tingkat {item.tingkat}
            </option>
          );
        })}
      </select>

      <div className="flex items-center gap-1 border border-[var(--border)] rounded-[var(--radius-md)] p-0.5 bg-[var(--surface)] shadow-sm">
        <button
          type="button"
          onClick={() => setFilterMode("bulan")}
          className={`px-3 py-1.5 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${
            filterMode === "bulan"
              ? "bg-primary text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          }`}
        >
          Per Bulan
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("semester")}
          className={`px-3 py-1.5 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${
            filterMode === "semester"
              ? "bg-primary text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          }`}
        >
          Per Semester
        </button>
      </div>

      {filterMode === "bulan" ? (
        <select
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer shadow-sm"
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer shadow-sm"
        >
          {semesterOptions.map((sem) => (
            <option key={sem.value} value={sem.value}>
              {sem.label}
            </option>
          ))}
        </select>
      )}

      <select
        value={tahun}
        onChange={(e) => setTahun(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary transition-colors cursor-pointer shadow-sm"
      >
        {tahunAjaranList.length > 0 ? (
          tahunAjaranList.map((ta) => {
            const yearNum = parseInt(ta.label.split("/")[0] ?? "", 10) || currentYear;
            return (
              <option key={ta.id} value={yearNum}>
                {ta.label} {ta.isAktif ? "(Aktif)" : ""}
              </option>
            );
          })
        ) : (
          [currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))
        )}
      </select>
    </>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tingkat Kelas</label>
        <select
          value={selectedTingkatKey}
          onChange={(e) => setSelectedTingkatKey(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary shadow-sm"
        >
          <option value="">Pilih Tingkat</option>
          {tingkatList.map((item) => {
            const key = `${item.jenjang}-${item.tingkat}`;
            return <option key={key} value={key}>{item.jenjang} - Tingkat {item.tingkat}</option>;
          })}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Mode Filter</label>
        <div className="flex items-center gap-2 border border-[var(--border)] rounded-[var(--radius-md)] p-0.5 bg-[var(--surface)] shadow-sm">
          <button
            type="button"
            onClick={() => setFilterMode("bulan")}
            className={`flex-1 px-3 py-1.5 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${filterMode === "bulan" ? "bg-primary text-white" : "text-[var(--text-secondary)] bg-[var(--surface-subtle)]"}`}
          >
            Bulan
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("semester")}
            className={`flex-1 px-3 py-1.5 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${filterMode === "semester" ? "bg-primary text-white" : "text-[var(--text-secondary)] bg-[var(--surface-subtle)]"}`}
          >
            Semester
          </button>
        </div>
      </div>

      {filterMode === "bulan" ? (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Bulan</label>
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary shadow-sm">
            {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Semester</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary shadow-sm">
            {semesterOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran</label>
        <select value={tahun} onChange={(e) => setTahun(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary shadow-sm">
          {tahunAjaranList.map((ta) => {
            const yNum = parseInt(ta.label.split("/")[0] ?? "", 10) || currentYear;
            return <option key={ta.id} value={yNum}>{ta.label}</option>;
          })}
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header with Export Button on Top Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-[var(--radius-md)]">
              <TrendingUp className="text-primary" size={24} />
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
              Rekap Kehadiran Siswa
            </h1>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Rekap kehadiran siswa per bulan berdasarkan tingkat yang Anda ajar.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!selectedTingkatKey || searching || loading}
          className="px-4 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-[var(--radius-md)] hover:bg-primary-hover disabled:bg-[var(--text-tertiary)] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
        >
          <Download size={14} />
          {searching ? "Mengunduh..." : "Export Laporan"}
        </button>
      </div>

      {/* Loading State or Not Authorized State */}
      {isCheckingTingkat ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Loader2 size={32} className="animate-spin text-primary mb-4" />
          <p className="text-[14px] font-medium text-[var(--text-secondary)]">
            Memeriksa akses data...
          </p>
        </div>
      ) : tingkatList.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 dark:bg-amber-950/20 rounded-full mb-4">
             <Filter size={24} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Akses Dibatasi</h3>
          <p className="text-[14px] text-[var(--text-secondary)] max-w-md mx-auto">
            Halaman ini hanya dapat diakses oleh guru yang ditugaskan sebagai wali kelas.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ModuleToolbar as clean standalone card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <ModuleToolbar
              search={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Cari siswa (nama/NISN)..."
              desktopFilters={desktopFilters}
              mobileFilters={mobileFilters}
              onResetFilters={handleReset}
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
              <Loader2 size={32} className="animate-spin text-primary mb-3" />
              <p className="text-[13px] font-medium text-[var(--text-secondary)]">Memuat data rekap absensi...</p>
            </div>
          ) : !selectedTingkatKey ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--surface-subtle)] rounded-full mb-4">
                <Users size={24} className="text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[14px] font-medium text-[var(--text-secondary)]">
                Silakan pilih tingkat kelas untuk melihat rekap absensi siswa.
              </p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-[var(--radius-lg)] px-4 py-3">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {selectedTingkatLabel}
                  </p>
                  <p className="text-[13px] font-medium text-[var(--text-primary)] mt-1">
                    {filterPeriodLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Total Siswa
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {total}
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["HADIR", "SAKIT", "IZIN", "ALPA"] as StatusAbsensiSiswa[]).map(
                  (status) => {
                    const count =
                      (stats[
                        `total${status.charAt(0) + status.slice(1).toLowerCase()}` as keyof typeof stats
                      ] as number) || 0;
                    const percentage =
                      statTotal > 0 ? Math.round((count / statTotal) * 100) : 0;

                    return (
                      <div
                        key={status}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-sm hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                            {statusMap[status].label}
                          </p>
                          <span className="text-[11px] font-bold text-[var(--text-tertiary)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
                            {percentage}%
                          </span>
                        </div>
                        <p
                          className={`text-3xl font-extrabold tracking-tight ${statusMap[status].color}`}
                        >
                          {count}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Reusable Data Table & Pagination in clean card */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
                  <h2 className="text-[14px] font-bold text-[var(--text-primary)]">
                    Detail Kehadiran Siswa
                  </h2>
                </div>
                <DataTable
                  loading={false}
                  data={studentList}
                  headers={["Siswa & NISN", "Hadir", "Sakit", "Izin", "Alpa", "Persentase"]}
                  minWidth="min-w-[900px]"
                  emptyMessage="Belum ada data absensi pada periode ini."
                  emptyIcon={<Users size={36} className="mx-auto mb-3 opacity-50 text-[var(--text-tertiary)]" />}
                  renderRow={(student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-[var(--surface-subtle)]/50 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          {student.siswa.nama}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {student.siswa.nisn}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-[12px] font-bold">
                          {student.totalHadir}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-full text-[12px] font-bold dark:bg-blue-500/10 dark:text-blue-400">
                          {student.totalSakit}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-50 text-amber-600 rounded-full text-[12px] font-bold dark:bg-amber-500/10 dark:text-amber-400">
                          {student.totalIzin}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-rose-50 text-rose-600 rounded-full text-[12px] font-bold dark:bg-rose-500/10 dark:text-rose-400">
                          {student.totalAlpa}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${student.persentaseKehadiran}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-[12px] font-bold ${
                              student.persentaseKehadiran >= 85
                                ? "text-primary"
                                : student.persentaseKehadiran >= 70
                                  ? "text-amber-500"
                                  : "text-rose-500"
                            }`}
                          >
                            {student.persentaseKehadiran}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  renderMobileCard={(student) => (
                    <div
                      key={student.id}
                      className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[14px] font-bold text-[var(--text-primary)]">
                            {student.siswa.nama}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            NISN: {student.siswa.nisn}
                          </p>
                        </div>
                        <span
                          className={`text-[12px] font-bold ${
                            student.persentaseKehadiran >= 85
                              ? "text-primary"
                              : student.persentaseKehadiran >= 70
                                ? "text-amber-500"
                                : "text-rose-500"
                          }`}
                        >
                          {student.persentaseKehadiran}%
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-[var(--border-subtle)]">
                        <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                          <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Hadir</p>
                          <p className="text-[13px] font-bold text-primary">{student.totalHadir}</p>
                        </div>
                        <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                          <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Sakit</p>
                          <p className="text-[13px] font-bold text-blue-600 dark:text-blue-400">{student.totalSakit}</p>
                        </div>
                        <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                          <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Izin</p>
                          <p className="text-[13px] font-bold text-amber-600 dark:text-amber-400">{student.totalIzin}</p>
                        </div>
                        <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                          <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Alpa</p>
                          <p className="text-[13px] font-bold text-rose-600 dark:text-rose-400">{student.totalAlpa}</p>
                        </div>
                      </div>
                    </div>
                  )}
                />

                {/* Reusable Backend-driven Pagination Component */}
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setPage(newPage)}
                  total={total}
                  limit={limit}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
