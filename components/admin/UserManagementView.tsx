"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  User,
  Loader2,
  Phone,
  MapPin,
  Calendar,
  KeyRound,
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

type WaliTingkatItem = {
  jenjang: "MTS" | "MA";
  tingkat: string;
};

type UserData = {
  id: string;
  kodeAkses: string;
  nama: string;
  role: "ADMIN" | "GURU";
  jenisKelamin: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  noTelp: string | null;
  jabatan: string | null;
  isAktif: boolean;
  waliTingkat?: { id: string; jenjang: "MTS" | "MA"; tingkat: string }[];
};

type UserFormData = {
  kodeAkses: string;
  password: string;
  nama: string;
  role: "ADMIN" | "GURU";
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  noTelp: string;
  jabatan: string;
  waliTingkat: WaliTingkatItem[];
};

type ApiError = { success: false; message: string };

const TINGKAT_OPTIONS: {
  jenjang: "MTS" | "MA";
  tingkat: string;
  label: string;
}[] = [
  { jenjang: "MTS", tingkat: "VII", label: "MTs - Tingkat VII" },
  { jenjang: "MTS", tingkat: "VIII", label: "MTs - Tingkat VIII" },
  { jenjang: "MTS", tingkat: "IX", label: "MTs - Tingkat IX" },
  { jenjang: "MA", tingkat: "X", label: "MA - Tingkat X" },
  { jenjang: "MA", tingkat: "XI", label: "MA - Tingkat XI" },
  { jenjang: "MA", tingkat: "XII", label: "MA - Tingkat XII" },
];

const DEFAULT_FORM: UserFormData = {
  kodeAkses: "",
  password: "",
  nama: "",
  role: "GURU",
  jenisKelamin: "",
  tempatLahir: "",
  tanggalLahir: "",
  noTelp: "",
  jabatan: "",
  waliTingkat: [],
};

