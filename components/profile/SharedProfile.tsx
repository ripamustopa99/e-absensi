"use client";

import { useEffect, useState, useRef } from "react";
import {
  UserCircle2,
  MapPin,
  Phone,
  Briefcase,
  Edit,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AxiosError } from "axios";
import Modal from "@/components/shared/Modal";

type ProfileData = {
  id: string;
  kodeAkses: string | null;
  nama: string;
  email?: string;
  role: string;
  jenisKelamin: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  noTelp: string | null;
  jabatan: string | null;
  foto: string | null;
  mapelDiampu?: { id: string; nama: string }[];
  waliTingkat?: { id: string; jenjang: string; tingkat: string }[];
};

export default function SharedProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nama: "",
    noTelp: "",
    tempatLahir: "",
    tanggalLahir: "",
    jenisKelamin: "",
    jabatan: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    old: "",
    new: "",
    confirm: "",
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get<{ data: ProfileData }>("/profile/me");
      setProfile(res.data.data);
      setEditForm({
        nama: res.data.data.nama || "",
        noTelp: res.data.data.noTelp || "",
        tempatLahir: res.data.data.tempatLahir || "",
        tanggalLahir: res.data.data.tanggalLahir
          ? res.data.data.tanggalLahir.split("T")[0]
          : "",
        jenisKelamin: res.data.data.jenisKelamin || "",
        jabatan: res.data.data.jabatan || "",
      });
    } catch {
      toast.error("Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditProfilePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    setLoading(true);
    try {
      const res = await api.post<{ data: { foto: string } }>(
        "/profile/photo",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setProfile((prev) =>
        prev ? { ...prev, foto: res.data.data.foto } : null,
      );
      toast.success("Foto profil berhasil diperbarui!");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      if (!error.response || error.code === 'ECONNABORTED' || !navigator.onLine) {
        toast.error("Koneksi internet tidak stabil. Gagal mengunggah foto profil.");
      } else {
        toast.error(error.response?.data?.message || "Gagal mengunggah foto");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        tanggalLahir: editForm.tanggalLahir ? editForm.tanggalLahir : null,
        jenisKelamin: editForm.jenisKelamin ? editForm.jenisKelamin : null,
      };
      const res = await api.put<{ data: ProfileData }>(
        "/profile/update",
        payload,
      );
      setProfile(res.data.data);
      setIsEditModalOpen(false);
      toast.success("Profil berhasil diperbarui!");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memperbarui profil");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.old || !passwordForm.new || !passwordForm.confirm) {
      toast.error("Mohon lengkapi semua kolom password");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("Konfirmasi password tidak cocok dengan password baru");
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.put("/profile/password", {
        oldPassword: passwordForm.old,
        newPassword: passwordForm.new,
      });
      setIsPasswordModalOpen(false);
      setPasswordForm({ old: "", new: "", confirm: "" });
      toast.success("Password berhasil diperbarui!");
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(
        error.response?.data?.message ?? "Gagal memperbarui password",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading && !profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ─── Page Header ─── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" style={{ backgroundColor: "var(--primary-subtle)" }} />

        <div className="relative shrink-0">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-[var(--surface)] shadow-lg overflow-hidden bg-[var(--surface-subtle)]">
            <Image
              src={
                profile.foto ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nama)}&background=0FBE85&color=fff&size=256`
              }
              alt="Foto Profil"
              width={128}
              height={128}
              unoptimized={true}
              className="object-cover w-full h-full"
            />
          </div>
          <button
            onClick={handleEditProfilePhoto}
            className="absolute bottom-1 right-1 w-8 h-8 bg-white dark:bg-[#2A2A2A] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-primary transition-colors shadow-sm cursor-pointer"
            title="Ganti Foto"
          >
            <Edit size={14} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>

        <div className="flex-1 text-center md:text-left z-10 mt-2 md:mt-0">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            {profile.nama}
          </h1>
          <p className="text-[14px] font-medium text-[var(--text-secondary)] mt-1.5 flex items-center justify-center md:justify-start gap-2">
            <Briefcase size={14} style={{ color: "var(--primary)" }} />
            {profile.jabatan ??
              (profile.role === "ADMIN" ? "Administrator" : "Guru")}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] hover:bg-[var(--border-subtle)] text-[13px] font-bold text-[var(--text-primary)] rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <UserCircle2 size={16} /> Edit Profil
            </button>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-transparent border border-[var(--border)] hover:border-primary hover:text-primary text-[13px] font-bold text-[var(--text-secondary)] rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <KeyRound size={16} /> Ubah Password
            </button>
          </div>
        </div>
      </div>

      {/* ─── Details Grid ─── */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
          <h2 className="text-[14px] font-bold text-[var(--text-primary)]">
            Informasi Personal & Akademik
          </h2>
        </div>
        <div className="p-0">
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
            <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
              <div className="px-6 py-5">
                <dt className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  Nama Lengkap
                </dt>
                <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                  {profile.nama}
                </dd>
              </div>
              <div className="px-6 py-5">
                <dt className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  Kode Akses
                </dt>
                <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                  {profile.kodeAkses ?? "-"}
                </dd>
              </div>
              <div className="px-6 py-5">
                <dt className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  Jenis Kelamin
                </dt>
                <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                  {profile.jenisKelamin === "L"
                    ? "Laki-Laki"
                    : profile.jenisKelamin === "P"
                      ? "Perempuan"
                      : "-"}
                </dd>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
              <div className="px-6 py-5">
                <dt className="text-[11px] font-bold text-[var(--text-tertiary)] flex items-center gap-1.5 uppercase tracking-wider mb-1">
                  <MapPin size={12} /> Tempat, Tanggal Lahir
                </dt>
                <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                  {profile.tempatLahir ?? "-"},{" "}
                  {profile.tanggalLahir
                    ? new Date(profile.tanggalLahir).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "long", year: "numeric" },
                      )
                    : "-"}
                </dd>
              </div>
              <div className="px-6 py-5">
                <dt className="text-[11px] font-bold text-[var(--text-tertiary)] flex items-center gap-1.5 uppercase tracking-wider mb-1">
                  <Phone size={12} /> Nomor Telepon
                </dt>
                <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                  {profile.noTelp ?? "-"}
                </dd>
              </div>
              <div className="px-6 py-5">
                <dt className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  Jabatan
                </dt>
                <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                  {profile.jabatan ?? "-"}
                </dd>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
              {profile.mapelDiampu !== undefined && (
                <div className="px-6 py-5">
                  <dt className="text-[11px] font-bold text-[var(--text-tertiary)] flex items-center gap-1.5 uppercase tracking-wider mb-1">
                    <BookOpen size={12} /> Mata Pelajaran Diampu
                  </dt>
                  <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                    {profile.mapelDiampu.length > 0
                      ? profile.mapelDiampu.map((m) => m.nama).join(", ")
                      : "-"}
                  </dd>
                </div>
              )}
              <div className="px-6 py-5">
                <dt className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  Jabatan Sistem
                </dt>
                <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                  {profile.jabatan ?? "-"}
                </dd>
              </div>
              {profile.waliTingkat !== undefined && (
                <div className="px-6 py-5">
                  <dt className="text-[11px] font-bold text-[var(--text-tertiary)] flex items-center gap-1.5 uppercase tracking-wider mb-1">
                    <GraduationCap size={12} /> Wali Tingkat
                  </dt>
                  <dd className="text-[14px] font-bold text-[var(--text-primary)]">
                    {profile.waliTingkat.length > 0
                      ? profile.waliTingkat.map((w) => `${w.jenjang} - ${w.tingkat}`).join(", ")
                      : "-"}
                  </dd>
                </div>
              )}
            </div>
          </dl>
        </div>
      </div>

      {/* ─── Modal Edit Profil (Using Reusable Modal) ─── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Informasi Profil"
        description="Perbarui informasi profil Anda"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={editForm.nama}
              onChange={(e) =>
                setEditForm({ ...editForm, nama: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Tempat Lahir
              </label>
              <input
                type="text"
                value={editForm.tempatLahir}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    tempatLahir: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={editForm.tanggalLahir}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    tanggalLahir: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={editForm.noTelp}
                onChange={(e) =>
                  setEditForm({ ...editForm, noTelp: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Jenis Kelamin
              </label>
              <select
                value={editForm.jenisKelamin}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    jenisKelamin: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="">Pilih</option>
                <option value="L">Laki-Laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--surface-subtle)] -mx-6 -mb-6 mt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-5 py-2 text-white text-[13px] font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSavingEdit && (
                <Loader2 size={14} className="animate-spin" />
              )}{" "}
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal Ubah Password (Using Reusable Modal) ─── */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Ubah Password"
        description="Perbarui kata sandi akun Anda"
        maxWidth="md"
      >
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Password Lama
            </label>
            <div className="relative">
              <input
                type={showPassword.old ? "text" : "password"}
                value={passwordForm.old}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    old: e.target.value,
                  })
                }
                className="w-full pl-4 pr-10 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("old")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] cursor-pointer"
              >
                {showPassword.old ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--primary)" }}>
              Password Baru
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? "text" : "password"}
                value={passwordForm.new}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    new: e.target.value,
                  })
                }
                className="w-full pl-4 pr-10 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] cursor-pointer"
              >
                {showPassword.new ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--primary)" }}>
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? "text" : "password"}
                value={passwordForm.confirm}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirm: e.target.value,
                  })
                }
                className="w-full pl-4 pr-10 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] cursor-pointer"
              >
                {showPassword.confirm ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--surface-subtle)] -mx-6 -mb-6 mt-4">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border)] rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingPassword}
              className="px-5 py-2 text-white text-[13px] font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSavingPassword && (
                <Loader2 size={14} className="animate-spin" />
              )}{" "}
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
