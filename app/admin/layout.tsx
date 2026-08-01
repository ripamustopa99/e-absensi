"use client";

import { useState } from "react";
import { Sidebar, type NavSection } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  GraduationCap,
  CalendarRange,
  Presentation,
  BookOpen,
  UserCheck,
  Megaphone,
  HelpCircle,
  Settings,
  History,
} from "lucide-react";

const adminSections: NavSection[] = [
  {
    label: "Menu Utama",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Guru / Admin", href: "/admin/users", icon: Users },
      {
        name: "Siswa",
        icon: GraduationCap,
        subItems: [
          { name: "Siswa MTs", href: "/admin/siswa/mts" },
          { name: "Siswa MA", href: "/admin/siswa/ma" },
        ],
      },
      {
        name: "Mata Pelajaran",
        icon: BookOpen,
        subItems: [
          { name: "Mapel MA", href: "/admin/mapel/ma" },
          { name: "Mapel MTS", href: "/admin/mapel/mts" },
        ],
      },
      {
        name: "Jadwal",
        icon: CalendarDays,
        subItems: [
          { name: "Jadwal MTs", href: "/admin/jadwal/mts" },
          { name: "Jadwal MA", href: "/admin/jadwal/ma" },
        ],
      },
      {
        name: "Absensi",
        icon: UserCheck,
        subItems: [
          { name: "Absensi Siswa", href: "/admin/rekap/siswa" },
          { name: "Absensi Guru", href: "/admin/rekap/guru" },
        ],
      },
      {
        name: "Kalender Akademik",
        href: "/admin/kalender",
        icon: CalendarRange,
      },
      {
        name: "Log Aktivitas",
        href: "/admin/log-aktivitas",
        icon: History,
      },
      {
        name: "Pengumuman",
        href: "/admin/pengumuman",
        icon: Megaphone,
      },
      {
        name: "Pusat Bantuan",
        href: "/admin/bantuan",
        icon: HelpCircle,
      },
      {
        name: "Pengaturan",
        href: "/admin/setting",
        icon: Settings,
      },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen flex w-full bg-[var(--bg)] relative">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sections={adminSections}
      />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={() => setIsLogoutModalOpen(true)}
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
                className="flex-1 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