export function UserManagementView() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAktif, setFilterAktif] = useState("true");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM);
  const [editId, setEditId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [takenWali, setTakenWali] = useState<{ id: string; userId: string; jenjang: "MTS" | "MA"; tingkat: string }[]>([]);

  const fetchTakenWali = useCallback(async () => {
    try {
      const res = await api.get<{ success: true; data: { id: string; userId: string; jenjang: "MTS" | "MA"; tingkat: string }[] }>("/users/wali-terpakai");
      setTakenWali(res.data.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTakenWali();
  }, [fetchTakenWali]);

  const availableTingkatOptions = useMemo(() => {
    return TINGKAT_OPTIONS.filter((opt) => {
      const takenByOther = takenWali.find(
        (w) => w.jenjang === opt.jenjang && w.tingkat === opt.tingkat && (!editId || w.userId !== editId)
      );
      return !takenByOther;
    });
  }, [takenWali, editId]);

  useEffect(() => {
    setPage(1);
  }, [search, filterAktif]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterAktif !== "ALL") params.append("isAktif", filterAktif);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await api.get<{
        success: true;
        data: UserData[];
        total: number;
        totalPages: number;
      }>(`/users?${params.toString()}`);
      setUsers(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal memuat data guru");
    } finally {
      setLoading(false);
    }
  }, [search, filterAktif, page, limit]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const openAddModal = () => {
    setEditId(null);
    setFormData(DEFAULT_FORM);
    fetchTakenWali();
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserData) => {
    setEditId(user.id);
    setFormData({
      kodeAkses: user.kodeAkses,
      password: "",
      nama: user.nama,
      role: user.role,
      jenisKelamin: user.jenisKelamin || "",
      tempatLahir: user.tempatLahir || "",
      tanggalLahir: user.tanggalLahir ? user.tanggalLahir.split("T")[0]! : "",
      noTelp: user.noTelp || "",
      jabatan: user.jabatan || "",
      waliTingkat:
        user.waliTingkat?.map((w) => ({
          jenjang: w.jenjang,
          tingkat: w.tingkat,
        })) || [],
    });
    fetchTakenWali();
    setIsModalOpen(true);
  };

  const toggleWaliTingkat = (jenjang: "MTS" | "MA", tingkat: string) => {
    setFormData((prev) => {
      const exists = prev.waliTingkat.some(
        (w) => w.jenjang === jenjang && w.tingkat === tingkat,
      );
      if (exists) {
        return {
          ...prev,
          waliTingkat: prev.waliTingkat.filter(
            (w) => !(w.jenjang === jenjang && w.tingkat === tingkat),
          ),
        };
      } else {
        return {
          ...prev,
          waliTingkat: [...prev.waliTingkat, { jenjang, tingkat }],
        };
      }
    });
  };

  const generateKodeAkses = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let res = "";
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, kodeAkses: res }));
  };

  const handleResetPassword = async (user: UserData) => {
    try {
      const res = await api.post<{ data: { defaultPassword: string } }>(
        `/users/${user.id}/reset-password`,
      );
      toast.success(
        `Password berhasil direset! Default: ${res.data.data.defaultPassword}`,
      );
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal mereset password");
    }
  };

  const handleToggleStatus = async (user: UserData) => {
    try {
      await api.patch(`/users/${user.id}/status`);
      toast.success("Status akun guru berhasil diubah");
      fetchUsers();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal mengubah status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success("Guru berhasil dihapus");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(error.response?.data?.message ?? "Gagal menghapus guru");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: Record<string, unknown> = { ...formData };
    if (!formData.password) delete payload.password;
    if (!formData.jenisKelamin) payload.jenisKelamin = null;
    if (!formData.tempatLahir) payload.tempatLahir = null;
    if (!formData.tanggalLahir) payload.tanggalLahir = null;
    if (!formData.noTelp) payload.noTelp = null;
    if (!formData.jabatan) payload.jabatan = null;

    try {
      if (editId) {
        await api.put(`/users/${editId}`, payload);
        toast.success("Data guru berhasil diperbarui");
      } else {
        await api.post("/users", payload);
        toast.success("Guru baru berhasil ditambahkan");
      }
      setIsModalOpen(false);
      fetchUsers();
      fetchTakenWali();
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

  const desktopFilters = (
    <select
      value={filterAktif}
      onChange={(e) => setFilterAktif(e.target.value)}
      className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary cursor-pointer"
    >
      <option value="ALL">Semua Status (Aktif & Nonaktif)</option>
      <option value="true">Hanya Aktif</option>
      <option value="false">Hanya Nonaktif</option>
    </select>
  );

  const mobileFilters = (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)]">
        Status Akun
      </label>
      <select
        value={filterAktif}
        onChange={(e) => setFilterAktif(e.target.value)}
        className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none"
      >
        <option value="ALL">Semua Status</option>
        <option value="true">Aktif</option>
        <option value="false">Nonaktif</option>
      </select>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Manajemen Guru & Wali Kelas
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Kelola data akun pengajar, hak akses, dan penugasan wali kelas MTs &
            MA.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          Tambah Guru
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Module Toolbar */}
        <ModuleToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Cari Nama atau Kode Akses..."
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={() => setFilterAktif("true")}
        />

        {/* DataTable */}
        <DataTable
          loading={loading}
          data={users}
          headers={[
            "No",
            "Nama & Kontak",
            "Kode Akses",
            "Jabatan / Info",
            "Wali Kelas",
            "Status Akun",
            "Aksi",
          ]}
          minWidth="min-w-[850px]"
          emptyMessage="Tidak ada data guru yang ditemukan."
          emptyIcon={<User size={36} className="mx-auto mb-3 opacity-50" />}
          renderRow={(user, idx) => (
            <tr
              key={user.id}
              className="hover:bg-[var(--surface-subtle)]/50 transition-colors group"
            >
              <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">
                {(page - 1) * limit + idx + 1}
              </td>
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {user.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">
                      {user.nama}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {user.jenisKelamin || "—"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-5 font-mono text-[13px] font-semibold text-primary">
                {user.kodeAkses}
              </td>
              <td className="py-4 px-5 text-[var(--text-secondary)]">
                <p className="font-medium text-[13px] text-[var(--text-primary)]">
                  {user.jabatan || "-"}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {user.noTelp || "-"}
                </p>
              </td>
              <td className="py-4 px-5">
                {user.waliTingkat && user.waliTingkat.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {user.waliTingkat.map((wk) => (
                      <span
                        key={wk.id}
                        className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-subtle text-primary"
                      >
                        {wk.jenjang} - Tingkat {wk.tingkat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    —
                  </span>
                )}
              </td>
              <td className="py-4 px-5 text-center">
                <button
                  onClick={() => handleToggleStatus(user)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all hover:opacity-80 ${user.isAktif ? "bg-primary/10 text-primary border-primary/20" : "bg-rose-50 text-rose-600 border-rose-200"}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${user.isAktif ? "bg-primary" : "bg-rose-500"}`}
                  />
                  {user.isAktif ? "Aktif" : "Nonaktif"}
                </button>
              </td>
              <td className="py-4 px-5 text-right">
                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleResetPassword(user)}
                    className="p-2 text-[var(--text-secondary)] hover:text-amber-500 hover:bg-amber-50 rounded-md transition-all"
                    title="Reset Password"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 text-[var(--text-secondary)] hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )}
          renderMobileCard={(user) => (
            <div
              key={user.id}
              className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {user.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">
                      {user.nama}
                    </p>
                    <p className="text-[11px] font-mono text-primary font-semibold">
                      {user.kodeAkses}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleResetPassword(user)}
                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-md"
                    title="Reset Password"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-1.5 text-primary hover:bg-primary/10 rounded-md"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] p-2 rounded-lg">
                <span>{user.jabatan || "Guru Mapel"}</span>
                <button
                  onClick={() => handleToggleStatus(user)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${user.isAktif ? "bg-primary/10 text-primary border-primary/20" : "bg-rose-50 text-rose-600 border-rose-200"}`}
                >
                  {user.isAktif ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            </div>
          )}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={total}
          limit={limit}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editId ? "Edit Data Guru" : "Tambah Guru Baru"}
        description={
          editId
            ? "Perbarui informasi profil guru"
            : "Daftarkan guru baru ke sistem"
        }
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nama Guru */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
              Nama Lengkap & Gelar <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nama}
              onChange={(e) =>
                setFormData({ ...formData, nama: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary transition-all"
              placeholder="Contoh: Ustadz Ahmad Fauzi, S.Pd.I"
            />
          </div>

          {/* Kode Akses */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                Kode Akses Login (6 Karakter){" "}
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateKodeAkses}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Generate Otomatis
              </button>
            </div>
            <input
              type="text"
              required
              maxLength={6}
              value={formData.kodeAkses}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  kodeAkses: e.target.value.toUpperCase(),
                })
              }
              className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-mono uppercase text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary transition-all tracking-widest"
              placeholder="Contoh: GURU01"
            />
          </div>

          {/* Password (only on create) */}
          {!editId && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                Password (Opsional)
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary transition-all"
                placeholder="Kosongkan untuk default (Gr2026!)"
                minLength={6}
              />
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Jika dikosongkan, password otomatis menggunakan{" "}
                <strong className="text-[var(--text-primary)]">Gr2026!</strong>{" "}
                dan guru wajib mengubahnya saat login pertama.
              </p>
            </div>
          )}

          {/* Jabatan */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
              Jabatan
            </label>
            <input
              type="text"
              value={formData.jabatan}
              onChange={(e) =>
                setFormData({ ...formData, jabatan: e.target.value })
              }
              className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
              placeholder="Misal: Guru Mapel / Pembina OSIS"
            />
          </div>

          {/* Wali Kelas Selection (MA & MTs) */}
          <div className="p-4 rounded-xl border space-y-3 bg-primary-subtle border-border">
            <label className="text-[11px] font-bold uppercase tracking-wider block text-primary">
              Penugasan Wali Kelas (Bisa Pilih Banyak di MTs & MA)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {availableTingkatOptions.map((opt: { jenjang: "MTS" | "MA"; tingkat: string; label: string }) => {
                const checked = formData.waliTingkat.some(
                  (w) => w.jenjang === opt.jenjang && w.tingkat === opt.tingkat,
                );
                return (
                  <div
                    key={`${opt.jenjang}-${opt.tingkat}`}
                    onClick={() => toggleWaliTingkat(opt.jenjang, opt.tingkat)}
                    className={`p-2.5 rounded-lg border text-[12px] font-medium flex items-center gap-2 cursor-pointer transition-all ${
                      checked
                        ? "bg-primary text-white border-primary-hover"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] hover:border-primary"
                    }`}
                  >
                    {checked ? (
                      <CheckSquare size={14} className="shrink-0" />
                    ) : (
                      <Square size={14} className="shrink-0 opacity-50" />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jenis Kelamin & No Telp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                Jenis Kelamin
              </label>
              <select
                value={formData.jenisKelamin}
                onChange={(e) =>
                  setFormData({ ...formData, jenisKelamin: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="">— Belum Diset —</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                <Phone size={10} className="inline mr-1" />
                No. Telp / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.noTelp}
                onChange={(e) =>
                  setFormData({ ...formData, noTelp: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          {/* Tempat & Tanggal Lahir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                <MapPin size={10} className="inline mr-1" />
                Tempat Lahir
              </label>
              <input
                type="text"
                value={formData.tempatLahir}
                onChange={(e) =>
                  setFormData({ ...formData, tempatLahir: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
                placeholder="Kota / Kabupaten"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                <Calendar size={10} className="inline mr-1" />
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={formData.tanggalLahir}
                onChange={(e) =>
                  setFormData({ ...formData, tanggalLahir: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
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
              className="px-6 py-2.5 bg-primary text-white text-[13px] font-bold rounded-[var(--radius-md)] hover:bg-primary-hover disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> MENYIMPAN...
                </>
              ) : editId ? (
                "PERBARUI GURU"
              ) : (
                "SIMPAN GURU"
              )}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Guru?"
        message={`Apakah Anda yakin ingin menghapus akun ${deleteTarget?.nama}?`}
        isDeleting={isDeleting}
        confirmText="YA, HAPUS"
      />
    </div>
  );
}
