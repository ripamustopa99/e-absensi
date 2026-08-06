/* eslint-disable */
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  Presentation,
  Loader2,
  Users,
  ChevronDown,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AxiosError } from "axios";
import Modal from "@/components/shared/Modal";
import ConfirmModal from "@/components/shared/ConfirmModal";

// --- Types ---

type KategoriKelas = "MA" | "MTS";

type UserData = {
  id: string;
  nama: string;
  nip: string;
  waliKelas?: {
    namaKelas: string;
    jenjang: string;
    tahunAjaran?: { label: string };
  }[];
};

type TahunAjaranData = {
  id: string;
  label: string;
  semester: string;
};

type KelasData = {
  id: string;
  namaKelas: string;
  jenjang: KategoriKelas;
  tingkat: string;
  isAktif: boolean;
  kapasitas: number | null;
  waliKelas: UserData | null;
  tahunAjaran: TahunAjaranData;
  _count: { siswa: number };
};

type KelasFormData = {
  namaKelas: string;
  jenjang: KategoriKelas | "";
  tingkat: string;
  kapasitas: number | "";
  waliKelasId: string;
  isAktif: boolean;
};

type ApiError = { success: false; message: string };

// --- Constants ---

const TINGKAT_MTS = ["VII", "VIII", "IX"];
const TINGKAT_MA = ["X", "XI", "XII"];

const DEFAULT_FORM: KelasFormData = {
  namaKelas: "",
  jenjang: "",
  tingkat: "",
  kapasitas: "",
  waliKelasId: "",
  isAktif: true,
};

