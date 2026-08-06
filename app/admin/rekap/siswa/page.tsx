/* eslint-disable */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Filter,
  X,
  Users,
  BarChart3,
  ChevronRight,
  Edit3,
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

type StudentDetailRecord = {
  id: string;
  tanggal: string;
  status: StatusAbsensiSiswa;
  alasan: string | null;
  jadwal: {
    jamMulai: string;
    jamSelesai: string;
    mapel: { nama: string };
  };
};

type StudentDetailData = {
  siswa: {
    id: string;
    nama: string;
    nisn: string;
    jenjang: string;
    tingkat: string;
  };
  records: StudentDetailRecord[];
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

export default function AdminRekapSiswaPage() {
  const [data, setData] = useState<ApiResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Filter states
  const [filterJenjang, setFilterJenjang] = useState<"MA" | "MTs">("MA");
  const [filterTingkat, setFilterTingkat] = useState("X");
  const [bulan, setBulan] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );
  const [tahun, setTahun] = useState(String(currentYear));
  const [searchQuery, setSearchQuery] = useState("");
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<"bulan" | "semester">("bulan");
  const [semester, setSemester] = useState("1");

  // Pagination states
  const [page, setPage] = useState(1);
  const limit = 10;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal detail individual siswa
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [studentDetailData, setStudentDetailData] = useState<StudentDetailData | null>(null);

  // Edit attendance state
  const [editingRecord, setEditingRecord] = useState<StudentDetailRecord | null>(null);
  const [editStatus, setEditStatus] = useState<StatusAbsensiSiswa>("HADIR");
  const [editAlasan, setEditAlasan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch tahun ajaran list
  const fetchTahunAjaranList = useCallback(async () => {
    try {
      const res = await api.get<{ data: any[] }>("/tahun-ajaran");
      const list = res.data.data;
      setTahunAjaranList(list);

      const aktif = list.find((t) => t.isAktif) || list[0];
      if (aktif) {
        const startYear = new Date(aktif.tanggalMulaiGanjil).getFullYear();
        setTahun(String(startYear));
      }
    } catch (err) {
      console.error("Error fetching tahun ajaran:", err);
    }
  }, []);

  // Fetch attendance data
  const fetchData = useCallback(
    async (
      jenjangVal: string,
      tingkatVal: string,
      month: string,
      year: string,
      sem: string,
      search: string,
      pageNum: number
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("jenjang", jenjangVal);
        params.append("tingkat", tingkatVal);

        if (search) params.append("search", search);
        params.append("page", pageNum.toString());
        params.append("limit", limit.toString());

        if (filterMode === "bulan" && month && year) {
          params.append("bulan", month);
          params.append("tahun", year);
        } else if (filterMode === "semester" && sem && year) {
          params.append("semester", sem);
          params.append("tahun", year);
        }

        const url = `/rekap/absensi-siswa/guru?${params.toString()}`;

        const res = await api.get<ApiResponse>(url);
        setData(res.data.data);
        setTotal((res.data.data as any).total || 0);
        setTotalPages((res.data.data as any).totalPages || 1);
      } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        toast.error(
          error.response?.data?.message ??
          "Gagal memuat data rekap absensi.",
        );
      } finally {
        setLoading(false);
      }
    },
    [filterMode, limit],
  );

  useEffect(() => {
    fetchTahunAjaranList();
  }, [fetchTahunAjaranList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterJenjang && filterTingkat && tahun) {
        fetchData(filterJenjang, filterTingkat, bulan, tahun, semester, searchQuery, page);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filterJenjang, filterTingkat, bulan, tahun, semester, searchQuery, filterMode, page, fetchData]);

  // Reset page to 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [filterJenjang, filterTingkat, bulan, tahun, semester, searchQuery, filterMode]);

  const fetchStudentDetail = useCallback(async (student: StudentAttendance) => {
    setSelectedStudent(student);
    setStudentDetailLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: StudentDetailData }>(
        `/rekap/absensi-siswa/admin/student/${student.siswa.id}?bulan=${bulan}&tahun=${tahun}`
      );
      setStudentDetailData(res.data.data);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat detail absensi siswa");
    } finally {
      setStudentDetailLoading(false);
    }
  }, [bulan, tahun]);

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      await api.put("/rekap/absensi-siswa/admin/update", {
        absensiId: editingRecord.id,
        status: editStatus,
        alasan: editAlasan,
      });
      toast.success("Absensi siswa berhasil diperbarui");
      setEditingRecord(null);
      if (selectedStudent) {
        fetchStudentDetail(selectedStudent);
      }
      if (filterJenjang && filterTingkat) {
        fetchData(filterJenjang, filterTingkat, bulan, tahun, semester, searchQuery, page);
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memperbarui absensi");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReset = () => {
    setFilterJenjang("MA");
    setFilterTingkat("X");
    setBulan(String(new Date().getMonth() + 1).padStart(2, "0"));
    if (tahunAjaranList.length > 0) {
      const aktif = tahunAjaranList.find(t => t.isAktif) || tahunAjaranList[0];
      setTahun(String(new Date(aktif.tanggalMulaiGanjil).getFullYear()));
    }
    setSemester("1");
    setSearchQuery("");
    setFilterMode("bulan");
    setPage(1);
    setData(null);
  };

  const handleExport = async () => {
    try {
      setSearching(true);
      const params = new URLSearchParams();
      params.append("jenjang", filterJenjang);
      params.append("tingkat", filterTingkat);

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
        { responseType: "blob" },
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `rekap-absensi-${filterJenjang}-Tingkat-${filterTingkat}-${bulan}-${tahun}.xlsx`,
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
    SAKIT: { label: "Sakit", color: "text-blue-500", bg: "bg-blue-50" },
    IZIN: { label: "Izin", color: "text-amber-500", bg: "bg-amber-50" },
    ALPA: { label: "Alpa", color: "text-rose-500", bg: "bg-rose-50" },
  };

  const stats = data?.stats || {
    totalHadir: 0,
    totalSakit: 0,
    totalIzin: 0,
    totalAlpa: 0,
    total: 0,
  };
  const statsTotal = stats.total || 1;

  const studentList = useMemo(() => {
    if (!data?.students) return [];
    return data.students.sort(
      (a, b) => b.persentaseKehadiran - a.persentaseKehadiran,
    );
  }, [data?.students]);

  const selectedKelasLabel = useMemo(() => {
    return `${filterJenjang} Tingkat ${filterTingkat}`;
  }, [filterJenjang, filterTingkat]);

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
        value={filterJenjang}
        onChange={(e) => {
          const val = e.target.value as "MA" | "MTs";
          setFilterJenjang(val);
          setFilterTingkat(val === "MA" ? "X" : "VII");
        }}
        className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-primary transition-colors min-w-[120px] cursor-pointer shadow-sm"
      >
        <option value="MA">MA</option>
        <option value="MTs">MTs</option>
      </select>

      <select
        value={filterTingkat}
        onChange={(e) => setFilterTingkat(e.target.value)}
        className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-primary transition-colors min-w-[120px] cursor-pointer shadow-sm"
      >
        {filterJenjang === "MA" ? (
          <>
            <option value="X">Kelas X</option>
            <option value="XI">Kelas XI</option>
            <option value="XII">Kelas XII</option>
          </>
        ) : (
          <>
            <option value="VII">Kelas VII</option>
            <option value="VIII">Kelas VIII</option>
            <option value="IX">Kelas IX</option>
          </>
        )}
      </select>

      <div className="flex items-center gap-1 border border-[var(--border)] rounded-[var(--radius-md)] p-0.5 bg-[var(--surface)] shadow-sm">
        <button
          type="button"
          onClick={() => setFilterMode("bulan")}
          className={`px-3 py-1.5 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${filterMode === "bulan" ? "bg-primary text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            }`}
        >
          Per Bulan
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("semester")}
          className={`px-3 py-1.5 text-[12px] font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${filterMode === "semester" ? "bg-primary text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            }`}
        >
          Per Semester
        </button>
      </div>

      {filterMode === "bulan" ? (
        <select
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-primary transition-colors cursor-pointer shadow-sm"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      ) : (
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-primary transition-colors cursor-pointer shadow-sm"
        >
          {semesterOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}

      <select
        value={tahun}
        onChange={(e) => setTahun(e.target.value)}
        className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] focus:outline-none focus:border-primary transition-colors cursor-pointer shadow-sm"
      >
        {tahunAjaranList.map((t) => {
          const y = new Date(t.tanggalMulaiGanjil).getFullYear();
          return (<option key={t.id} value={String(y)}>{t.label}</option>);
        })}
      </select>
    </>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Jenjang</label>
        <select
          value={filterJenjang}
          onChange={(e) => {
            const val = e.target.value as "MA" | "MTs";
            setFilterJenjang(val);
            setFilterTingkat(val === "MA" ? "X" : "VII");
          }}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          <option value="MA">MA</option>
          <option value="MTs">MTs</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tingkat</label>
        <select
          value={filterTingkat}
          onChange={(e) => setFilterTingkat(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          {filterJenjang === "MA" ? (
            <>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </>
          ) : (
            <>
              <option value="VII">Kelas VII</option>
              <option value="VIII">Kelas VIII</option>
              <option value="IX">Kelas IX</option>
            </>
          )}
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
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-primary outline-none shadow-sm cursor-pointer">
            {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Semester</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-primary outline-none shadow-sm cursor-pointer">
            {semesterOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun</label>
        <select value={tahun} onChange={(e) => setTahun(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-primary outline-none shadow-sm cursor-pointer">
          {tahunAjaranList.map((t) => {
            const y = new Date(t.tanggalMulaiGanjil).getFullYear();
            return (<option key={t.id} value={String(y)}>{t.label}</option>);
          })}
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header with Standalone Export Button on Top Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-[var(--radius-md)]">
              <BarChart3 className="text-primary" size={24} />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
              Manajemen Absensi Siswa
            </h1>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Filter rekapitulasi absensi per kelas, bulan, tanggal, dan detail per orang siswa. Admin dapat mengedit data absensi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!filterJenjang || !filterTingkat || searching}
          className="px-4 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-[var(--radius-md)] hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
        >
          {searching ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Mengunduh...
            </>
          ) : (
            <>
              <Download size={14} /> Export Excel
            </>
          )}
        </button>
      </div>

      {/* Toolbar Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <ModuleToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Cari siswa atau NISN..."
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={handleReset}
        />
      </div>

      {!filterJenjang || !filterTingkat ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 p-6 text-center">
          <Filter size={36} className="text-primary mb-4 opacity-70" />
          <p className="text-[15px] font-bold text-[var(--text-primary)]">
            Silakan pilih kelas terlebih dahulu
          </p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Data rekapitulasi dan detail kehadiran siswa akan ditampilkan berdasarkan pilihan kelas.
          </p>
        </div>
      ) : loading ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col items-center justify-center py-20">
          <Loader2 size={36} className="animate-spin text-primary mb-4" />
          <p className="text-[14px] font-medium text-[var(--text-secondary)]">
            Memuat data absensi siswa...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Header & Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="col-span-2 lg:col-span-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                  Kelas & Periode
                </p>
                <p className="text-[15px] font-black text-[var(--text-primary)]">
                  {selectedKelasLabel}
                </p>
              </div>
              <p className="text-[12px] font-semibold text-primary mt-2">
                {filterPeriodLabel}
              </p>
            </div>

            {(["HADIR", "SAKIT", "IZIN", "ALPA"] as StatusAbsensiSiswa[]).map(
              (status) => {
                const statKey =
                  status === "HADIR"
                    ? "totalHadir"
                    : status === "SAKIT"
                      ? "totalSakit"
                      : status === "IZIN"
                        ? "totalIzin"
                        : "totalAlpa";
                const count = stats[statKey] || 0;
                const percentage = statsTotal > 0 ? Math.round((count / statsTotal) * 100) : 0;

                return (
                  <div
                    key={status}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm"
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
                      className={`text-2xl font-black tracking-tight ${statusMap[status].color}`}
                    >
                      {count} <span className="text-[12px] font-medium text-[var(--text-tertiary)]">sesi</span>
                    </p>
                  </div>
                );
              },
            )}
          </div>

          {/* Data Table Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]/50 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[var(--text-primary)]">
                Daftar Siswa ({studentList.length}) — Klik baris untuk melihat detail & edit
              </h2>
            </div>
              <DataTable
                loading={false}
                data={studentList}
                headers={["Siswa", "Hadir", "Sakit", "Izin", "Alpa", "Persentase & Aksi"]}
                minWidth="min-w-[750px]"
                emptyMessage="Belum ada data siswa pada kelas dan periode ini."
                emptyIcon={<Users size={36} className="mx-auto mb-3 opacity-50 text-[var(--text-tertiary)]" />}
                renderRow={(student) => (
                  <tr
                    key={student.id}
                    onClick={() => fetchStudentDetail(student)}
                    className="hover:bg-[var(--surface-subtle)]/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[14px]">
                          {student.siswa.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors">
                            {student.siswa.nama}
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            NISN: {student.siswa.nisn}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[12px] font-bold">
                        {student.totalHadir}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-[12px] font-bold">
                        {student.totalSakit}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 text-[12px] font-bold">
                        {student.totalIzin}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 text-[12px] font-bold">
                        {student.totalAlpa}
                      </span>
                    </td>
                    <td className="text-right py-4 px-6">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-24 h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${student.persentaseKehadiran >= 90
                                ? "bg-primary"
                                : student.persentaseKehadiran >= 75
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            style={{ width: `${Math.min(100, Math.max(0, student.persentaseKehadiran))}%` }}
                          />
                        </div>
                        <span className="text-[13px] font-black text-[var(--text-primary)] w-12 text-right">
                          {Math.round(student.persentaseKehadiran)}%
                        </span>
                        <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:text-primary transition-colors" />
                      </div>
                    </td>
                  </tr>
                )}
                renderMobileCard={(student) => (
                  <div
                    key={student.id}
                    onClick={() => fetchStudentDetail(student)}
                    className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[14px]">
                          {student.siswa.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[var(--text-primary)]">
                            {student.siswa.nama}
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            NISN: {student.siswa.nisn}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Edit3 size={14} className="text-[var(--text-tertiary)]" />
                        <span className={`text-[12px] font-bold ${student.persentaseKehadiran >= 90
                            ? "text-primary"
                            : student.persentaseKehadiran >= 75
                              ? "text-amber-500"
                              : "text-rose-500"
                          }`}>
                          {Math.round(student.persentaseKehadiran)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-[var(--border-subtle)] text-[12px]">
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                        <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Hadir</p>
                        <p className="font-bold text-primary">{student.totalHadir}</p>
                      </div>
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                        <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Sakit</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400">{student.totalSakit}</p>
                      </div>
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                        <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Izin</p>
                        <p className="font-bold text-amber-600 dark:text-amber-400">{student.totalIzin}</p>
                      </div>
                      <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                        <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Alpa</p>
                        <p className="font-bold text-rose-600 dark:text-rose-400">{student.totalAlpa}</p>
                      </div>
                    </div>
                  </div>
                )}
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
                total={total}
                limit={limit}
              />
            </div>
          </div>
        )}

      {/* ─── Modal Detail & Edit Absensi Siswa ─── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-subtle)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Detail Kehadiran: {selectedStudent.siswa.nama}
                </h3>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  NISN: {selectedStudent.siswa.nisn} | Periode: {filterPeriodLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {studentDetailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-primary" />
                </div>
              ) : studentDetailData?.records.length === 0 ? (
                <p className="text-center py-12 text-[13px] text-[var(--text-tertiary)]">
                  Tidak ada catatan absensi untuk siswa ini pada periode tersebut.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {studentDetailData?.records.map((rec) => (
                    <div key={rec.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          {new Date(rec.tanggal).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[12px] text-[var(--text-secondary)]">
                          Mapel: <strong className="text-[var(--text-primary)]">{rec.jadwal.mapel.nama}</strong> ({rec.jadwal.jamMulai} - {rec.jadwal.jamSelesai})
                        </p>
                        {rec.alasan && (
                          <p className="text-[11px] text-amber-600 mt-0.5">
                            Keterangan: {rec.alasan}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${statusMap[rec.status].bg} ${statusMap[rec.status].color}`}>
                          {statusMap[rec.status].label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord(rec);
                            setEditStatus(rec.status);
                            setEditAlasan(rec.alasan || "");
                          }}
                          className="px-3 py-1.5 bg-[var(--surface-subtle)] hover:bg-primary/10 text-[var(--text-secondary)] hover:text-primary border border-[var(--border)] rounded-lg text-[12px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Sub-modal: Edit Single Student Record ─── */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Edit Status Kehadiran Siswa
            </h3>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Status Kehadiran
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as StatusAbsensiSiswa)}
                className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="HADIR">Hadir</option>
                <option value="SAKIT">Sakit</option>
                <option value="IZIN">Izin</option>
                <option value="ALPA">Alpa</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Alasan / Keterangan (Opsional)
              </label>
              <input
                type="text"
                value={editAlasan}
                onChange={(e) => setEditAlasan(e.target.value)}
                placeholder="Contoh: Surat dokter terlampir"
                className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-[13px] font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {savingEdit ? <Loader2 size={14} className="animate-spin" /> : null} Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
