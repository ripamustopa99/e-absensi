/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
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
import { AdminHeader } from "@/components/admin/AdminHeader";

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

  const fetchJadwalAndOptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("jenjang", jenjang);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (filterTA !== "ALL") params.set("tahunAjaranId", filterTA);
      if (filterTingkat !== "ALL") params.set("tingkat", filterTingkat);
      if (filterGuru !== "ALL") params.set("guruId", filterGuru);
      if (filterHari !== "ALL") params.set("hari", filterHari);

      const [resJadwal, resOptions] = await Promise.all([
        api.get<{ success: true; data: JadwalAdmin[]; total: number; totalPages: number }>(`/jadwal/admin?${params.toString()}`),
        options ? Promise.resolve(null) : api.get<{ success: true; data: FormOptions }>("/jadwal/admin/options")
      ]);

      setJadwalList(resJadwal.data.data);
      setTotal(resJadwal.data.total);
      setTotalPages(resJadwal.data.totalPages);

      if (resOptions) {
        setOptions(resOptions.data.data);
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat data jadwal");
    } finally {
      setLoading(false);
    }
  }, [jenjang, page, limit, search, filterTA, filterTingkat, filterGuru, filterHari, options]);

  useEffect(() => {
    fetchJadwalAndOptions();
  }, [fetchJadwalAndOptions]);

  const openAddModal = () => {
    setFormData(DEFAULT_FORM);
    setEditId(null);
    setConflictError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: JadwalAdmin) => {
    setFormData({
      guruId: item.guru?.id ?? "",
      mapelId: item.mapel?.id ?? "",
      jenjang: item.jenjang,
      semester: item.semester,
      tingkatList: item.tingkatList.map(t => t.tingkat),
      tahunAjaranId: item.tahunAjaran?.id ?? "",
      hari: item.hari,
      jamMulai: item.jamMulai,
      jamSelesai: item.jamSelesai,
    });
    setEditId(item.id);
    setConflictError(null);
    setIsModalOpen(true);
  };

  const handleImportJadwal = () => {
    setIsImportModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tahunAjaranId || !formData.mapelId || formData.tingkatList.length === 0) {
      toast.error("Mohon lengkapi Tahun Ajaran, Mata Pelajaran, dan minimal 1 Tingkat kelas");
      return;
    }

    setIsSubmitting(true);
    setConflictError(null);
    try {
      if (editId) {
        await api.put(`/jadwal/admin/${editId}`, formData);
        toast.success("Jadwal mengajar berhasil diperbarui!");
      } else {
        await api.post("/jadwal/admin", formData);
        toast.success("Jadwal mengajar berhasil ditambahkan!");
      }
      setIsModalOpen(false);
      fetchJadwalAndOptions();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      const msg = error.response?.data?.message ?? "Gagal menyimpan jadwal";
      setConflictError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/jadwal/admin/${deleteTarget.id}`);
      toast.success("Jadwal mengajar berhasil dihapus!");
      setDeleteTarget(null);
      fetchJadwalAndOptions();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal menghapus jadwal");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredJadwal = useMemo(() => jadwalList, [jadwalList]);

  const desktopFilters = (
    <div className="flex items-center gap-3">
      <select
        value={filterTA}
        onChange={(e) => setFilterTA(e.target.value)}
        className="px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Tahun Ajaran</option>
        {options?.tahunAjaran.map(ta => <option key={ta.id} value={ta.id}>{ta.label}</option>)}
      </select>

      <select
        value={filterTingkat}
        onChange={(e) => setFilterTingkat(e.target.value)}
        className="px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Tingkat</option>
        {availableTingkat.map(t => <option key={t} value={t}>Tingkat {t}</option>)}
      </select>

      <select
        value={filterGuru}
        onChange={(e) => setFilterGuru(e.target.value)}
        className="px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Guru</option>
        {options?.guru.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
      </select>

      <select
        value={filterHari}
        onChange={(e) => setFilterHari(e.target.value)}
        className="px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Hari</option>
        {Object.entries(HARI_MAP).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>
    </div>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran</label>
        <select value={filterTA} onChange={(e) => setFilterTA(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none">
          <option value="ALL">Semua Tahun Ajaran</option>
          {options?.tahunAjaran.map(ta => <option key={ta.id} value={ta.id}>{ta.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tingkat</label>
        <select value={filterTingkat} onChange={(e) => setFilterTingkat(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none">
          <option value="ALL">Semua Tingkat</option>
          {availableTingkat.map(t => <option key={t} value={t}>Tingkat {t}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Guru</label>
        <select value={filterGuru} onChange={(e) => setFilterGuru(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none">
          <option value="ALL">Semua Guru</option>
          {options?.guru.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Hari</label>
        <select value={filterHari} onChange={(e) => setFilterHari(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none">
          <option value="ALL">Semua Hari</option>
          {Object.entries(HARI_MAP).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <AdminHeader
        variant="jenjang"
        jenjang={jenjang}
        moduleLabel="Manajemen Jadwal"
        title={`Jadwal Mengajar ${jenjang}`}
        description={`Atur jadwal jam pelajaran guru dan tingkat kelas ${jenjang}.`}
        actions={
          <>
            <button
              onClick={handleImportJadwal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] transition-all shadow-sm flex-1 sm:w-auto cursor-pointer"
            >
              <CalendarDays size={16} />
              <span className="truncate">Import</span>
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-all shadow-sm flex-1 sm:w-auto cursor-pointer"
            >
              <Plus size={16} />
              <span className="truncate">Tambah</span>
            </button>
          </>
        }
      />

      {/* Main Card */}
      <div className="sm:bg-[var(--surface)] sm:border sm:border-[var(--border)] sm:rounded-2xl sm:shadow-sm sm:overflow-hidden bg-transparent border-0 shadow-none overflow-visible">
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
          alignments={["left", "left", "left", "left", "left", "right"]}
          minWidth="min-w-[1000px]"
          emptyMessage={`Belum ada jadwal ${jenjang} yang terdaftar.`}
          emptyIcon={<CalendarDays size={36} className="mx-auto mb-3 opacity-50" />}
          renderRow={(j, idx) => (
            <tr key={j.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors group">
              <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">{(page - 1) * limit + idx + 1}</td>
              <td className="py-4 px-5 whitespace-nowrap">
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
              <td className="py-4 px-5 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                  {j.tingkatList.map(t => (
                    <span key={t.tingkat} className="inline-flex px-2 py-1 rounded-[var(--radius-md)] text-[12px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200">
                      Tingkat {t.tingkat}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-4 px-5 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
                    <BookOpen size={14} />
                  </div>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">{j.mapel?.nama ?? "-"}</span>
                </div>
              </td>
              <td className="py-4 px-5 whitespace-nowrap">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Mata Pelajaran <span className="text-rose-500">*</span></label>
              <select
                value={formData.mapelId}
                onChange={(e) => setFormData(prev => ({ ...prev, mapelId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {options?.mapel.filter(m => m.jenjang === jenjang).map(m => (
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
                  <option key={g.id} value={g.id}>{g.nama} ({g.kodeAkses})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tingkat Kelas <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {availableTingkat.map(t => {
                const isSelected = formData.tingkatList.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        tingkatList: isSelected
                          ? prev.tingkatList.filter(item => item !== t)
                          : [...prev.tingkatList, t]
                      }));
                    }}
                    className={`py-2 px-3 rounded-[var(--radius-md)] border text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {isSelected ? <CheckSquare size={14}/> : <Square size={14}/>}
                    Tingkat {t}
                  </button>
                );
              })}
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 border border-[var(--border)] text-[var(--text-primary)] text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {editId ? "Simpan Perubahan" : "Tambah Jadwal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Import */}
      <ImportJadwalModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        jenjang={jenjang}
        onSuccess={() => {
          setIsImportModalOpen(false);
          fetchJadwalAndOptions();
        }}
      />

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Jadwal Mengajar"
        message={`Apakah Anda yakin ingin menghapus jadwal ${deleteTarget?.mapel?.nama ?? ""} pada hari ${deleteTarget?.namaHari ?? ""}?`}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function ImportJadwalModal({ isOpen, onClose, jenjang, onSuccess }: { isOpen: boolean; onClose: () => void; jenjang: string; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file excel/csv terlebih dahulu");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jenjang", jenjang);

    setLoading(true);
    try {
      const res = await api.post("/jadwal/admin/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(res.data.message || "Berhasil mengimport jadwal");
      onSuccess();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message || "Gagal import jadwal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Import Jadwal (${jenjang})`} description="Upload file excel/csv untuk import jadwal" maxWidth="md">
      <form onSubmit={handleImport} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">File Excel / CSV</label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-[13px] text-[var(--text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[12px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/25 cursor-pointer"
          />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl">Batal</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-xl flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin"/>} Import
          </button>
        </div>
      </form>
    </Modal>
  );
}
