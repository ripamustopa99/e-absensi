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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  const [data, setData] = useState<AdminRekapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Modal detail individual guru
  const [selectedGuru, setSelectedGuru] = useState<GuruStats | null>(null);
  const [guruDetailLoading, setGuruDetailLoading] = useState(false);
  const [guruDetailData, setGuruDetailData] = useState<TeacherDetailData | null>(null);

  // Edit teacher attendance state
  const [editingSlot, setEditingSlot] = useState<TeacherDetailSlot | null>(null);
  const [editStatus, setEditStatus] = useState<"HADIR" | "TIDAK_HADIR">("HADIR");
  const [savingEdit, setSavingEdit] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Tahun Ajaran List
  useEffect(() => {
    const fetchTa = async () => {
      try {
        const res = await api.get<{ data: TahunAjaranData[] }>("/tahun-ajaran");
        const list = res.data.data;
        setTahunAjaranList(list);
        const activeTa = list.find((t: TahunAjaranData) => t.isAktif) || list[0];
        if (activeTa) {
          setSelectedTahunAjaranId(activeTa.id);
          const startYear = new Date(activeTa.tanggalMulaiGanjil).getFullYear();
          setFilterTahun(String(startYear));
        }
      } catch (err) {
        console.error("Gagal memuat tahun ajaran", err);
      }
    };
    fetchTa();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("tahun", filterTahun);
      params.append("bulan", String(parseInt(filterBulan, 10)));
      params.append("page", String(page));
      params.append("limit", String(limit));
      if (selectedTahunAjaranId && selectedTahunAjaranId !== "ALL") {
        params.append("tahunAjaranId", selectedTahunAjaranId);
      }
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      const res = await api.get<{ success: true; data: AdminRekapData }>(`/absensi-guru/admin/rekap?${params.toString()}`);
      setData(res.data.data);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat rekap kehadiran guru");
    } finally {
      setLoading(false);
    }
  }, [filterTahun, filterBulan, selectedTahunAjaranId, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchGuruDetail = async (guru: GuruStats) => {
    setSelectedGuru(guru);
    setGuruDetailLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: TeacherDetailData }>(
        `/absensi-guru/admin/teacher/${guru.id}?tahun=${filterTahun}&bulan=${parseInt(filterBulan, 10)}`
      );
      setGuruDetailData(res.data.data);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat detail absensi guru");
    } finally {
      setGuruDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append("tahun", filterTahun);
      params.append("bulan", String(parseInt(filterBulan, 10)));
      if (selectedTahunAjaranId && selectedTahunAjaranId !== "ALL") {
        params.append("tahunAjaranId", selectedTahunAjaranId);
      }
      params.append("export", "true");

      const res = await api.get(`/absensi-guru/admin/rekap/export?${params.toString()}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Rekap_Kehadiran_Guru_${filterBulan}_${filterTahun}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Laporan berhasil diunduh");
    } catch (err) {
      toast.error("Gagal mengunduh laporan");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSlot) return;
    setSavingEdit(true);
    try {
      await api.put("/absensi-guru/admin/update", {
        jadwalId: editingSlot.jadwalId,
        tanggal: editingSlot.tanggal,
        status: editStatus,
      });
      toast.success("Absensi guru berhasil diperbarui");
      setEditingSlot(null);
      if (selectedGuru) {
        fetchGuruDetail(selectedGuru);
      }
      fetchData();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memperbarui absensi guru");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedTahunAjaranId("ALL");
    setFilterTahun(String(now.getFullYear()));
    setFilterBulan(String(now.getMonth() + 1).padStart(2, "0"));
    setSearchQuery("");
    setPage(1);
  };

  const desktopFilters = (
    <>
      <select
        value={selectedTahunAjaranId}
        onChange={(e) => {
          const val = e.target.value;
          setSelectedTahunAjaranId(val);
          const found = tahunAjaranList.find((t: TahunAjaranData) => t.id === val);
          if (found) {
            const y = new Date(found.tanggalMulaiGanjil).getFullYear();
            setFilterTahun(String(y));
          }
        }}
        className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-primary cursor-pointer shadow-sm"
      >
        <option value="ALL">Semua TA</option>
        {tahunAjaranList.map((t: TahunAjaranData) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
      <select 
        value={filterBulan}
        onChange={(e) => setFilterBulan(e.target.value)}
        className="px-3.5 py-2 bg-[var(--surface)] border border-primary/30 rounded-[var(--radius-md)] text-[13px] font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
      >
        {monthOptions.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran</label>
        <select
          value={selectedTahunAjaranId}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedTahunAjaranId(val);
            const found = tahunAjaranList.find((t: TahunAjaranData) => t.id === val);
            if (found) {
              const y = new Date(found.tanggalMulaiGanjil).getFullYear();
              setFilterTahun(String(y));
            }
          }}
          className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          <option value="ALL">Semua Tahun Ajaran</option>
          {tahunAjaranList.map((t: TahunAjaranData) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Bulan</label>
        <select
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ─── Header Section with Export Button on Top ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-[var(--radius-md)] text-primary">
              <BarChart3 size={24} />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
              Manajemen Kehadiran Guru
            </h1>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Data rekapitulasi kehadiran bulanan guru. Admin dapat melihat detail per orang dan mengedit absensi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} EXPORT EXCEL
        </button>
      </div>

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
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <ModuleToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Cari nama guru atau NIP..."
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={handleResetFilters}
        />

        <DataTable
          loading={loading}
          data={data?.gurus || []}
          headers={["Data Guru", "Total Jadwal", "Hadir", "Tidak Hadir", "% Kehadiran"]}
          minWidth="min-w-[850px]"
          emptyMessage="Tidak ada data guru yang ditemukan."
          emptyIcon={<Users size={36} className="mx-auto mb-3 opacity-50 text-[var(--text-tertiary)]" />}
          renderRow={(guru) => (
            <tr 
              key={guru.id} 
              onClick={() => fetchGuruDetail(guru)}
              className="hover:bg-[var(--surface-subtle)]/60 transition-colors cursor-pointer group"
            >
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[14px] shrink-0">
                    {guru.nama.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors truncate">{guru.nama}</p>
                    <p className="text-[11px] font-medium text-[var(--text-tertiary)] whitespace-nowrap">NIP/Kode: {guru.nip ?? '-'}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-3 text-center">
                <span className="text-[14px] font-bold text-[var(--text-primary)]">{guru.totalExpected}</span>
              </td>
              <td className="py-4 px-3 text-center">
                <span className="text-[14px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{guru.totalHadir}</span>
              </td>
              <td className="py-4 px-3 text-center">
                <span className="text-[14px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded">{guru.totalTidakHadir}</span>
              </td>
              <td className="py-4 px-5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-20 h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${guru.persentase >= 90 ? 'bg-primary' : guru.persentase >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${guru.persentase}%` }}
                    />
                  </div>
                  <span className="text-[13px] font-bold text-[var(--text-primary)] w-10">{guru.persentase}%</span>
                  <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:text-primary transition-colors" />
                </div>
              </td>
            </tr>
          )}
          renderMobileCard={(guru) => (
            <div 
              key={guru.id}
              onClick={() => fetchGuruDetail(guru)}
              className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[14px]">
                    {guru.nama.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">{guru.nama}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">NIP/Kode: {guru.nip ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Edit3 size={14} className="text-[var(--text-tertiary)]" />
                  <span className={`text-[12px] font-bold ${guru.persentase >= 90 ? 'text-primary' : guru.persentase >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {guru.persentase}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-[var(--border-subtle)] text-[12px]">
                <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                  <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Jadwal</p>
                  <p className="font-bold text-[var(--text-primary)]">{guru.totalExpected}</p>
                </div>
                <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                  <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Hadir</p>
                  <p className="font-bold text-primary">{guru.totalHadir}</p>
                </div>
                <div className="bg-[var(--surface-subtle)] p-1.5 rounded-lg">
                  <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Tidak Hadir</p>
                  <p className="font-bold text-rose-600">{guru.totalTidakHadir}</p>
                </div>
              </div>
            </div>
          )}
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

      {/* ─── Modal Detail & Edit Absensi Guru ─── */}
      {selectedGuru && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-subtle)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Detail Mengajar: {selectedGuru.nama}
                </h3>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  NIP/Kode: {selectedGuru.nip ?? '-'} | Bulan: {filterBulan}/{filterTahun}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuru(null)}
                className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {guruDetailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-primary" />
                </div>
              ) : guruDetailData?.details.length === 0 ? (
                <p className="text-center py-12 text-[13px] text-[var(--text-tertiary)]">
                  Tidak ada jadwal mengajar pada periode ini.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {guruDetailData?.details.map((slot, idx) => (
                    <div key={`${slot.jadwalId}-${slot.tanggal}-${idx}`} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          {new Date(slot.tanggal).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })} — <span className="text-primary">{slot.mapel}</span>
                        </p>
                        <p className="text-[12px] text-[var(--text-secondary)]">
                          Kelas: <strong className="text-[var(--text-primary)]">{slot.jenjang} {slot.kelas}</strong> | Jam: {slot.jamMulai} - {slot.jamSelesai}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${
                          slot.status === 'HADIR' ? 'bg-primary/10 text-primary' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>
                          {slot.status === 'HADIR' ? 'Hadir' : 'Tidak Hadir'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSlot(slot);
                            setEditStatus(slot.status);
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

      {/* ─── Sub-modal: Edit Teacher Attendance Slot ─── */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Edit Status Kehadiran Guru
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Tanggal: {editingSlot.tanggal} | Mapel: {editingSlot.mapel} ({editingSlot.kelas})
            </p>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Status Kehadiran
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "HADIR" | "TIDAK_HADIR")}
                className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="HADIR">Hadir</option>
                <option value="TIDAK_HADIR">Tidak Hadir</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
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
