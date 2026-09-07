/* eslint-disable */
"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Users, Download,
  CheckCircle2, Clock, AlertTriangle,
  BarChart3, Loader2, X, Edit3, ChevronRight
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import ModuleToolbar from "@/components/shared/ModuleToolbar";
import DataTable from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";
import { AdminHeader } from "@/components/admin/AdminHeader";

type TahunAjaranData = {
  id: string;
  label: string;
  isAktif: boolean;
  tanggalMulaiGanjil: string;
};

type GuruStats = {
  id: string;
  nip: string | null;
  nama: string;
  jabatan: string | null;
  totalExpected: number;
  totalHadir: number;
  totalTidakHadir: number;
  persentase: number;
};

type AdminRekapData = {
  tahun: number;
  bulan: number;
  summary: {
    totalGuru: number;
    totalExpected: number;
    totalHadir: number;
    totalTidakHadir: number;
    avgPersentase: number;
  };
  gurus: GuruStats[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type TeacherDetailSlot = {
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

type TeacherDetailData = {
  tahun: number;
  bulan: number;
  stats: {
    totalExpected: number;
    totalHadir: number;
    totalTidakHadir: number;
    persentase: number;
  };
  details: TeacherDetailSlot[];
};

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

export default function AdminRekapKehadiranGuruPage() {
  const now = new Date();
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaranData[]>([]);
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<string>("ALL");
  const [filterTahun, setFilterTahun] = useState(String(now.getFullYear()));
  const [filterBulan, setFilterBulan] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [data, setData] = useState<AdminRekapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Detail Modal State
  const [selectedGuru, setSelectedGuru] = useState<GuruStats | null>(null);
  const [detailData, setDetailData] = useState<TeacherDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit Absensi State
  const [editingSlot, setEditingSlot] = useState<TeacherDetailSlot | null>(null);
  const [editStatus, setEditStatus] = useState<"HADIR" | "TIDAK_HADIR">("HADIR");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchTahunAjaran = async () => {
    try {
      const res = await api.get<{ data: TahunAjaranData[] }>("/tahun-ajaran");
      const list = res.data.data || [];
      setTahunAjaranList(list);
      const aktif = list.find((t) => t.isAktif);
      if (aktif) {
        setSelectedTahunAjaranId(aktif.id);
      }
    } catch (err) {
      console.error("Gagal memuat tahun ajaran:", err);
    }
  };

  useEffect(() => {
    fetchTahunAjaran();
  }, []);

  const fetchRekap = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTahunAjaranId && selectedTahunAjaranId !== "ALL") {
        params.set("tahunAjaranId", selectedTahunAjaranId);
      }
      params.set("tahun", filterTahun);
      params.set("bulan", filterBulan);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);

      const res = await api.get<{ success: true; data: AdminRekapData }>(`/absensi-guru/admin/rekap?${params.toString()}`);
      setData(res.data.data);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat rekap kehadiran guru");
    } finally {
      setLoading(false);
    }
  }, [selectedTahunAjaranId, filterTahun, filterBulan, page, limit, search]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedTahunAjaranId && selectedTahunAjaranId !== "ALL") {
        params.set("tahunAjaranId", selectedTahunAjaranId);
      }
      params.set("tahun", filterTahun);
      params.set("bulan", filterBulan);

      const response = await api.get(`/absensi-guru/admin/rekap/export?${params.toString()}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Rekap_Kehadiran_Guru_${filterBulan}_${filterTahun}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("File rekap guru berhasil di-export!");
    } catch (err) {
      toast.error("Gagal mengexport data rekap guru");
    } finally {
      setExporting(false);
    }
  };

  const handleOpenDetail = async (guru: GuruStats) => {
    setSelectedGuru(guru);
    setLoadingDetail(true);
    try {
      const params = new URLSearchParams();
      params.set("tahun", filterTahun);
      params.set("bulan", filterBulan);
      if (selectedTahunAjaranId && selectedTahunAjaranId !== "ALL") {
        params.set("tahunAjaranId", selectedTahunAjaranId);
      }
      const res = await api.get<{ success: true; data: TeacherDetailData }>(`/absensi-guru/admin/teacher/${guru.id}?${params.toString()}`);
      setDetailData(res.data.data);
    } catch (err) {
      toast.error("Gagal memuat detail kehadiran guru");
      setSelectedGuru(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveEditAbsensi = async () => {
    if (!selectedGuru || !editingSlot) return;
    setIsSavingEdit(true);
    try {
      await api.put("/absensi-guru/admin/update", {
        guruId: selectedGuru.id,
        jadwalId: editingSlot.jadwalId,
        tanggal: editingSlot.tanggal,
        status: editStatus,
      });
      toast.success("Status absensi guru berhasil diperbarui!");
      setEditingSlot(null);
      // Refresh detail and rekap
      handleOpenDetail(selectedGuru);
      fetchRekap();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memperbarui absensi");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const desktopFilters = (
    <div className="flex items-center gap-3">
      <select
        value={selectedTahunAjaranId}
        onChange={(e) => {
          setSelectedTahunAjaranId(e.target.value);
          setPage(1);
        }}
        className="px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Tahun Ajaran</option>
        {tahunAjaranList.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label} {t.isAktif ? "(Aktif)" : ""}
          </option>
        ))}
      </select>

      <select
        value={filterTahun}
        onChange={(e) => {
          setFilterTahun(e.target.value);
          setPage(1);
        }}
        className="px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        {[2024, 2025, 2026, 2027].map((y) => (
          <option key={y} value={y}>
            Tahun {y}
          </option>
        ))}
      </select>

      <select
        value={filterBulan}
        onChange={(e) => {
          setFilterBulan(e.target.value);
          setPage(1);
        }}
        className="px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        {monthOptions.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran</label>
        <select
          value={selectedTahunAjaranId}
          onChange={(e) => {
            setSelectedTahunAjaranId(e.target.value);
            setPage(1);
          }}
          className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Tahun Ajaran</option>
          {tahunAjaranList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} {t.isAktif ? "(Aktif)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun</label>
        <select
          value={filterTahun}
          onChange={(e) => {
            setFilterTahun(e.target.value);
            setPage(1);
          }}
          className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              Tahun {y}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Bulan</label>
        <select
          value={filterBulan}
          onChange={(e) => {
            setFilterBulan(e.target.value);
            setPage(1);
          }}
          className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ─── Header Section ─── */}
      <AdminHeader
        variant="icon"
        icon={BarChart3}
        title="Manajemen Kehadiran Guru"
        description="Data rekapitulasi kehadiran bulanan guru. Admin dapat melihat detail per orang dan mengedit absensi."
        actions={
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} EXPORT EXCEL
          </button>
        }
      />

      {/* ─── Summary Cards ─── */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Users size={15} /></div>
              <span className="text-[12px] font-bold text-[var(--text-secondary)]">Total Guru</span>
            </div>
            <p className="text-xl font-black text-[var(--text-primary)]">{data.summary.totalGuru}<span className="text-[11px] font-medium text-[var(--text-tertiary)] ml-1">orang</span></p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><CheckCircle2 size={15} /></div>
              <span className="text-[12px] font-bold text-[var(--text-secondary)]">Rata-rata Hadir</span>
            </div>
            <p className="text-xl font-black text-primary">{data.summary.avgPersentase}%</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center"><Clock size={15} /></div>
              <span className="text-[12px] font-bold text-[var(--text-secondary)]">Total Jadwal</span>
            </div>
            <p className="text-xl font-black text-amber-500">{data.summary.totalExpected}<span className="text-[11px] font-medium text-[var(--text-tertiary)] ml-1">sesi</span></p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center"><AlertTriangle size={15} /></div>
              <span className="text-[12px] font-bold text-[var(--text-secondary)]">Tidak Hadir</span>
            </div>
            <p className="text-xl font-black text-rose-500">{data.summary.totalTidakHadir}<span className="text-[11px] font-medium text-[var(--text-tertiary)] ml-1">sesi</span></p>
          </div>
        </div>
      )}

      {/* ─── Data Table Card with ModuleToolbar, DataTable, and Pagination ─── */}
      <div className="sm:bg-[var(--surface)] sm:border sm:border-[var(--border)] sm:rounded-2xl sm:shadow-sm sm:overflow-hidden bg-transparent border-0 shadow-none overflow-visible">
        <ModuleToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Cari Nama Guru atau Jabatan..."
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={() => {
            setSelectedTahunAjaranId("ALL");
            setFilterTahun(String(now.getFullYear()));
            setFilterBulan(String(now.getMonth() + 1).padStart(2, "0"));
            setSearch("");
            setPage(1);
          }}
        />

        <DataTable
          loading={loading}
          data={data?.gurus ?? []}
          headers={["No", "Nama Guru & NIP", "Jabatan", "Hadir Sesi", "Tidak Hadir", "Persentase", "Aksi"]}
          minWidth="min-w-[900px]"
          emptyMessage="Tidak ada data rekap kehadiran guru pada periode ini."
          emptyIcon={<Users size={36} className="mx-auto mb-3 opacity-50" />}
          renderRow={(guru, idx) => {
            const rowNum = (page - 1) * limit + idx + 1;
            return (
              <tr key={guru.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">{rowNum}</td>
                <td className="py-4 px-5">
                  <p className="text-[14px] font-bold text-[var(--text-primary)]">{guru.nama}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">NIP: {guru.nip ?? "—"}</p>
                </td>
                <td className="py-4 px-5">
                  <span className="text-[13px] text-[var(--text-primary)] font-medium">{guru.jabatan ?? "Pengajar"}</span>
                </td>
                <td className="py-4 px-5">
                  <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                    {guru.totalHadir} <span className="text-[11px] font-normal text-[var(--text-tertiary)]">/ {guru.totalExpected}</span>
                  </span>
                </td>
                <td className="py-4 px-5">
                  <span className="text-[13px] font-bold text-rose-600 dark:text-rose-400">
                    {guru.totalTidakHadir}
                  </span>
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border)]">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${guru.persentase}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-[var(--text-primary)]">
                      {guru.persentase}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-5 text-right">
                  <button
                    onClick={() => handleOpenDetail(guru)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[12px] font-bold rounded-[var(--radius-md)] transition-colors cursor-pointer"
                  >
                    Detail <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            );
          }}
          renderMobileCard={(guru, idx) => {
            const rowNum = (page - 1) * limit + idx + 1;
            return (
              <div key={guru.id} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)]">#{rowNum}</span>
                    <p className="text-[14px] font-bold text-[var(--text-primary)] mt-0.5">{guru.nama}</p>
                    <p className="text-[12px] text-[var(--text-secondary)]">{guru.jabatan ?? "Pengajar"} &bull; NIP: {guru.nip ?? "—"}</p>
                  </div>
                  <button
                    onClick={() => handleOpenDetail(guru)}
                    className="px-3 py-1.5 bg-primary/10 text-primary text-[12px] font-bold rounded-lg"
                  >
                    Detail
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[12px]">
                  <span className="text-[var(--text-secondary)]">
                    Hadir: <strong className="text-emerald-600 dark:text-emerald-400">{guru.totalHadir}/{guru.totalExpected}</strong>
                  </span>
                  <span className="font-bold text-primary">{guru.persentase}%</span>
                </div>
              </div>
            );
          }}
        />

        {data?.pagination && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.totalItems}
            limit={limit}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedGuru && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-subtle)]">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Detail Kehadiran: {selectedGuru.nama}
                </h3>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Periode: {monthOptions.find(m => m.value === filterBulan)?.label} {filterTahun}
                </p>
              </div>
              <button
                onClick={() => setSelectedGuru(null)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-primary" />
                </div>
              ) : !detailData ? (
                <p className="text-center py-10 text-[var(--text-tertiary)] text-[13px]">Gagal memuat detail kehadiran.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Total Jadwal</span>
                      <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{detailData.stats.totalExpected}</p>
                    </div>
                    <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Hadir</span>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{detailData.stats.totalHadir}</p>
                    </div>
                    <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Tidak Hadir</span>
                      <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{detailData.stats.totalTidakHadir}</p>
                    </div>
                    <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Persentase</span>
                      <p className="text-xl font-black text-primary mt-0.5">{detailData.stats.persentase}%</p>
                    </div>
                  </div>

                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                      <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Riwayat Sesi Mengajar</h4>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                      {detailData.details.length === 0 ? (
                        <p className="text-center py-8 text-[12px] text-[var(--text-tertiary)]">Tidak ada sesi mengajar pada periode ini.</p>
                      ) : (
                        detailData.details.map((slot, idx) => (
                          <div key={idx} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[var(--surface-subtle)]/50 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold text-[var(--text-primary)]">
                                  {new Date(slot.tanggal + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
                                </span>
                                <span className="text-[11px] text-[var(--text-tertiary)]">({slot.namaHari}, {slot.jamMulai} - {slot.jamSelesai})</span>
                              </div>
                              <p className="text-[12px] font-semibold text-[var(--text-secondary)] mt-0.5">
                                {slot.mapel} &bull; Kelas {slot.kelas} ({slot.jenjang})
                              </p>
                              {slot.waktuAbsen && (
                                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                                  Absen pada: {new Date(slot.waktuAbsen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} WIB
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  slot.status === "HADIR"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                }`}
                              >
                                {slot.status === "HADIR" ? "Hadir" : "Tidak Hadir"}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingSlot(slot);
                                  setEditStatus(slot.status === "HADIR" ? "HADIR" : "TIDAK_HADIR");
                                }}
                                className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors cursor-pointer"
                                title="Edit Status Absensi"
                              >
                                <Edit3 size={15} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex justify-end">
              <button
                onClick={() => setSelectedGuru(null)}
                className="px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Absensi Modal ─── */}
      {editingSlot && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Edit Status Kehadiran</h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Ubah status kehadiran untuk mapel <strong className="text-[var(--text-primary)]">{editingSlot.mapel}</strong> pada tanggal {editingSlot.tanggal}.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status Absensi</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "HADIR" | "TIDAK_HADIR")}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="HADIR">Hadir / Tepat Waktu</option>
                <option value="TIDAK_HADIR">Tidak Hadir / Alpa</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEditAbsensi}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSavingEdit && <Loader2 size={14} className="animate-spin" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