// --- Custom Searchable Select Component ---
function SearchableGuruSelect({
  value,
  onChange,
  error
}: {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [gurus, setGurus] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGurus = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get<{ data: UserData[] }>(`/users?role=GURU&isAktif=true&search=${q}`);
      setGurus(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => fetchGurus(search), 300);
      return () => clearTimeout(timer);
    }
  }, [search, open, fetchGurus]);

  useEffect(() => {
    if (value && gurus.length === 0) {
      fetchGurus("");
    }
  }, [value, fetchGurus, gurus.length]);

  const selectedGuru = gurus.find(g => g.id === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className={`w-full px-3 py-2.5 bg-[var(--surface)] border ${error ? "border-rose-500" : "border-[var(--border)]"} rounded-[var(--radius-md)] text-[13px] flex items-center justify-between cursor-pointer focus-within:ring-1 focus-within:ring-[var(--primary)] transition-all`}
        onClick={() => {
          setOpen(!open);
          if (!open) setSearch("");
        }}
      >
        <span className={selectedGuru ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}>
          {selectedGuru ? `${selectedGuru.nama} (${selectedGuru.nip || "Guru"})` : "Cari dan Pilih Wali Kelas..."}
        </span>
        <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                autoFocus
                placeholder="Ketik Nama Guru..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-subtle)] border-none rounded text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {loading ? (
              <div className="p-3 text-center flex items-center justify-center gap-2 text-[var(--text-tertiary)]">
                <Loader2 size={12} className="animate-spin" /> <span className="text-[11px]">Mencari...</span>
              </div>
            ) : gurus.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-[var(--text-tertiary)]">
                Guru tidak ditemukan
              </div>
            ) : (
              gurus.map(g => (
                <div
                  key={g.id}
                  onClick={() => {
                    onChange(g.id);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-[12px] cursor-pointer rounded-sm hover:bg-[var(--surface-subtle)] transition-colors flex flex-col gap-0.5 ${value === g.id ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold' : 'text-[var(--text-primary)]'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{g.nama} <span className="text-[10px] text-[var(--text-tertiary)] ml-1 font-normal">({g.nip || "Guru"})</span></span>
                  </div>
                  {g.waliKelas && g.waliKelas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
                        Wali kelas: {g.waliKelas.map(wk => `${wk.jenjang} ${wk.namaKelas}`).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// --- Page Component ---

export default function AdminKelasPage() {
  const [kelas, setKelas] = useState<KelasData[]>([]);
  const [tahunAjarans, setTahunAjarans] = useState<TahunAjaranData[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenjang, setFilterJenjang] = useState("ALL");
  const [filterTingkat, setFilterTingkat] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("true"); // Default to active
  const [filterTahunAjaran, setFilterTahunAjaran] = useState("ALL");

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<KelasFormData>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Clone modal state
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneForm, setCloneForm] = useState({
    sourceTahunAjaranId: "",
    targetTahunAjaranId: "",
  });
  const [isCloning, setIsCloning] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<KelasData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset page when filters or search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterJenjang, filterTingkat, filterStatus, filterTahunAjaran]);

  // Derive options based on selected Kategori for the filter
  const tingkatFilterOptions = useMemo(() => {
    if (filterJenjang === "MTS") return TINGKAT_MTS;
    if (filterJenjang === "MA") return TINGKAT_MA;
    return [...TINGKAT_MTS, ...TINGKAT_MA];
  }, [filterJenjang]);

  // Derive options for the form based on selected Kategori
  const tingkatFormOptions = useMemo(() => {
    if (formData.jenjang === "MTS") return TINGKAT_MTS;
    if (formData.jenjang === "MA") return TINGKAT_MA;
    return [];
  }, [formData.jenjang]);

  // Data Fetching
  const fetchTahunAjaran = useCallback(async () => {
    try {
      const res = await api.get<{ data: TahunAjaranData[] }>('/tahun-ajaran');
      setTahunAjarans(res.data.data);
      if (res.data.data.length > 0) {
        setFilterTahunAjaran(res.data.data[0].id);
      }
    } catch (e) {
      toast.error("Gagal memuat data Tahun Ajaran");
    }
  }, []);

  const fetchKelas = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterJenjang !== "ALL") params.append("jenjang", filterJenjang);
      if (filterTingkat !== "ALL") params.append("tingkat", filterTingkat);
      if (filterStatus !== "ALL") params.append("isAktif", filterStatus);
      if (filterTahunAjaran !== "ALL") params.append("tahunAjaranId", filterTahunAjaran);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const qs = params.toString();
      const res = await api.get<{ data: KelasData[]; total: number; totalPages: number }>(`/kelas${qs ? `?${qs}` : ""}`);
      setKelas(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      toast.error("Gagal memuat data kelas");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterJenjang, filterTingkat, filterStatus, filterTahunAjaran, page, limit]);

  // Init Data
  useEffect(() => {
    fetchTahunAjaran();
  }, [fetchTahunAjaran]);

  // Refetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => fetchKelas(), 300);
    return () => clearTimeout(timer);
  }, [fetchKelas]);


  const openCreateModal = () => {
    setFormData(DEFAULT_FORM);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: KelasData) => {
    setFormData({
      namaKelas: item.namaKelas,
      jenjang: item.jenjang,
      tingkat: item.tingkat,
      kapasitas: item.kapasitas ?? "",
      waliKelasId: item.waliKelas?.id ?? "",
      isAktif: item.isAktif,
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleFormChange = (field: keyof KelasFormData, value: string | number | boolean) => {
    if (field === "jenjang") {
      setFormData((prev) => ({ ...prev, jenjang: value as KategoriKelas, tingkat: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaKelas || !formData.jenjang || !formData.tingkat || !formData.waliKelasId) {
      toast.error("Mohon lengkapi semua kolom wajib");
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      namaKelas: formData.namaKelas,
      jenjang: formData.jenjang,
      tingkat: formData.tingkat,
      kapasitas: formData.kapasitas ? Number(formData.kapasitas) : null,
      waliKelasId: formData.waliKelasId,
      isAktif: formData.isAktif,
    };

    try {
      if (editingId) {
        await api.put<{ data: KelasData }>(`/kelas/${editingId}`, payload);
        toast.success("Data kelas berhasil diperbarui");
      } else {
        await api.post<{ data: KelasData }>("/kelas", payload);
        toast.success("Kelas baru berhasil ditambahkan");
      }
      setIsModalOpen(false);
      fetchKelas();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneForm.sourceTahunAjaranId || !cloneForm.targetTahunAjaranId) {
      toast.error("Pilih tahun ajaran sumber dan tujuan");
      return;
    }
    if (cloneForm.sourceTahunAjaranId === cloneForm.targetTahunAjaranId) {
      toast.error("Tahun ajaran sumber dan tujuan tidak boleh sama");
      return;
    }

    setIsCloning(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>("/kelas/clone", cloneForm);
      toast.success(res.data.message || "Rombel berhasil disalin!");
      setIsCloneModalOpen(false);
      fetchKelas();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal menyalin rombel kelas");
    } finally {
      setIsCloning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/kelas/${deleteTarget.id}`);
      toast.success(`Kelas "${deleteTarget.namaKelas}" berhasil dihapus`);
      setDeleteTarget(null);
      fetchKelas();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal menghapus kelas");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (item: KelasData) => {
    const prev = item.isAktif;
    setKelas((list) => list.map((u) => (u.id === item.id ? { ...u, isAktif: !prev } : u)));
    try {
      await api.patch<{ message: string }>(`/kelas/${item.id}/status`);
      toast.success("Status kelas berhasil diubah");
    } catch (err) {
      setKelas((list) => list.map((u) => (u.id === item.id ? { ...u, isAktif: prev } : u)));
      toast.error("Gagal mengubah status kelas");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Manajemen Kelas</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Kelola data rombongan belajar tingkat Madrasah Tsanawiyah (MTS) dan Aliyah (MA).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCloneForm({
                sourceTahunAjaranId: tahunAjarans.length > 0 ? tahunAjarans[0].id : "",
                targetTahunAjaranId: tahunAjarans.length > 1 ? tahunAjarans[1].id : (tahunAjarans[0]?.id || ""),
              });
              setIsCloneModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] transition-all shadow-sm"
          >
            <Copy size={16} />
            Salin Rombel
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-all shadow-sm"
          >
            <Plus size={16} />
            Tambah Kelas
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#F6F8F7] dark:bg-[var(--surface-subtle)]">
          
          {/* Search - Left & Mobile Filter Button */}
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-1 xl:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Cari Nama Kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="xl:hidden inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] font-bold rounded-[var(--radius-md)] shrink-0 shadow-sm hover:bg-[var(--surface-subtle)]"
            >
              <Filter size={14} /> Filter
            </button>
          </div>

          {/* Filters - Desktop (Right) */}
          <div className="hidden xl:flex flex-wrap items-center gap-3 w-auto">
            {/* Tahun Ajaran Filter */}
            <div className="relative w-44 flex items-center">
              <Filter size={14} className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none" />
              <select
                value={filterTahunAjaran}
                onChange={(e) => setFilterTahunAjaran(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Tahun Ajaran</option>
                {tahunAjarans.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="relative w-36 flex items-center">
              <Filter size={14} className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none" />
              <select
                value={filterJenjang}
                onChange={(e) => {
                  setFilterJenjang(e.target.value);
                  setFilterTingkat("ALL");
                }}
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Jenjang</option>
                <option value="MTS">MTS</option>
                <option value="MA">MA</option>
              </select>
            </div>
            
            <div className="relative w-36 flex items-center">
              <Filter size={14} className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none" />
              <select
                value={filterTingkat}
                onChange={(e) => setFilterTingkat(e.target.value)}
                disabled={filterJenjang === "ALL"}
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="ALL">Semua Tingkat</option>
                {tingkatFilterOptions.map((t) => (
                  <option key={t} value={t}>Tingkat {t}</option>
                ))}
              </select>
            </div>

            <div className="relative w-32 flex items-center">
              <Filter size={14} className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 xl:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
            <div className="bg-[var(--surface)] w-full max-w-sm rounded-[var(--radius-md)] shadow-2xl relative z-10 overflow-hidden border border-[var(--border)] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Filter size={16} className="text-[var(--primary)]" /> Filter Kelas
                </h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 text-[var(--text-tertiary)] hover:bg-[var(--border)] rounded-md">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran</label>
                  <select
                    value={filterTahunAjaran}
                    onChange={(e) => setFilterTahunAjaran(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
                  >
                    <option value="ALL">Semua Tahun Ajaran</option>
                    {tahunAjarans.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Jenjang</label>
                  <select
                    value={filterJenjang}
                    onChange={(e) => {
                      setFilterJenjang(e.target.value);
                      setFilterTingkat("ALL");
                    }}
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
                  >
                    <option value="ALL">Semua Jenjang</option>
                    <option value="MTS">MTS</option>
                    <option value="MA">MA</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tingkat</label>
                  <select
                    value={filterTingkat}
                    onChange={(e) => setFilterTingkat(e.target.value)}
                    disabled={filterJenjang === "ALL"}
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none disabled:opacity-50"
                  >
                    <option value="ALL">Semua Tingkat</option>
                    {tingkatFilterOptions.map((t) => (
                      <option key={t} value={t}>Tingkat {t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</label>
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

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border)]">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-2.5 bg-[var(--primary)] text-white font-bold rounded-[var(--radius-md)] text-[13px]"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
              <Loader2 size={24} className="animate-spin mb-2 text-[var(--primary)]" />
              <p className="text-[13px] font-medium">Memuat data kelas...</p>
            </div>
          ) : kelas.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-tertiary)]">
              <Presentation size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-[13px]">Tidak ada data kelas yang ditemukan.</p>
            </div>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                  <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] w-12">No</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Nama Kelas</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Jenjang & Tingkat</th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Wali Kelas</th>
                  <th className="text-center py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Siswa</th>
                  <th className="text-center py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Status</th>
                  <th className="text-right py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {kelas.map((item, idx) => {
                  const isArchived = filterTahunAjaran !== "ALL" && item.tahunAjaran.id !== filterTahunAjaran;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors group">
                      <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">{(page - 1) * limit + idx + 1}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-bold text-[var(--text-primary)]">{item.namaKelas}</p>
                          {isArchived && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                              Arsip
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.jenjang === "MA" 
                              ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" 
                              : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          }`}>
                            {item.jenjang}
                          </span>
                          <span className="text-[13px] font-bold text-[var(--text-primary)]">
                            Tingkat {item.tingkat}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[var(--text-primary)]">{item.waliKelas?.nama ?? '—'}</span>
                          {item.waliKelas?.nip && <span className="text-[11px] text-[var(--text-tertiary)] font-medium">NIP. {item.waliKelas.nip}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-md text-[13px] font-bold text-[var(--text-primary)]">
                          <Users size={14} className="text-[var(--text-tertiary)]" />
                          {item._count.siswa}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all hover:opacity-80 border ${
                            item.isAktif
                              ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isAktif ? "bg-[var(--primary)]" : "bg-rose-500"}`} />
                          {item.isAktif ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)] rounded-md border border-transparent hover:border-[var(--primary)]/20 transition-all"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-2 text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 rounded-md border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!isLoading && (
          <div className="p-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[var(--text-secondary)] bg-[var(--surface-subtle)]/30">
            <div>
              Menampilkan <span className="font-semibold text-[var(--text-primary)]">{kelas.length > 0 ? (page - 1) * limit + 1 : 0}</span> - <span className="font-semibold text-[var(--text-primary)]">{Math.min(page * limit, total)}</span> dari <span className="font-semibold text-[var(--text-primary)]">{total}</span> kelas
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] disabled:opacity-40 hover:bg-[var(--surface-subtle)] transition-colors font-medium text-[var(--text-primary)]"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-medium text-[var(--text-primary)]">
                Hal. {page} dari {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] disabled:opacity-40 hover:bg-[var(--surface-subtle)] transition-colors font-medium text-[var(--text-primary)]"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clone / Salin Rombel Modal */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isCloning && setIsCloneModalOpen(false)}></div>
          <div className="bg-[var(--surface)] w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex items-center justify-between shrink-0">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                Salin Rombel dari Tahun Lalu
              </h3>
              <button onClick={() => setIsCloneModalOpen(false)} className="p-2 text-[var(--text-tertiary)] hover:bg-[var(--border)] rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCloneSubmit}>
              <div className="p-6 space-y-4">
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  Fitur ini menyalin seluruh struktur nama kelas, jenjang, tingkat, dan kapasitas dari Tahun Ajaran Sumber ke Tahun Ajaran Tujuan secara otomatis (Wali kelas akan di-reset untuk tahun baru).
                </p>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Dari Tahun Ajaran (Sumber)
                  </label>
                  <select
                    value={cloneForm.sourceTahunAjaranId}
                    onChange={(e) => setCloneForm({ ...cloneForm, sourceTahunAjaranId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  >
                    <option value="">-- Pilih Tahun Sumber --</option>
                    {tahunAjarans.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Ke Tahun Ajaran (Tujuan)
                  </label>
                  <select
                    value={cloneForm.targetTahunAjaranId}
                    onChange={(e) => setCloneForm({ ...cloneForm, targetTahunAjaranId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  >
                    <option value="">-- Pilih Tahun Tujuan --</option>
                    {tahunAjarans.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-[var(--surface-subtle)] border-t border-[var(--border)] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  disabled={isCloning}
                  className="px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="px-5 py-2 bg-[var(--primary)] text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] disabled:opacity-60 flex items-center gap-2"
                >
                  {isCloning && <Loader2 size={14} className="animate-spin" />} Salin Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Data Kelas" : "Tambah Kelas Baru"}
        description={editingId ? "Perbarui informasi kelas yang sudah ada" : "Daftarkan rombongan belajar baru"}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kategori / Jenjang */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Jenjang <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.jenjang}
                onChange={(e) => handleFormChange("jenjang", e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] appearance-none cursor-pointer"
              >
                <option value="">-- Pilih Jenjang --</option>
                <option value="MTS">MTS (Tsanawiyah)</option>
                <option value="MA">MA (Aliyah)</option>
              </select>
            </div>

            {/* Tingkat */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Tingkat <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.tingkat}
                onChange={(e) => handleFormChange("tingkat", e.target.value)}
                disabled={!formData.jenjang}
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Pilih Tingkat --</option>
                {tingkatFormOptions.map((t) => (
                  <option key={t} value={t}>Tingkat {t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nama Kelas */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              Nama Rombel / Kelas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.namaKelas}
              onChange={(e) => handleFormChange("namaKelas", e.target.value)}
              placeholder="Contoh: 7A, 8B, XII IPA 1, XII Bahasa 1"
              className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"
            />
            <p className="text-[11px] text-[var(--text-tertiary)]">Gunakan format paralel seperti 7A, 7B, atau nama jurusan untuk MA.</p>
          </div>

          {/* Wali Kelas */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              Wali Kelas <span className="text-rose-500">*</span>
            </label>
            <SearchableGuruSelect
              value={formData.waliKelasId}
              onChange={(val) => handleFormChange("waliKelasId", val)}
            />
          </div>

          {/* Kapasitas */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              Kapasitas Maksimal Siswa (Opsional)
            </label>
            <input
              type="number"
              value={formData.kapasitas}
              onChange={(e) => handleFormChange("kapasitas", e.target.value)}
              placeholder="Contoh: 32"
              className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 text-[13px] font-bold text-[var(--text-secondary)] bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] transition-colors"
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-white text-[13px] font-bold rounded-[var(--radius-md)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> MENYIMPAN...</> : editingId ? "PERBARUI KELAS" : "SIMPAN KELAS"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kelas?"
        message={`Apakah Anda yakin ingin menghapus kelas ${deleteTarget?.namaKelas}?`}
        isDeleting={isDeleting}
        confirmText="YA, HAPUS"
      />

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)}></div>
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Hapus Kelas?</h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Apakah Anda yakin ingin menghapus kelas <strong className="text-[var(--text-primary)]">{deleteTarget.namaKelas}</strong>?
              </p>
            </div>
            <div className="px-6 py-4 bg-[var(--surface-subtle)] border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 text-[13px] font-bold text-[var(--text-secondary)] bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)] transition-colors"
              >
                BATAL
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-500 text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-rose-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : "YA, HAPUS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
