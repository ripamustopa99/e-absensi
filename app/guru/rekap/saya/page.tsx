"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  CheckCircle2, Clock, AlertTriangle, Info,
  Loader2, Download, BookOpen, Users, X
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import DataTable from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";
import MobileFilterDrawer from "@/components/shared/MobileFilterDrawer";

type RekapDetail = {
  tanggal: string;
  jadwalId: string;
  hari: number;
  namaHari: string;
  jamMulai: string;
  jamSelesai: string;
  mapel: string;
  kelas: string;
  jenjang: string;
  status: "HADIR" | "TIDAK_HADIR";
  waktuAbsen: string | null;
};

type RekapData = {
  tahunAjaranId: string;
  semester: string;
  stats: {
    totalExpected: number;
    totalHadir: number;
    totalTidakHadir: number;
    persentase: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  details: RekapDetail[];
};

type ApiResponse = {
  success: boolean;
  data: RekapData;
};

type TahunAjaran = {
  id: string;
  label: string;
  isAktif: boolean;
};

type TahunAjaranResponse = {
  success: boolean;
  data: TahunAjaran[];
};

export default function KehadiranGuruPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [filterTahunAjaranId, setFilterTahunAjaranId] = useState("");
  const [filterSemester, setFilterSemester] = useState("GANJIL");
  const [filterBulan, setFilterBulan] = useState("Semua");

  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterJenjang, setFilterJenjang] = useState("Semua");

  const [page, setPage] = useState(1);
  const limit = 10;

  const [data, setData] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTahun, setLoadingTahun] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<RekapDetail | null>(null);

  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const res = await api.get<TahunAjaranResponse>("/tahun-ajaran");
        const list = res.data.data;
        setTahunAjaranList(list);

        const aktif = list.find((t) => t.isAktif);
        if (aktif) {
          setFilterTahunAjaranId(aktif.id);
        } else if (list.length > 0) {
          setFilterTahunAjaranId(list[0].id);
        }
      } catch (err) {
        toast.error("Gagal memuat daftar tahun ajaran");
      } finally {
        setLoadingTahun(false);
      }
    };
    fetchTahunAjaran();
  }, []);

  const fetchData = useCallback(async () => {
    if (!filterTahunAjaranId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahunAjaranId: filterTahunAjaranId,
        semester: filterSemester,
        page: page.toString(),
        limit: limit.toString()
      });

      if (filterStatus !== "Semua") params.append("status", filterStatus);
      if (filterJenjang !== "Semua") params.append("jenjang", filterJenjang);
      if (filterBulan !== "Semua") params.append("bulan", filterBulan);

      const res = await api.get<ApiResponse>(`/absensi-guru/rekap?${params.toString()}`);
      setData(res.data.data);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat rekap kehadiran");
    } finally {
      setLoading(false);
    }
  }, [filterTahunAjaranId, filterSemester, page, filterStatus, filterJenjang, filterBulan]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterTahunAjaranId, filterSemester, filterStatus, filterJenjang, filterBulan]);

  const handleExportExcel = async () => {
    if (!filterTahunAjaranId) return;
    
    const params = new URLSearchParams({
      tahunAjaranId: filterTahunAjaranId,
      semester: filterSemester
    });
    if (filterBulan !== "Semua") params.append("bulan", filterBulan);
    
    toast.promise(
      api.get(`/absensi-guru/rekap/export?${params.toString()}`, {
        responseType: 'blob'
      }).then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        const taLabel = tahunAjaranList.find(t => t.id === filterTahunAjaranId)?.label?.replace('/', '-') || '';
        a.download = `Rekap_Kehadiran_Guru_${taLabel}_${filterSemester}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }),
      {
        loading: 'Mengunduh rekap kehadiran...',
        success: 'Berhasil mengunduh rekap kehadiran!',
        error: 'Gagal mengunduh rekap kehadiran.'
      }
    );
  };

  const handleResetFilters = () => {
    setFilterSemester("GANJIL");
    setFilterBulan("Semua");
    setFilterStatus("Semua");
    setFilterJenjang("Semua");
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "HADIR": return { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", icon: CheckCircle2, label: "✓ Hadir" };
      case "TIDAK_HADIR": return { color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/20", icon: AlertTriangle, label: "X Tidak Hadir" };
      default: return { color: "text-[var(--text-tertiary)]", bg: "bg-[var(--surface-subtle)]", border: "border-[var(--border)]", icon: Info, label: status };
    }
  };

  const filterContent = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran</label>
        <select
          value={filterTahunAjaranId}
          onChange={(e) => setFilterTahunAjaranId(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          {tahunAjaranList.map((tahun) => (
            <option key={tahun.id} value={tahun.id}>{tahun.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Semester</label>
        <select
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          <option value="GANJIL">Semester Ganjil</option>
          <option value="GENAP">Semester Genap</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Bulan</label>
        <select
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          <option value="Semua">Semua Bulan</option>
          <option value="01">Januari</option>
          <option value="02">Februari</option>
          <option value="03">Maret</option>
          <option value="04">April</option>
          <option value="05">Mei</option>
          <option value="06">Juni</option>
          <option value="07">Juli</option>
          <option value="08">Agustus</option>
          <option value="09">September</option>
          <option value="10">Oktober</option>
          <option value="11">November</option>
          <option value="12">Desember</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          <option value="Semua">Semua Status</option>
          <option value="HADIR">Hadir</option>
          <option value="TIDAK_HADIR">Tidak Hadir</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Jenjang</label>
        <select
          value={filterJenjang}
          onChange={(e) => setFilterJenjang(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          <option value="Semua">Semua Jenjang</option>
          <option value="MTs">MTs</option>
          <option value="MA">MA</option>
        </select>
      </div>
    </div>
  );

  if (loadingTahun) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ─── Header with Standalone Export Button on Top Right for Desktop ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">REKAP KEHADIRAN SAYA</h1>
          <p className="text-[14px] font-medium text-[var(--text-secondary)] mt-0.5">Lihat riwayat dan statistik kehadiran mengajar Anda</p>
        </div>
        <button
          type="button"
          onClick={handleExportExcel}
          className="hidden md:flex px-4 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-[var(--radius-md)] hover:bg-primary-hover transition-colors items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
        >
          <Download size={14} /> Export Laporan
        </button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* ─── Filter Bar (Desktop & Mobile Side-by-side Export/Filter) ─── */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
            {/* Mobile Side-by-side Export (left) & Filter (right) */}
            <div className="md:hidden flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex-1 px-4 py-2.5 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Download size={14} /> Export
              </button>
              <div className="flex-1">
                <MobileFilterDrawer
                  isOpen={isFilterModalOpen}
                  onOpen={() => setIsFilterModalOpen(true)}
                  onClose={() => setIsFilterModalOpen(false)}
                  title="Filter Kehadiran"
                  onReset={handleResetFilters}
                  className="w-full justify-center py-2.5"
                >
                  {filterContent}
                </MobileFilterDrawer>
              </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex flex-wrap items-center gap-3 w-full">
              <select
                value={filterTahunAjaranId}
                onChange={(e) => setFilterTahunAjaranId(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                {tahunAjaranList.map((tahun) => (
                  <option key={tahun.id} value={tahun.id}>{tahun.label}</option>
                ))}
              </select>
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                <option value="GANJIL">Semester Ganjil</option>
                <option value="GENAP">Semester Genap</option>
              </select>
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                <option value="Semua">Semua Bulan</option>
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                <option value="Semua">Semua Status</option>
                <option value="HADIR">Hadir</option>
                <option value="TIDAK_HADIR">Tidak Hadir</option>
              </select>
              <select
                value={filterJenjang}
                onChange={(e) => setFilterJenjang(e.target.value)}
                className="flex-1 min-w-[150px] px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                <option value="Semua">Semua Jenjang</option>
                <option value="MTs">MTs</option>
                <option value="MA">MA</option>
              </select>
            </div>
          </div>

          {/* ─── Hero Stats ─── */}
          <div className="flex flex-wrap gap-4">
            {/* Circular Progress Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start gap-4 shadow-sm flex-1 min-w-[250px]">
              <div className="relative w-20 h-20 md:w-16 md:h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                  <path
                    className="text-[var(--surface-subtle)]"
                    strokeWidth="5.5"
                    stroke="currentColor"
                    fill="none"
                    d="M21 5 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
                  />
                  <path
                    className="text-primary"
                    strokeDasharray={`${data.stats.persentase}, 100`}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M21 5 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[13px] md:text-[12px] font-black text-[var(--text-primary)]">{data.stats.persentase}%</span>
                </div>
              </div>
              <div className="text-center md:text-left">
                <span className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Kehadiran</span>
                <p className="text-[11px] text-[var(--text-tertiary)]">{data.stats.totalHadir}/{data.stats.totalExpected} Sesi</p>
              </div>
            </div>

            {/* Stats Items */}
            <div className="flex flex-wrap gap-4 flex-[2]">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col shadow-sm flex-1 min-w-[140px]">
                <span className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Total Jadwal</span>
                <span className="text-[20px] font-black text-[var(--text-primary)]">{data.stats.totalExpected}</span>
              </div>
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex flex-col shadow-sm flex-1 min-w-[140px]">
                <span className="text-[12px] font-bold text-primary uppercase">Hadir</span>
                <span className="text-[20px] font-black text-primary">{data.stats.totalHadir}</span>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 flex flex-col shadow-sm flex-1 min-w-[140px]">
                <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400 uppercase">Tidak Hadir</span>
                <span className="text-[20px] font-black text-rose-600 dark:text-rose-400">{data.stats.totalTidakHadir}</span>
              </div>
            </div>
          </div>

          {/* ─── Data Table Section Using Reusable DataTable & Pagination ─── */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden relative">
            <div className="p-4 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex items-center justify-between gap-4">
              <span className="text-[12px] font-bold text-[var(--text-secondary)] uppercase">Data Kehadiran</span>
            </div>

            <DataTable
              loading={loading}
              data={data.details}
              headers={["Jadwal & Waktu", "Pelajaran", "Waktu Absen", "Status"]}
              minWidth="min-w-[700px]"
              emptyMessage="Tidak ada data kehadiran yang sesuai filter"
              emptyIcon={<CalendarDays size={36} className="mx-auto mb-3 opacity-50 text-[var(--text-tertiary)]" />}
              renderRow={(item) => {
                const Conf = getStatusConfig(item.status);
                const Icon = Conf.icon;
                const dateObj = new Date(item.tanggal);

                return (
                  <tr
                    key={`${item.jadwalId}-${item.tanggal}`}
                    className="hover:bg-[var(--surface-subtle)]/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedDetail(item)}
                  >
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors">
                          {item.namaHari}, {dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                        <span className="text-[11px] font-medium text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {item.jamMulai}-{item.jamSelesai} WIB
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">{item.mapel}</span>
                        <span className="text-[11px] font-medium text-[var(--text-tertiary)]">Kelas {item.kelas} {item.jenjang}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="text-[13px] font-bold text-[var(--text-primary)]">
                        {item.waktuAbsen ? new Date(item.waktuAbsen).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${Conf.bg} ${Conf.border} border rounded-[var(--radius-md)] ${Conf.color} text-[11px] font-bold`}>
                        <Icon size={12} /> {Conf.label}
                      </span>
                    </td>
                  </tr>
                );
              }}
              renderMobileCard={(item) => {
                const Conf = getStatusConfig(item.status);
                const Icon = Conf.icon;
                const dateObj = new Date(item.tanggal);

                return (
                  <div
                    key={`${item.jadwalId}-${item.tanggal}`}
                    onClick={() => setSelectedDetail(item)}
                    className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          {item.namaHari}, {dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {item.jamMulai} - {item.jamSelesai} WIB
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${Conf.bg} ${Conf.border} border rounded text-[10px] font-bold ${Conf.color}`}>
                        <Icon size={10} /> {Conf.label}
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)] flex justify-between">
                      <span>{item.mapel} (Kelas {item.kelas} {item.jenjang})</span>
                      <span className="font-semibold">Absen: {item.waktuAbsen ? new Date(item.waktuAbsen).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-"}</span>
                    </div>
                  </div>
                );
              }}
            />

            {/* Reusable Pagination Component */}
            <Pagination
              page={page}
              totalPages={data.pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
              total={data.pagination.totalItems}
              limit={limit}
            />
          </div>
        </>
      ) : null}

      {/* ─── Detail Modal ─── */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDetail(null)}></div>

          <div className="bg-[var(--surface)] w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">DETAIL KEHADIRAN</h3>
                <p className="text-[13px] font-medium text-primary flex items-center gap-1.5 mt-1">
                  <CalendarDays size={14} /> {selectedDetail.tanggal}
                </p>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="p-2 text-[var(--text-tertiary)] hover:bg-[var(--border)] rounded-md transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[12px] font-bold">1</div>
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)] tracking-wide">INFO JADWAL & ABSENSI</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-3">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-tertiary)] mb-1">
                      <CalendarDays size={14} /> Tanggal
                    </div>
                    <p className="font-bold text-[var(--text-primary)] text-[14px]">{selectedDetail.namaHari}, {selectedDetail.tanggal}</p>
                  </div>
                  <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-3">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-tertiary)] mb-1">
                      <Clock size={14} /> Waktu Jadwal
                    </div>
                    <p className="font-bold text-[var(--text-primary)] text-[14px]">{selectedDetail.jamMulai} - {selectedDetail.jamSelesai}</p>
                  </div>
                  <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-3">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-tertiary)] mb-1">
                      <BookOpen size={14} /> Mata Pelajaran
                    </div>
                    <p className="font-bold text-[var(--text-primary)] text-[14px]">{selectedDetail.mapel}</p>
                  </div>
                  <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-3">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-tertiary)] mb-1">
                      <Users size={14} /> Kelas
                    </div>
                    <p className="font-bold text-[var(--text-primary)] text-[14px]">{selectedDetail.kelas} ({selectedDetail.jenjang})</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
