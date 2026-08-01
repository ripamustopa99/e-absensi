"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  GraduationCap,
  Loader2,
  Users,
  MapPin,
  Calendar,
  Contact,
  CreditCard,
  CheckSquare,
  Square,
  ArrowRight,
  Award,
  Info,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AxiosError } from "axios";
import Modal from "@/components/shared/Modal";
import MobileFilterDrawer from "@/components/shared/MobileFilterDrawer";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ModuleToolbar from "@/components/shared/ModuleToolbar";
import DataTable from "@/components/shared/DataTable";

type KategoriKelas = "MA" | "MTS";

type TahunAjaranData = {
  id: string;
  label: string;
  isAktif: boolean;
};

type RiwayatAkademik = {
  id: string;
  tingkat: string;
  status: string;
  createdAt: string;
};

type SiswaData = {
  id: string;
  nisn: string;
  nama: string;
  jenjang: KategoriKelas;
  tingkat: string;
  jenisKelamin: string | null;
  tanggalLahir: string | null;
  namaOrangTua: string | null;
  status: "AKTIF" | "MUTASI" | "LULUS";
  riwayat?: RiwayatAkademik[];
};

type SiswaFormData = {
  nisn: string;
  nama: string;
  jenisKelamin: string;
  tanggalLahir: string;
  namaOrangTua: string;
  tingkat: string;
  status: "AKTIF" | "MUTASI" | "LULUS";
};

type ApiError = { success: false; message: string };

const DEFAULT_FORM: SiswaFormData = {
  nisn: "",
  nama: "",
  jenisKelamin: "",
  tanggalLahir: "",
  namaOrangTua: "",
  tingkat: "",
  status: "AKTIF",
};

interface StudentManagementViewProps {
  jenjang: KategoriKelas;
}

