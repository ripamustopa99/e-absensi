"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Clock,
  CalendarDays,
  Edit2,
  Trash2,
  BookOpen,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import type { AxiosError } from "axios";
import Modal from "@/components/shared/Modal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ModuleToolbar from "@/components/shared/ModuleToolbar";
import DataTable from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";

type JadwalAdmin = {
  id: string;
  hari: number;
  namaHari: string;
  jamMulai: string;
  jamSelesai: string;
  guru: { id: string; nama: string; kodeAkses: string } | null;
  mapel: { id: string; nama: string; jenjang: string };
  jenjang: string;
  semester: 'GANJIL' | 'GENAP';
  tingkatList: { tingkat: string }[];
  tahunAjaran: { id: string; label: string; isAktif: boolean };
};

type FormOptions = {
  guru: { id: string; nama: string; kodeAkses: string }[];
  mapel: { id: string; nama: string; jenjang: string }[];
  tahunAjaran: { id: string; label: string; isAktif: boolean }[];
  studentCounts?: { jenjang: string; tingkat: string; count: string | number }[];
};

type FormData = {
  guruId: string;
  mapelId: string;
  jenjang: string;
  semester: 'GANJIL' | 'GENAP';
  tingkatList: string[];
  tahunAjaranId: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
};

const HARI_MAP: Record<number, string> = {
  1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis", 5: "Jumat", 6: "Sabtu", 7: "Minggu"
};

interface JadwalManagementViewProps {
  jenjang: "MTS" | "MA";
}

