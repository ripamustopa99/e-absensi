/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { Sidebar, type NavSection } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Clock,
  TrendingUp,
  Megaphone,
  HelpCircle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import Modal from "@/components/shared/Modal";

const guruSections: NavSection[] = [
  {
    label: "Menu Utama",
    items: [
      { name: "Dashboard", href: "/guru", icon: LayoutDashboard },
      { name: "Jadwal Mengajar", href: "/guru/jadwal", icon: Calendar },
      {
        name: "Absensi Siswa",
        href: "/guru/absensi",
        icon: CheckSquare,
      },
      {
        name: "Riwayat Absensi",
        href: "/guru/riwayat",
        icon: Clock,
      },
      {
        name: "Rekap Absensi",
        icon: TrendingUp,
        subItems: [
          { name: "Rekap Siswa", href: "/guru/rekap/siswa" },
          { name: "Kehadiran Saya", href: "/guru/rekap/saya" },
        ],
      },
      {
        name: "Pengumuman",
        href: "/guru/pengumuman",
        icon: Megaphone,
      },
      {
        name: "Pusat Bantuan",
        href: "/guru/bantuan",
        icon: HelpCircle,
      },
    ],
  },
];

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [mustChangePass, setMustChangePass] = useState(false);
  const [userName, setUserName] = useState("Guru");
  const [_userAvatar, setUserAvatar] = useState<string | null>(null);
  void _userAvatar; void setUserAvatar;

  // Password change modal state
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

  const checkProfile = async () => {
    try {
      const res = await api.get<{
        data: { nama: string; foto: string | null; mustChangePass: boolean };
      }>("/profile/me");
      setUserName(res.data.data.nama);
      setUserAvatar(res.data.data.foto);
      if (res.data.data.mustChangePass) {
        setMustChangePass(true);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    checkProfile();
    const handleProfileUpdate = () => {
      checkProfile();
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const confirmLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Continue logout even if backend is offline
    } finally {
      setIsLogoutModalOpen(false);
      localStorage.removeItem("accessToken");
      router.push("/login");
      router.refresh();
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.old || !passwordForm.new || !passwordForm.confirm) {
      toast.error("Mohon lengkapi semua kolom password");
      return;
    }

    if (passwordForm.new.length < 6 || passwordForm.new.length > 18) {
      toast.error("Password baru harus 6 - 18 karakter");
      return;
    }
    let typesCount = 0;
    if (/[a-z]/.test(passwordForm.new)) typesCount++;
    if (/[A-Z]/.test(passwordForm.new)) typesCount++;
    if (/[0-9]/.test(passwordForm.new)) typesCount++;
    if (/[^A-Za-z0-9]/.test(passwordForm.new)) typesCount++;
    if (typesCount < 3) {
      toast.error(
        "Password baru harus mengandung minimal 3 jenis karakter (huruf besar, huruf kecil, angka, atau simbol)",
      );
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
      setMustChangePass(false);
      setPasswordForm({ old: "", new: "", confirm: "" });
      toast.success(
        "Password berhasil diperbarui! Anda sekarang dapat mengakses aplikasi.",
      );
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

  return (
    <div className="min-h-screen flex w-full bg-[var(--bg)] relative">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sections={guruSections}
      />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={() => setIsLogoutModalOpen(true)}
          user={{
            name: userName,
            role: ".......",
          }}
        />
        <div className="flex-1 overflow-auto p-5 lg:p-7">{children}</div>
      </main>

      {/* Root Logout Modal covering Sidebar and Topbar */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface)] w-full max-w-xs rounded-2xl shadow-2xl p-6 border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              Konfirmasi Keluar
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Apakah Anda yakin ingin keluar dari sistem?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forced Password Change Modal (Non-dismissible, using shared Modal) */}
      <Modal
        isOpen={mustChangePass}
        onClose={() => {}}
        title="Wajib Ubah Password"
        description="Anda login menggunakan password sementara. Silakan ubah password Anda untuk melanjutkan."
        maxWidth="md"
      >
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Password Sementara (Lama)
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
                placeholder="Masukkan password sementara"
                className="w-full pl-4 pr-10 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                required
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
              Password Baru (6-18 Karakter)
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
                placeholder="Min 6, maks 18 karakter"
                className="w-full pl-4 pr-10 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                required
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
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Wajib mengandung minimal 3 jenis karakter (Huruf Besar,
              Huruf Kecil, Angka, Simbol).
            </p>
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
                placeholder="Ulangi password baru"
                className="w-full pl-4 pr-10 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                required
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
              type="submit"
              disabled={isSavingPassword}
              className="w-full py-2.5 text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSavingPassword && (
                <Loader2 size={16} className="animate-spin" />
              )}{" "}
              Simpan & Lanjutkan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