export function StudentManagementView({ jenjang }: StudentManagementViewProps) {
  const [siswa, setSiswa] = useState<SiswaData[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaranData[]>([]);
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] =
    useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("ALL");
  const [filterJenisKelamin, setFilterJenisKelamin] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("AKTIF");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalData, setTotalData] = useState(0);

  const [isPromotionMode, setIsPromotionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"NAIK" | "LULUS" | null>(
    null,
  );

  const [isImportMtsModalOpen, setIsImportMtsModalOpen] = useState(false);
  const [lulusMtsList, setLulusMtsList] = useState<SiswaData[]>([]);
  const [selectedMtsIds, setSelectedMtsIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const [selectedSiswaDetail, setSelectedSiswaDetail] =
    useState<SiswaData | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SiswaFormData>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SiswaData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const availableTingkat =
    jenjang === "MTS" ? ["VII", "VIII", "IX"] : ["X", "XI", "XII"];
  const isTerminalGrade = (tingkat: string) =>
    tingkat === "IX" || tingkat === "XII";

  const selectedSiswaList = useMemo(() => {
    return siswa.filter((s) => selectedIds.includes(s.id));
  }, [siswa, selectedIds]);

  const hasTerminalSelected = useMemo(() => {
    return selectedSiswaList.some((s) => isTerminalGrade(s.tingkat));
  }, [selectedSiswaList]);

  const hasNonTerminalSelected = useMemo(() => {
    return selectedSiswaList.some((s) => !isTerminalGrade(s.tingkat));
  }, [selectedSiswaList]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const taRes = await api.get<{ data: TahunAjaranData[] }>("/tahun-ajaran");

      setTahunAjaranList(taRes.data.data);
      const activeTa =
        taRes.data.data.find((t) => t.isAktif) || taRes.data.data[0];
      if (activeTa && !selectedTahunAjaranId) {
        setSelectedTahunAjaranId(activeTa.id);
      }

      const params = new URLSearchParams();
      params.append("jenjang", jenjang);
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (selectedTahunAjaranId && selectedTahunAjaranId !== "ALL")
        params.append("tahunAjaranId", selectedTahunAjaranId);
      if (searchQuery) params.append("search", searchQuery);
      if (filterTingkat !== "ALL") params.append("tingkat", filterTingkat);
      if (filterJenisKelamin !== "ALL")
        params.append("jenisKelamin", filterJenisKelamin);
      if (filterStatus !== "ALL") params.append("status", filterStatus);

      const siswaRes = await api.get<{
        data: SiswaData[];
        total: number;
        totalPages: number;
      }>(`/siswa?${params.toString()}`);
      setSiswa(siswaRes.data.data);
      setTotalData(siswaRes.data.total);
      setTotalPages(siswaRes.data.totalPages || 1);
    } catch {
      toast.error("Gagal memuat data dari server");
    } finally {
      setIsLoading(false);
    }
  }, [
    jenjang,
    selectedTahunAjaranId,
    searchQuery,
    filterTingkat,
    filterJenisKelamin,
    filterStatus,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    filterTingkat,
    filterJenisKelamin,
    filterStatus,
    selectedTahunAjaranId,
  ]);

  const toggleSelectAll = () => {
    if (selectedIds.length === siswa.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(siswa.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const openCreateModal = () => {
    setFormData(DEFAULT_FORM);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: SiswaData) => {
    setFormData({
      nisn: item.nisn,
      nama: item.nama,
      jenisKelamin: item.jenisKelamin ?? "",
      tanggalLahir: item.tanggalLahir ? item.tanggalLahir.split("T")[0]! : "",
      namaOrangTua: item.namaOrangTua ?? "",
      tingkat: item.tingkat,
      status: item.status,
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleFormChange = (field: keyof SiswaFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn || !formData.nama || !formData.tingkat) {
      toast.error("Mohon lengkapi kolom wajib (NISN/NIK, Nama, Tingkat)");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      nisn: formData.nisn,
      nama: formData.nama,
      jenjang: jenjang,
      tingkat: formData.tingkat,
      jenisKelamin: formData.jenisKelamin || null,
      tanggalLahir: formData.tanggalLahir || null,
      namaOrangTua: formData.namaOrangTua || null,
      status: formData.status,
    };

    try {
      if (editingId) {
        await api.put(`/siswa/${editingId}`, payload);
        toast.success("Data siswa berhasil diperbarui");
      } else {
        await api.post("/siswa", payload);
        toast.success("Siswa baru berhasil ditambahkan");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(
        error.response?.data?.message ??
          "Terjadi kesalahan saat menyimpan data",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/siswa/${deleteTarget.id}`);
      toast.success(`Data ${deleteTarget.nama} berhasil dihapus`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal menghapus siswa");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteAutomatedAction = async () => {
    try {
      if (bulkActionType === "NAIK") {
        await api.post("/siswa/naik-kelas", { siswaIds: selectedIds });
        toast.success(
          `Berhasil memproses kenaikan kelas otomatis untuk ${selectedIds.length} siswa.`,
        );
      } else if (bulkActionType === "LULUS") {
        await api.post("/siswa/lulus", { siswaIds: selectedIds });
        toast.success(
          `Berhasil memproses kelulusan untuk ${selectedIds.length} siswa.`,
        );
      }
      setSelectedIds([]);
      setIsBulkActionModalOpen(false);
      setBulkActionType(null);
      setIsPromotionMode(false);
      fetchData();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(
        error.response?.data?.message ?? "Gagal memproses aksi massal",
      );
    }
  };

  const openImportMtsModal = async () => {
    try {
      const res = await api.get<{ data: SiswaData[] }>(
        "/siswa?jenjang=MTS&tingkat=IX",
      );
      setLulusMtsList(res.data.data);
      setSelectedMtsIds([]);
      setIsImportMtsModalOpen(true);
    } catch {
      toast.error("Gagal memuat data lulusan MTs");
    }
  };

  const handleImportMtsSiswa = async () => {
    if (selectedMtsIds.length === 0) {
      toast.error("Pilih setidaknya satu siswa MTs");
      return;
    }

    setIsImporting(true);
    try {
      await api.post("/siswa/import-ma", { siswaIds: selectedMtsIds });
      toast.success(
        `Berhasil mengambil ${selectedMtsIds.length} siswa lulusan MTs ke Tingkat X MA.`,
      );
      setIsImportMtsModalOpen(false);
      setSelectedMtsIds([]);
      fetchData();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(
        error.response?.data?.message ?? "Gagal mengambil data siswa MTs",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(isoString));
  };

  // Reusable filter elements for desktop
  const desktopFilters = (
    <>
      <button
        onClick={() => {
          setIsPromotionMode(!isPromotionMode);
          setSelectedIds([]);
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] text-[12px] font-bold transition-all border ${
          isPromotionMode
            ? "bg-primary text-white border-primary"
            : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--border)]"
        }`}
      >
        <Settings2 size={13} />
        {isPromotionMode ? "Tutup Mode Kenaikan" : "⚙️ Mode Kenaikan"}
      </button>

      <select
        value={selectedTahunAjaranId}
        onChange={(e) => setSelectedTahunAjaranId(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-bold text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua TA</option>
        {tahunAjaranList
          .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
      </select>

      <select
        value={filterTingkat}
        onChange={(e) => setFilterTingkat(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Tingkat</option>
        {availableTingkat.map((t) => (
          <option key={t} value={t}>
            Tingkat {t}
          </option>
        ))}
      </select>

      <select
        value={filterJenisKelamin}
        onChange={(e) => setFilterJenisKelamin(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Gender</option>
        <option value="Laki-laki">Laki-laki</option>
        <option value="Perempuan">Perempuan</option>
      </select>

      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
      >
        <option value="ALL">Semua Status</option>
        <option value="AKTIF">Aktif</option>
        <option value="MUTASI">Mutasi</option>
        <option value="LULUS">Lulus</option>
      </select>
    </>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Tahun Ajaran
        </label>
        <select
          value={selectedTahunAjaranId}
          onChange={(e) => setSelectedTahunAjaranId(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Tahun Ajaran</option>
          {tahunAjaranList
            .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Tingkat
        </label>
        <select
          value={filterTingkat}
          onChange={(e) => setFilterTingkat(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Tingkat</option>
          {availableTingkat.map((t) => (
            <option key={t} value={t}>
              Tingkat {t}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Gender
        </label>
        <select
          value={filterJenisKelamin}
          onChange={(e) => setFilterJenisKelamin(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Gender</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Status
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
        >
          <option value="ALL">Semua Status</option>
          <option value="AKTIF">Aktif</option>
          <option value="MUTASI">Mutasi</option>
          <option value="LULUS">Lulus</option>
        </select>
      </div>
      <div className="pt-2 border-t border-[var(--border)]">
        <button
          onClick={() => {
            setIsPromotionMode(!isPromotionMode);
            setSelectedIds([]);
          }}
          className="w-full px-3 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-[var(--radius-md)] flex items-center justify-center gap-1.5"
        >
          <Settings2 size={13} />{" "}
          {isPromotionMode ? "Tutup Mode Kenaikan" : "⚙️ Mode Kenaikan"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-bold uppercase tracking-wider">
              Jenjang {jenjang}
            </span>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              | Manajemen Siswa
            </span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1">
            Data Siswa {jenjang}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Kelola data siswa, penempatan kelas, dan transisi kenaikan kelas /
            kelulusan.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-row w-full sm:w-auto">
          {jenjang === "MA" && (
            <button
              onClick={openImportMtsModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-blue-700 transition-all shadow-sm w-full sm:w-auto"
            >
              <Award size={16} />
              <span className="truncate">Ambil Data dari MTs</span>
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-all shadow-sm w-full sm:w-auto"
          >
            <Plus size={16} />
            <span className="truncate">Tambah Siswa {jenjang}</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Module Toolbar */}
        <ModuleToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Cari NISN, NIK, atau Nama..."
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={() => {
            setSelectedTahunAjaranId("ALL");
            setFilterTingkat("ALL");
            setFilterJenisKelamin("ALL");
            setFilterStatus("AKTIF");
          }}
        >
          {/* Desktop Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="px-4 py-3 bg-primary/10 border-t border-primary/20 flex items-center justify-between animate-in fade-in">
              <span className="text-[12px] font-bold text-primary">
                {selectedIds.length} siswa dipilih
              </span>
              <div className="flex items-center gap-2">
                {!hasTerminalSelected && hasNonTerminalSelected && (
                  <button
                    onClick={() => {
                      setBulkActionType("NAIK");
                      setIsBulkActionModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-primary text-white text-[12px] font-bold rounded-md hover:bg-primary-hover transition-all flex items-center gap-1.5"
                  >
                    <ArrowRight size={14} /> Proses Naik Kelas Otomatis
                  </button>
                )}
                {hasTerminalSelected && !hasNonTerminalSelected && (
                  <button
                    onClick={() => {
                      setBulkActionType("LULUS");
                      setIsBulkActionModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-[12px] font-bold rounded-md hover:bg-blue-700 transition-all flex items-center gap-1.5"
                  >
                    <Award size={14} /> Proses Kelulusan Siswa
                  </button>
                )}
              </div>
            </div>
          )}
        </ModuleToolbar>

        {/* Table */}
        <DataTable
          loading={isLoading}
          data={siswa}
          headers={[
            ...(isPromotionMode ? ["Pilih"] : []),
            "Siswa & NISN",
            "Kelas",
            "Tanggal Lahir",
            "Orang Tua",
            "Status Sistem",
            "Aksi",
          ]}
          minWidth="min-w-[1000px]"
          emptyMessage={`Tidak ada data siswa ${jenjang} yang ditemukan.`}
          emptyIcon={<Users size={36} className="mx-auto mb-3 opacity-50" />}
          renderRow={(item, idx) => {
            const isSelected = selectedIds.includes(item.id);
            const isTerminal = isTerminalGrade(item.tingkat);
            return (
              <tr
                key={item.id}
                className={`hover:bg-[var(--surface-subtle)]/50 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}
              >
                {isPromotionMode && (
                  <td className="py-4 px-4 text-center animate-in fade-in duration-150">
                    <button
                      onClick={() => toggleSelectOne(item.id)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-primary" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>
                )}
                <td
                  className="py-4 px-4 cursor-pointer"
                  onClick={() => setSelectedSiswaDetail(item)}
                >
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[var(--text-primary)] hover:text-primary transition-colors">
                      {item.nama}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                        {item.nisn}
                      </span>
                      {item.jenisKelamin && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-[var(--border)] rounded text-[var(--text-tertiary)]">
                          {item.jenisKelamin === "Laki-laki" ? "L" : "P"}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td
                  className="py-4 px-4 cursor-pointer"
                  onClick={() => setSelectedSiswaDetail(item)}
                >
                  <div className="flex flex-col gap-0.5 items-start">
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      Tingkat {item.tingkat}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {isPromotionMode &&
                        item.status !== "LULUS" &&
                        (isTerminal ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 animate-in fade-in">
                            Siap Lulus
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 animate-in fade-in">
                            Siap Naik Kelas
                          </span>
                        ))}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-[12px] text-[var(--text-primary)] font-medium">
                    {formatDate(item.tanggalLahir)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-[12px] text-[var(--text-primary)] font-medium">
                    {item.namaOrangTua ?? "—"}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                      item.status === "AKTIF"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : item.status === "LULUS"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedSiswaDetail(item)}
                      className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-primary rounded-md transition-all"
                      title="Detail & Arsip"
                    >
                      <Info size={14} />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-primary rounded-md transition-all"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-2 text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-500 rounded-md transition-all"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }}
          renderMobileCard={(item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3 ${isSelected ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {isPromotionMode && (
                      <button
                        onClick={() => toggleSelectOne(item.id)}
                        className="text-[var(--text-tertiary)]"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-primary" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    )}
                    <div>
                      <p
                        onClick={() => setSelectedSiswaDetail(item)}
                        className="text-[14px] font-bold text-[var(--text-primary)] cursor-pointer hover:text-primary"
                      >
                        {item.nama}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        NISN: {item.nisn} · Tingkat {item.tingkat}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedSiswaDetail(item)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-md"
                    >
                      <Info size={14} />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-md"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] p-2 rounded-lg">
                  <span>Ortu: {item.namaOrangTua || "—"}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === "AKTIF"
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            );
          }}
        />

        {/* Pagination Footer */}
        {!isLoading && totalData > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[var(--text-secondary)] font-medium">
            <span>
              Menampilkan data {(page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, totalData)} dari {totalData} total siswa{" "}
              {jenjang}.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--border)] transition-colors"
                title="Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 font-bold text-[var(--text-primary)]">
                Hal. {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--border)] transition-colors"
                title="Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedSiswaDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedSiswaDetail(null)}
          />
          <div className="relative w-full max-w-lg bg-[var(--surface)] h-full shadow-2xl border-l border-[var(--border)] flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="px-6 py-5 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                    {selectedSiswaDetail.nama}
                  </h3>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    NISN: {selectedSiswaDetail.nisn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSiswaDetail(null)}
                className="p-2 text-[var(--text-tertiary)] hover:bg-[var(--border)] rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-[13px]">
              <div className="bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border)] space-y-3">
                <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2">
                  <Contact size={14} className="text-primary" /> Informasi
                  Pribadi & Keluarga
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <span className="text-[var(--text-tertiary)] block">
                      Jenis Kelamin
                    </span>
                    <strong className="text-[var(--text-primary)]">
                      {selectedSiswaDetail.jenisKelamin || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)] block">
                      Tanggal Lahir
                    </span>
                    <strong className="text-[var(--text-primary)]">
                      {formatDate(selectedSiswaDetail.tanggalLahir)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)] block">
                      Orang Tua / Wali
                    </span>
                    <strong className="text-[var(--text-primary)]">
                      {selectedSiswaDetail.namaOrangTua || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)] block">
                      Status Sistem
                    </span>
                    <strong className="text-primary">
                      {selectedSiswaDetail.status}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Calendar size={14} className="text-primary" /> Arsip Riwayat
                  Akademik (Timeline)
                </h4>
                <div className="space-y-2.5">
                  {selectedSiswaDetail.riwayat?.map((hist, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-[var(--surface-subtle)] rounded-lg border border-[var(--border)]"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[12px] font-bold text-[var(--text-primary)]">
                          Tingkat {hist.tingkat || "-"}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Status: {hist.status} | Tercatat:{" "}
                          {formatDate(hist.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-end">
              <button
                onClick={() => setSelectedSiswaDetail(null)}
                className="px-5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-secondary)] hover:bg-[var(--border)]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AMBIL DATA DARI MTS MODAL */}
      {isImportMtsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsImportMtsModalOpen(false)}
          />
          <div className="bg-[var(--surface)] w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[var(--border)] flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                    Ambil Data Lulusan MTs ke MA
                  </h3>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Menampilkan siswa tingkat akhir MTs (Tingkat IX) untuk
                    didaftarkan ke Kelas X MA.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportMtsModalOpen(false)}
                className="p-2 text-[var(--text-tertiary)] hover:bg-[var(--border)] rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Daftar Calon Lulusan MTs (Tingkat IX) ({lulusMtsList.length}{" "}
                  tersedia)
                </label>
                {lulusMtsList.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-tertiary)] py-8 text-center">
                    Tidak ada siswa tingkat IX MTs yang ditemukan.
                  </p>
                ) : (
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
                    {lulusMtsList.map((m) => {
                      const checked = selectedMtsIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() =>
                            setSelectedMtsIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== m.id)
                                : [...prev, m.id],
                            )
                          }
                          className={`p-3 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-subtle)] ${checked ? "bg-blue-50/50" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            {checked ? (
                              <CheckSquare
                                size={16}
                                className="text-blue-600"
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
                                NISN: {m.nisn} | Tingkat asal: {m.tingkat}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
                            Siap Lanjut MA
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-end gap-3">
              <button
                onClick={() => setIsImportMtsModalOpen(false)}
                className="px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--surface)]"
              >
                Batal
              </button>
              <button
                onClick={handleImportMtsSiswa}
                className="px-6 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Ambil & Daftarkan ke Tingkat X MA"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ACTION CONFIRMATION MODAL */}
      {isBulkActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsBulkActionModalOpen(false)}
          />
          <div className="bg-[var(--surface)] w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[var(--border)]">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
                {bulkActionType === "NAIK" ? (
                  <ArrowRight size={24} />
                ) : (
                  <Award size={24} />
                )}
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                  {bulkActionType === "NAIK"
                    ? "Konfirmasi Kenaikan Kelas Otomatis"
                    : "Konfirmasi Kelulusan Siswa"}
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {bulkActionType === "NAIK"
                    ? `Sistem akan memproses kenaikan kelas otomatis untuk ${selectedIds.length} siswa di backend.`
                    : `Sistem akan memproses kelulusan untuk ${selectedIds.length} siswa tingkat akhir di backend.`}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-end gap-3">
              <button
                onClick={() => setIsBulkActionModalOpen(false)}
                className="px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--surface)]"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteAutomatedAction}
                className="px-6 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold bg-primary text-white hover:bg-primary-hover transition-all shadow-sm"
              >
                Ya, Proses di Backend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingId
            ? `Edit Data Siswa ${jenjang}`
            : `Tambah Siswa ${jenjang} Baru`
        }
        description="Registrasi profil siswa"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                <CreditCard size={10} className="inline mr-1" />
                NISN / NIK <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nisn}
                onChange={(e) => handleFormChange("nisn", e.target.value)}
                placeholder="Nomor Induk Siswa"
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => handleFormChange("nama", e.target.value)}
                placeholder="Sesuai Akta Kelahiran"
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Jenis Kelamin
              </label>
              <select
                value={formData.jenisKelamin}
                onChange={(e) =>
                  handleFormChange("jenisKelamin", e.target.value)
                }
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">— Pilih Jenis Kelamin —</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                <Calendar size={10} className="inline mr-1" />
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={formData.tanggalLahir}
                onChange={(e) =>
                  handleFormChange("tanggalLahir", e.target.value)
                }
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                value={formData.namaOrangTua}
                onChange={(e) =>
                  handleFormChange("namaOrangTua", e.target.value)
                }
                placeholder="Nama Ayah/Ibu/Wali"
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Tingkat Kelas <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.tingkat}
                onChange={(e) => handleFormChange("tingkat", e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">— Pilih Tingkat —</option>
                {availableTingkat.map((t) => (
                  <option key={t} value={t}>
                    Tingkat {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              Status Siswa
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                handleFormChange(
                  "status",
                  e.target.value as "AKTIF" | "MUTASI" | "LULUS",
                )
              }
              className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="AKTIF">AKTIF</option>
              <option value="MUTASI">MUTASI</option>
              {(isTerminalGrade(formData.tingkat) ||
                formData.status === "LULUS") && (
                <option value="LULUS">LULUS</option>
              )}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 text-[13px] font-bold text-[var(--text-secondary)] bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--surface-subtle)]"
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
                  <Loader2 size={14} className="animate-spin" /> MENYIMPAN...
                </>
              ) : editingId ? (
                "PERBARUI SISWA"
              ) : (
                "SIMPAN SISWA"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Data Siswa?"
        message={`Apakah Anda yakin ingin menghapus data ${deleteTarget?.nama}? Tindakan ini tidak dapat dibatalkan.`}
        isDeleting={isDeleting}
        confirmText="YA, HAPUS"
      />
    </div>
  );
}