export function JadwalManagementView({ jenjang }: JadwalManagementViewProps) {
  const DEFAULT_FORM: FormData = {
    guruId: "", mapelId: "", jenjang, semester: "GANJIL", tingkatList: [], tahunAjaranId: "", hari: 1, jamMulai: "07:00", jamSelesai: "08:30"
  };

  const [jadwalList, setJadwalList] = useState<JadwalAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [options, setOptions] = useState<FormOptions | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [filterTA, setFilterTA] = useState<string>("ALL");
  const [filterTingkat, setFilterTingkat] = useState<string>("ALL");
  const [filterGuru, setFilterGuru] = useState<string>("ALL");
  const [filterHari, setFilterHari] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<JadwalAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const availableTingkat = jenjang === "MTS" ? ["VII", "VIII", "IX"] : ["X", "XI", "XII"];

  useEffect(() => {
    setPage(1);
  }, [search, filterTA, filterTingkat, filterGuru, filterHari]);

  const fetchJadwal = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("jenjang", jenjang);
      if (filterTA !== "ALL") params.append("tahunAjaranId", filterTA);
      if (filterTingkat !== "ALL") params.append("tingkat", filterTingkat);
      if (filterGuru !== "ALL") params.append("guruId", filterGuru);
      if (filterHari !== "ALL") params.append("hari", filterHari);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const qs = params.toString();
      const res = await api.get<{ data: JadwalAdmin[], total: number, totalPages: number }>(`/jadwal/admin${qs ? `?${qs}` : ""}`);
      setJadwalList(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error("Gagal memuat jadwal");
    } finally {
      setLoading(false);
    }
  }, [jenjang, filterTA, filterTingkat, filterGuru, filterHari, page, limit]);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await api.get<{ data: FormOptions }>("/jadwal/admin/options");
      setOptions(res.data.data);

      const activeTa = res.data.data.tahunAjaran.find(t => t.isAktif);
      if (activeTa) {
        setFilterTA(activeTa.id);
      }
    } catch {
      toast.error("Gagal memuat opsi master data");
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    const timer = setTimeout(() => fetchJadwal(), 300);
    return () => clearTimeout(timer);
  }, [fetchJadwal]);

  const availableMapelForm = useMemo(() => {
    if (!options) return [];
    return options.mapel.filter(m => m.jenjang === jenjang);
  }, [options, jenjang]);

  const openAddModal = () => {
    setEditId(null);
    setConflictError(null);
    setFormData({
      ...DEFAULT_FORM,
      tahunAjaranId: filterTA !== "ALL" ? filterTA : (options?.tahunAjaran.find(t => t.isAktif)?.id ?? ""),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (jadwal: JadwalAdmin) => {
    setEditId(jadwal.id);
    setConflictError(null);
    setFormData({
      guruId: jadwal.guru?.id ?? "",
      mapelId: jadwal.mapel?.id ?? "",
      jenjang: jadwal.jenjang,
      semester: jadwal.semester as 'GANJIL' | 'GENAP',
      tingkatList: jadwal.tingkatList.map(t => t.tingkat),
      tahunAjaranId: jadwal.tahunAjaran?.id ?? "",
      hari: jadwal.hari,
      jamMulai: jadwal.jamMulai,
      jamSelesai: jadwal.jamSelesai,
    });

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guruId || !formData.mapelId || formData.tingkatList.length === 0 || !formData.tahunAjaranId) {
      toast.error("Semua field wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setConflictError(null);

    try {
      if (editId) {
        const res = await api.put<{ message: string; warning?: string }>(`/jadwal/admin/${editId}`, formData);
        if (res.data.warning) {
          setConflictError(res.data.warning);
          toast.warning(res.data.warning);
        } else {
          toast.success(res.data.message || "Jadwal berhasil diperbarui");
          setIsModalOpen(false);
          fetchJadwal();
        }
      } else {
        const res = await api.post<{ message: string; warning?: string }>("/jadwal/admin", formData);
        if (res.data.warning) {
          setConflictError(res.data.warning);
          toast.warning(res.data.warning);
        } else {
          toast.success(res.data.message || "Jadwal berhasil ditambahkan");
          setIsModalOpen(false);
          fetchJadwal();
        }
      }
    } catch (err) {
      const error = err as AxiosError<{ success: false; message: string }>;
      toast.error(error.response?.data?.message ?? "Terjadi kesalahan saat menyimpan jadwal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportJadwal = () => {
    setIsImportModalOpen(true);
  };

  const getStudentCount = (t: string) => {
    if (!options?.studentCounts) return 1;
    const found = options.studentCounts.find((sc: any) => sc.jenjang === jenjang && sc.tingkat === t);
    return found ? Number(found.count) : 0;
  };

  const toggleTingkat = (tingkat: string) => {
    const count = getStudentCount(tingkat);
    if (count === 0) {
      toast.error(`Tingkat ${tingkat} (${jenjang}) tidak dapat dipilih karena belum memiliki data siswa aktif.`);
      return;
    }
    setFormData(prev => ({
      ...prev,
      tingkatList: prev.tingkatList.includes(tingkat)
        ? prev.tingkatList.filter(t => t !== tingkat)
        : [...prev.tingkatList, tingkat]
    }));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/jadwal/admin/${deleteTarget.id}`);
      toast.success("Jadwal berhasil dihapus");
      setDeleteTarget(null);
      fetchJadwal();
    } catch (err) {
      const error = err as AxiosError<{ success: false; message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal menghapus jadwal");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredJadwal = useMemo(() => {
    if (!search) return jadwalList;
    const lower = search.toLowerCase();
    return jadwalList.filter(j => 
      j.mapel?.nama?.toLowerCase().includes(lower) ||
      (j.guru?.nama ?? "").toLowerCase().includes(lower) ||
      j.tingkatList.some(t => t.tingkat.toLowerCase().includes(lower))
    );
  }, [jadwalList, search]);

  const desktopFilters = (
    <>
      <select
        value={filterTA}
        onChange={(e) => setFilterTA(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Tahun Ajaran</option>
        {options?.tahunAjaran.map(ta => (
          <option key={ta.id} value={ta.id}>{ta.label}</option>
        ))}
      </select>

      <select
        value={filterTingkat}
        onChange={(e) => setFilterTingkat(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Tingkat</option>
        {availableTingkat.map(t => (
          <option key={t} value={t}>Tingkat {t}</option>
        ))}
      </select>

      <select
        value={filterGuru}
        onChange={(e) => setFilterGuru(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Guru</option>
        {options?.guru.map(g => (
          <option key={g.id} value={g.id}>{g.nama}</option>
        ))}
      </select>

      <select
        value={filterHari}
        onChange={(e) => setFilterHari(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Hari</option>
        {Object.entries(HARI_MAP).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
    </>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran</label>
        <select value={filterTA} onChange={(e) => setFilterTA(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer">
          <option value="ALL">Semua Tahun Ajaran</option>
          {options?.tahunAjaran.map(ta => <option key={ta.id} value={ta.id}>{ta.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tingkat</label>
        <select value={filterTingkat} onChange={(e) => setFilterTingkat(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer">
          <option value="ALL">Semua Tingkat</option>
          {availableTingkat.map(t => <option key={t} value={t}>Tingkat {t}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Guru</label>
        <select value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer">
          <option value="ALL">Semua Guru</option>
          {options?.guru.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Hari</label>
        <select value={filterHari} onChange={(e) => setFilterHari(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer">
          <option value="ALL">Semua Hari</option>
          {Object.entries(HARI_MAP).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-bold uppercase tracking-wider">
              Jenjang {jenjang}
            </span>
            <span className="text-[12px] text-[var(--text-tertiary)]">| Manajemen Jadwal</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1">
            Jadwal Mengajar {jenjang}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Atur jadwal jam pelajaran guru dan tingkat kelas {jenjang}.
          </p>
        </div>
        <div className="flex flex-row items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleImportJadwal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] transition-all shadow-sm flex-1 sm:w-auto"
          >
            <CalendarDays size={16} />
            <span className="truncate">Import</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-all shadow-sm flex-1 sm:w-auto"
          >
            <Plus size={16} />
            <span className="truncate">Tambah</span>
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Module Toolbar */}
        <ModuleToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Cari Mata Pelajaran atau Guru..."
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={() => {
            setFilterTA("ALL");
            setFilterTingkat("ALL");
            setFilterGuru("ALL");
            setFilterHari("ALL");
          }}
        />

        {/* DataTable */}
        <DataTable
          loading={loading}
          data={filteredJadwal}
          headers={["No", "Waktu (Hari & Jam)", "Tingkat", "Mata Pelajaran", "Guru Pengampu", "Aksi"]}
          minWidth="min-w-[900px]"
          emptyMessage={`Belum ada jadwal ${jenjang} yang terdaftar.`}
          emptyIcon={<CalendarDays size={36} className="mx-auto mb-3 opacity-50" />}
          renderRow={(j, idx) => (
            <tr key={j.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors group">
              <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">{(page - 1) * limit + idx + 1}</td>
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex w-[70px] text-[14px] font-bold text-[var(--text-primary)]">
                    {j.namaHari}
                  </span>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--border)]">
                    <Clock size={13} className="text-primary" />
                    {j.jamMulai} - {j.jamSelesai}
                  </div>
                </div>
              </td>
              <td className="py-4 px-5">
                <div className="flex flex-wrap gap-1">
                  {j.tingkatList.map(t => (
                    <span key={t.tingkat} className="inline-flex px-2 py-1 rounded-[var(--radius-md)] text-[12px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200">
                      Tingkat {t.tingkat}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-4 px-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
                    <BookOpen size={14} />
                  </div>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">{j.mapel?.nama ?? "-"}</span>
                </div>
              </td>
              <td className="py-4 px-5">
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{j.guru?.nama ?? "Belum ditentukan"}</span>
              </td>
              <td className="py-4 px-5 text-right">
                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(j)}
                    className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-primary rounded-md border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(j)}
                    className="p-2 text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-500 rounded-md border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )}
          renderMobileCard={(j) => (
            <div key={j.id} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[14px] font-bold text-[var(--text-primary)]">{j.mapel?.nama ?? "-"}</p>
                  <p className="text-[12px] text-[var(--text-secondary)]">{j.guru?.nama ?? "Belum ditentukan"}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(j)} className="p-2 text-primary hover:bg-primary/10 rounded-lg cursor-pointer"><Edit2 size={16}/></button>
                  <button onClick={() => setDeleteTarget(j)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 size={16}/></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] p-2 rounded-lg">
                <span>{j.namaHari}, {j.jamMulai}-{j.jamSelesai}</span>
                <span>{j.tingkatList.map(t => t.tingkat).join(', ')}</span>
              </div>
            </div>
          )}
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={limit} />
      </div>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? `Edit Jadwal Mengajar (${jenjang})` : `Tambah Jadwal Mengajar (${jenjang})`}
        description="Atur hari, jam, guru, dan mata pelajaran"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {conflictError && (
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-[12px] text-amber-700 dark:text-amber-400 font-medium">
              ⚠️ {conflictError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran <span className="text-rose-500">*</span></label>
              <select
                value={formData.tahunAjaranId}
                onChange={(e) => setFormData(prev => ({ ...prev, tahunAjaranId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="">-- Pilih Tahun Ajaran --</option>
                {options?.tahunAjaran.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Semester <span className="text-rose-500">*</span></label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value as 'GANJIL' | 'GENAP' }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="GANJIL">GANJIL</option>
                <option value="GENAP">GENAP</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tingkat Kelas ({jenjang}) <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
              {availableTingkat.map(t => {
                const count = getStudentCount(t);
                const hasNoStudents = count === 0;
                const checked = formData.tingkatList.includes(t);
                return (
                  <div
                    key={t}
                    onClick={() => {
                      if (hasNoStudents) {
                        toast.error(`Tingkat ${t} (${jenjang}) tidak dapat dipilih karena belum memiliki data siswa aktif.`);
                        return;
                      }
                      toggleTingkat(t);
                    }}
                    className={`px-3 py-2 rounded-lg border text-[12px] font-medium flex items-center justify-between gap-2 transition-all ${
                      hasNoStudents
                        ? "bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed opacity-60"
                        : checked
                        ? "text-white shadow-sm"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] hover:border-primary cursor-pointer"
                    }`}
                    style={!hasNoStudents && checked ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)" } : undefined}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {checked ? <CheckSquare size={14} className="shrink-0" /> : <Square size={14} className="shrink-0 opacity-50" />}
                      <span className="truncate">Tingkat {t}</span>
                    </div>
                    {hasNoStudents && (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">
                        Belum ada siswa
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Mata Pelajaran ({jenjang}) <span className="text-rose-500">*</span></label>
              <select
                value={formData.mapelId}
                onChange={(e) => setFormData(prev => ({ ...prev, mapelId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="">-- Pilih Mapel --</option>
                {availableMapelForm.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Guru Pengampu <span className="text-rose-500">*</span></label>
              <select
                value={formData.guruId}
                onChange={(e) => setFormData(prev => ({ ...prev, guruId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="">-- Pilih Guru --</option>
                {options?.guru.map(g => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Hari <span className="text-rose-500">*</span></label>
              <select
                value={formData.hari}
                onChange={(e) => setFormData(prev => ({ ...prev, hari: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer"
              >
                {Object.entries(HARI_MAP).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Jam Mulai <span className="text-rose-500">*</span></label>
              <input
                type="time"
                value={formData.jamMulai}
                onChange={(e) => setFormData(prev => ({ ...prev, jamMulai: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Jam Selesai <span className="text-rose-500">*</span></label>
              <input
                type="time"
                value={formData.jamSelesai}
                onChange={(e) => setFormData(prev => ({ ...prev, jamSelesai: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-[13px] font-bold text-[var(--text-secondary)] bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-white text-[13px] font-bold rounded-[var(--radius-md)] disabled:opacity-60 flex items-center gap-2"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {editId ? "Perbarui Jadwal" : "Simpan Jadwal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Jadwal"
        description="Salin data jadwal dari tahun ajaran sebelumnya"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran Sumber</label>
            <select id="sourceTA" className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none">
              <option value="">-- Pilih Tahun Ajaran Sumber --</option>
              {options?.tahunAjaran.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2.5 text-[13px] font-bold border border-[var(--border)] rounded-[var(--radius-md)]">Batal</button>
            <button 
              onClick={async () => {
                const sourceTA = (document.getElementById('sourceTA') as HTMLSelectElement).value;
                if (!sourceTA) { toast.error("Pilih tahun ajaran sumber"); return; }
                try {
                  await api.post("/jadwal/admin/import", { sourceTahunAjaranId: sourceTA, targetTahunAjaranId: filterTA });
                  toast.success("Jadwal berhasil diimpor");
                  setIsImportModalOpen(false);
                  fetchJadwal();
                } catch (err) {
                  toast.error("Gagal mengimpor jadwal");
                }
              }}
              className="px-5 py-2.5 text-white text-[13px] font-bold rounded-[var(--radius-md)]"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Import
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Jadwal?"
        message={`Yakin ingin menghapus jadwal ${deleteTarget?.mapel.nama} (Tingkat ${deleteTarget?.tingkatList.map(t => t.tingkat).join(', ')})?`}
        isDeleting={isDeleting}
        confirmText="Ya, Hapus"
      />
    </div>
  );
}
