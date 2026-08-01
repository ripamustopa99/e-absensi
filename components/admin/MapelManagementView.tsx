"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Loader2,
  CalendarDays,
  Copy,
  CheckSquare,
  Square,
} from "lucide-react";
import Pagination from "@/components/shared/Pagination";
import Modal from "@/components/shared/Modal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ModuleToolbar from "@/components/shared/ModuleToolbar";
import DataTable from "@/components/shared/DataTable";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AxiosError } from "axios";

type MapelData = {
  id: string;
  nama: string;
  jenjang: "MA" | "MTS";
  kurikulum: string[];
  tingkat: string[];
  isAktif: boolean;
  _count: { guru: number; jadwal: number };
};

type MapelFormData = {
  nama: string;
  jenjang: "MA" | "MTS";
  kurikulum: string;
  tingkat: string[];
  isAktif: boolean;
};

type ApiError = { success: false; message: string };

interface MapelManagementViewProps {
  jenjang: "MA" | "MTS";
}

export function MapelManagementView({ jenjang }: MapelManagementViewProps) {
  const TINGKAT_LIST = jenjang === "MA" ? ["X", "XI", "XII"] : ["VII", "VIII", "IX"];

  const [mapelList, setMapelList] = useState<MapelData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterKurikulum, setFilterKurikulum] = useState("ALL");
  const [filterTingkat, setFilterTingkat] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("true");

  const [kurikulums, setKurikulums] = useState<string[]>(["Kurikulum Merdeka", "Kurikulum 2013"]);
  const [isCustomKurikulum, setIsCustomKurikulum] = useState(false);
  const [isImportCustomTarget, setIsImportCustomTarget] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MapelFormData>({
    nama: "",
    jenjang: jenjang,
    kurikulum: "Kurikulum Merdeka",
    tingkat: [],
    isAktif: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Import / Relasi Kurikulum modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    sourceKurikulum: "",
    targetKurikulum: "Kurikulum Merdeka",
  });
  const [sourceMapelOptions, setSourceMapelOptions] = useState<MapelData[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<MapelData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterKurikulum, filterTingkat, filterStatus]);

  const fetchMapel = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("jenjang", jenjang);
      if (searchQuery) params.append("search", searchQuery);
      if (filterKurikulum !== "ALL") params.append("kurikulum", filterKurikulum);
      if (filterTingkat !== "ALL") params.append("tingkat", filterTingkat);
      if (filterStatus !== "ALL") params.append("isAktif", filterStatus);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await api.get<{
        data: MapelData[];
        total: number;
        totalPages: number;
      }>(`/mapel?${params.toString()}`);
      setMapelList(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages || 1);

      const kSet = new Set<string>(["Kurikulum Merdeka", "Kurikulum 2013"]);
      res.data.data.forEach((m) => {
        if (m.kurikulum && Array.isArray(m.kurikulum)) {
          m.kurikulum.forEach((k) => kSet.add(k));
        } else if (typeof m.kurikulum === "string") {
          kSet.add(m.kurikulum);
        }
      });
      const kArr = Array.from(kSet);
      setKurikulums(kArr);
    } catch (e) {
      toast.error(`Gagal memuat data mata pelajaran ${jenjang}`);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterKurikulum, filterTingkat, filterStatus, page, limit, jenjang]);

  useEffect(() => {
    const timer = setTimeout(() => fetchMapel(), 300);
    return () => clearTimeout(timer);
  }, [fetchMapel]);

  const openCreateModal = () => {
    const latestK = kurikulums.length > 0 ? kurikulums[kurikulums.length - 1] : "Kurikulum Merdeka";
    setFormData({
      nama: "",
      jenjang: jenjang,
      kurikulum: latestK,
      tingkat: [],
      isAktif: true,
    });
    setIsCustomKurikulum(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MapelData) => {
    setFormData({
      nama: item.nama,
      jenjang: jenjang,
      kurikulum: Array.isArray(item.kurikulum) ? item.kurikulum[0] || "Kurikulum Merdeka" : item.kurikulum,
      tingkat: item.tingkat ?? [],
      isAktif: item.isAktif,
    });
    setIsCustomKurikulum(!kurikulums.includes(Array.isArray(item.kurikulum) ? item.kurikulum[0] : item.kurikulum));
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.kurikulum) {
      toast.error("Mohon isi Nama Mapel dan Kurikulum");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/mapel/${editingId}`, formData);
        toast.success(`Mata pelajaran ${jenjang} berhasil diperbarui`);
      } else {
        await api.post("/mapel", formData);
        toast.success(`Mata pelajaran ${jenjang} baru berhasil ditambahkan`);
      }
      setIsModalOpen(false);
      fetchMapel();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: MapelData) => {
    const prev = item.isAktif;
    setMapelList((list) => list.map((m) => (m.id === item.id ? { ...m, isAktif: !prev } : m)));
    try {
      await api.patch(`/mapel/${item.id}/status`);
      toast.success("Status mapel berhasil diubah");
    } catch (err) {
      setMapelList((list) => list.map((m) => (m.id === item.id ? { ...m, isAktif: prev } : m)));
      toast.error("Gagal mengubah status mapel");
    }
  };

  const openImportModal = async () => {
    try {
      const res = await api.get<{ data: MapelData[] }>(`/mapel?jenjang=${jenjang}&limit=100`);
      setSourceMapelOptions(res.data.data);
      setSelectedImportIds([]);
      if (kurikulums.length > 0) {
        setImportForm({
          sourceKurikulum: kurikulums[0],
          targetKurikulum: kurikulums[kurikulums.length - 1] || "Kurikulum Merdeka",
        });
      }
      setIsImportModalOpen(true);
    } catch {
      toast.error("Gagal memuat sumber kurikulum");
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.sourceKurikulum || !importForm.targetKurikulum) {
      toast.error("Pilih kurikulum sumber dan tujuan");
      return;
    }
    if (importForm.sourceKurikulum === importForm.targetKurikulum) {
      toast.error("Kurikulum sumber dan tujuan tidak boleh sama");
      return;
    }
    if (selectedImportIds.length === 0) {
      toast.error("Pilih minimal satu mata pelajaran untuk diambil");
      return;
    }

    setIsImporting(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>("/mapel/import", {
        sourceKurikulum: importForm.sourceKurikulum,
        targetKurikulum: importForm.targetKurikulum,
        mapelIds: selectedImportIds,
        jenjang: jenjang,
      });
      toast.success(res.data.message || "Berhasil mengambil mata pelajaran!");
      setIsImportModalOpen(false);
      fetchMapel();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal mengambil mata pelajaran");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/mapel/${deleteTarget.id}`);
      toast.success(`"${deleteTarget.nama}" berhasil dihapus`);
      setDeleteTarget(null);
      fetchMapel();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal menghapus mapel");
    } finally {
      setIsDeleting(false);
    }
  };

  const desktopFilters = (
    <>
      <select
        value={filterKurikulum}
        onChange={(e) => setFilterKurikulum(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="ALL">Semua Kurikulum</option>
        {kurikulums.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <select
        value={filterTingkat}
        onChange={(e) => setFilterTingkat(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="ALL">Semua Tingkat</option>
        {TINGKAT_LIST.map((t) => <option key={t} value={t}>Tingkat {t}</option>)}
      </select>
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="ALL">Semua Status</option>
        <option value="true">Aktif</option>
        <option value="false">Nonaktif</option>
      </select>
    </>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Kurikulum
        </label>
        <select
          value={filterKurikulum}
          onChange={(e) => setFilterKurikulum(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Kurikulum</option>
          {kurikulums.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Tingkat
        </label>
        <select
          value={filterTingkat}
          onChange={(e) => setFilterTingkat(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Tingkat</option>
          {TINGKAT_LIST.map((t) => (
            <option key={t} value={t}>
              Tingkat {t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Status
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Mata Pelajaran {jenjang === "MA" ? "Madrasah Aliyah" : "Madrasah Tsanawiyah"} ({jenjang})
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Kelola kurikulum dan tingkat mata pelajaran · <span className="font-semibold">{total}</span> mapel terdaftar
          </p>
        </div>
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
          <button
            onClick={openImportModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] transition-all shadow-sm flex-1 sm:w-auto"
          >
            <Copy size={16} /> <span className="truncate">Ambil Mapel</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-all shadow-sm flex-1 sm:w-auto"
          >
            <Plus size={16} /> <span className="truncate">Tambah Mapel {jenjang}</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Module Toolbar */}
        <ModuleToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={`Cari Nama Mata Pelajaran ${jenjang}...`}
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={() => {
            setFilterKurikulum("ALL");
            setFilterTingkat("ALL");
            setFilterStatus("ALL");
          }}
        />

        {/* DataTable */}
        <DataTable
          loading={isLoading}
          data={mapelList}
          headers={["No", "Mata Pelajaran", "Kurikulum & Tingkat", "Pengampu", "Jadwal", "Status", "Aksi"]}
          minWidth="min-w-[750px]"
          emptyMessage="Tidak ada data ditemukan."
          emptyIcon={<BookOpen size={36} className="mx-auto mb-3 opacity-50" />}
          renderRow={(item, idx) => (
            <tr key={item.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors group">
              <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">{(page - 1) * limit + idx + 1}</td>
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">{item.nama}</span>
                </div>
              </td>
              <td className="py-4 px-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)]">{Array.isArray(item.kurikulum) ? item.kurikulum.join(", ") : item.kurikulum}</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">{item.tingkat?.length > 0 ? `Tingkat ${item.tingkat.join(", ")}` : "Semua Tingkat"}</span>
                </div>
              </td>
              <td className="py-4 px-5 text-center">
                <span className="text-[13px] font-bold text-[var(--text-primary)]">{item._count.guru}</span>
                <span className="text-[11px] text-[var(--text-tertiary)] ml-1">guru</span>
              </td>
              <td className="py-4 px-5 text-center">
                <div className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--text-primary)]">
                  <CalendarDays size={14} className="text-[var(--text-tertiary)]" />
                  {item._count.jadwal}
                </div>
              </td>
              <td className="py-4 px-5 text-center">
                <button
                  onClick={() => handleToggleStatus(item)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all hover:opacity-80 border ${item.isAktif ? "bg-primary/10 text-primary border-primary/20" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${item.isAktif ? "bg-primary" : "bg-rose-500"}`} />
                  {item.isAktif ? "Aktif" : "Nonaktif"}
                </button>
              </td>
              <td className="py-4 px-5 text-right">
                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(item)} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-primary rounded-md border border-transparent hover:border-primary/20 transition-all" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} className="p-2 text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-500 rounded-md border border-transparent hover:border-rose-200 transition-all" title="Hapus">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )}
          renderMobileCard={(item) => (
            <div key={item.id} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">{item.nama}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">{Array.isArray(item.kurikulum) ? item.kurikulum.join(", ") : item.kurikulum}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(item)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md"><Edit2 size={14}/></button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] p-2 rounded-lg">
                <span>Tingkat: {item.tingkat?.join(", ") || "Semua"}</span>
                <button
                  onClick={() => handleToggleStatus(item)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.isAktif ? "bg-primary/10 text-primary border-primary/20" : "bg-rose-50 text-rose-600 border-rose-200"}`}
                >
                  {item.isAktif ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>
          )}
        />

        {!isLoading && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={limit} />}
      </div>

      {/* Ambil Mapel dari Kurikulum Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => !isImporting && setIsImportModalOpen(false)}
          title="Ambil Mapel dari Kurikulum Lain"
          description="Pilih kurikulum sumber dan centang mata pelajaran yang ingin dihubungkan (direlasikan) ke kurikulum tujuan tanpa menduplikasi data."
          maxWidth="lg"
        >
          <form onSubmit={handleImportSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Kurikulum Sumber
                </label>
                <select
                  value={importForm.sourceKurikulum}
                  onChange={(e) =>
                    setImportForm({
                      ...importForm,
                      sourceKurikulum: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="">-- Pilih Sumber --</option>
                  {kurikulums.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Kurikulum Tujuan
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setIsImportCustomTarget(!isImportCustomTarget)
                    }
                    className="text-[11px] text-primary font-bold hover:underline"
                  >
                    {isImportCustomTarget
                      ? "Pilih dari Daftar"
                      : "+ Ketik Baru"}
                  </button>
                </div>
                {isImportCustomTarget ? (
                  <input
                    type="text"
                    required
                    value={importForm.targetKurikulum}
                    onChange={(e) =>
                      setImportForm({
                        ...importForm,
                        targetKurikulum: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)]"
                    placeholder="Kurikulum Baru"
                  />
                ) : (
                  <select
                    value={importForm.targetKurikulum}
                    onChange={(e) =>
                      setImportForm({
                        ...importForm,
                        targetKurikulum: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] cursor-pointer"
                  >
                    {kurikulums.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                Pilih Mata Pelajaran dari "{importForm.sourceKurikulum || "Kurikulum Sumber"}"
              </label>
              <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] max-h-56 overflow-y-auto p-1">
                {sourceMapelOptions
                  .filter(
                    (m) =>
                      !importForm.sourceKurikulum ||
                      (Array.isArray(m.kurikulum)
                        ? m.kurikulum.includes(importForm.sourceKurikulum)
                        : m.kurikulum === importForm.sourceKurikulum),
                  )
                  .map((m) => {
                    const checked = selectedImportIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() =>
                          setSelectedImportIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== m.id)
                              : [...prev, m.id],
                          )
                        }
                        className={`p-2.5 flex items-center justify-between cursor-pointer rounded hover:bg-[var(--surface-subtle)] ${checked ? "bg-emerald-50/50" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          {checked ? (
                            <CheckSquare
                              size={16}
                              className="text-primary"
                            />
                          ) : (
                            <Square
                              size={16}
                              className="text-[var(--text-tertiary)]"
                            />
                          )}
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-primary)]">
                              {m.nama}
                            </p>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              Tingkat: {m.tingkat?.join(", ") || "Semua"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                className="px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isImporting || selectedImportIds.length === 0}
                className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover disabled:opacity-60 flex items-center gap-2"
              >
                {isImporting && (
                  <Loader2 size={14} className="animate-spin" />
                )}{" "}
                Ambil & Relasikan Mapel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? `Edit Mata Pelajaran ${jenjang}` : `Tambah Mata Pelajaran ${jenjang}`}
          description={editingId ? `Perbarui informasi mapel ${jenjang}` : `Daftarkan mapel baru untuk jenjang ${jenjang}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Nama Mata Pelajaran <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nama}
                onChange={(e) => setFormData({...formData, nama: e.target.value})}
                placeholder="Contoh: Al-Qur&apos;an Hadits, Aqidah Akhlak, Biologi..."
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Kurikulum <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomKurikulum(!isCustomKurikulum)}
                    className="text-[11px] text-primary font-bold hover:underline"
                    title="Tambah kurikulum baru"
                  >
                    {isCustomKurikulum
                      ? "Pilih dari Daftar"
                      : "+ Ketik Baru"}
                  </button>
                </div>
                {isCustomKurikulum ? (
                  <input
                    type="text"
                    required
                    value={formData.kurikulum}
                    onChange={(e) => setFormData({...formData, kurikulum: e.target.value})}
                    placeholder="Contoh: Kurikulum Merdeka"
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <select
                      value={formData.kurikulum}
                      onChange={(e) => setFormData({...formData, kurikulum: e.target.value})}
                      className="flex-1 px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {kurikulums.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] h-[46px]">
                      <input
                        type="checkbox"
                        checked={formData.isAktif}
                        onChange={(e) => setFormData({...formData, isAktif: e.target.checked})}
                        className="w-4 h-4 text-primary rounded accent-primary"
                      />
                      <span className="text-[12px] font-bold text-[var(--text-primary)]">Aktif</span>
                    </label>
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Tingkat Kelas (Pilih 1 atau beberapa tingkat)
                </label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {TINGKAT_LIST.map((t) => {
                    const isChecked = formData.tingkat.includes(t);
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] border cursor-pointer text-[12px] font-medium transition-all ${isChecked ? "bg-primary-subtle border-primary/30 text-primary" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)]"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked 
                                ? formData.tingkat.filter(i => i !== t)
                                : [...formData.tingkat, t];
                            setFormData({...formData, tingkat: updated});
                          }}
                          className="w-4 h-4 text-primary rounded accent-primary"
                        />
                        Tingkat {t}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-[13px] font-bold text-[var(--text-secondary)] bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
              >
                BATAL
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />{" "}
                    MENYIMPAN...
                  </>
                ) : editingId ? (
                  "PERBARUI"
                ) : (
                  "SIMPAN"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          title={`Hapus Mapel ${jenjang}?`}
          message={`Yakin ingin menghapus "${deleteTarget.nama}"? Jika mapel pernah digunakan, disarankan menggunakan status Nonaktif agar arsip absen tetap aman.`}
          confirmText="YA, HAPUS"
        />
      )}
    </div>
  );
}
