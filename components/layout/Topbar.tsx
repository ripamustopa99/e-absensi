/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { Bell, BellRing, Menu, Sun, Moon, LogOut, UserCircle, Settings, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

interface TopbarProps {
  onMenuClick: () => void;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  onLogout?: () => void;
}

export function Topbar({ onMenuClick, user, onLogout }: TopbarProps) {
  const { theme: _theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [_systemAlerts, _setSystemAlerts] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [currentMode, setCurrentMode] = useState("light");
  const [defaultLightVariant, setDefaultLightVariant] = useState("light");
  const [defaultDarkVariant, setDefaultDarkVariant] = useState("dark");
  void _theme; void _systemAlerts; void _setSystemAlerts;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchProfileAndUnread = async () => {
    try {
      const profileRes = await api.get<{ data: any }>("/profile/me");
      setUserProfile(profileRes.data.data);

      const notifUnreadRes = await api.get<{ data: { unreadCount: number } }>("/notifikasi/unread-count").catch(() => ({ data: { data: { unreadCount: 0 } } }));
      setUnreadCount(notifUnreadRes.data?.data?.unreadCount || 0);
    } catch (err) {
      console.error("Topbar fetch error:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("app_brightness_mode") || "light";
    setCurrentMode(savedMode);
    fetchProfileAndUnread();

    api.get("/public/setting/config").then((res: any) => {
      if (res.data) {
        if (res.data.defaultLightVariant) setDefaultLightVariant(res.data.defaultLightVariant);
        if (res.data.defaultDarkVariant) setDefaultDarkVariant(res.data.defaultDarkVariant);
      }
    }).catch(() => {});

    const handleProfileUpdate = () => {
      fetchProfileAndUnread();
    };
    window.addEventListener("profile-updated", handleProfileUpdate);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = currentMode === "dark" || currentMode === "dark-darker";
    const nextMode = isCurrentlyDark ? defaultLightVariant : defaultDarkVariant;
    setCurrentMode(nextMode);
    document.documentElement.classList.remove("light", "light-lighter", "dark", "dark-darker");
    document.documentElement.classList.add(nextMode);
    localStorage.setItem("app_brightness_mode", nextMode);
    setTheme(isCurrentlyDark ? "light" : "dark");
  };

  const pathSegments = pathname.split("/").filter(Boolean);

  const resolvedRole = userProfile?.role || (pathname.startsWith("/admin") ? "ADMIN" : "GURU");
  const profileBasePath = resolvedRole === "ADMIN" ? "/admin" : "/guru";

  const profileData = {
    name: userProfile?.nama || user?.name || "Pengguna",
    avatar: userProfile?.foto || user?.avatar || undefined,
    role: userProfile?.jabatan || (resolvedRole === "ADMIN" ? "Administrator" : "Guru"),
  };

  useEffect(() => {
    setImageError(false);
  }, [profileData.avatar]);

  const handleToggleNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    setDropdownOpen(false);
    if (nextOpen) {
      try {
        const res = await api.get<{ data: any[] }>("/notifikasi").catch(() => ({ data: { data: [] } }));
        const list = (res.data as any).data ?? (Array.isArray(res.data) ? res.data : []);
        setRecentAnnouncements(list);
        
        await api.post("/notifikasi/mark-read").catch(() => {});
        setUnreadCount(0);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    setNotificationsOpen(false);
    onLogout?.();
  };

  return (
    <header className="h-14 flex items-center justify-between px-5 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={18} />
        </button>

        {pathSegments.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1.5 text-[12px] capitalize">
            {pathSegments.map((segment, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[var(--text-tertiary)]">/</span>}
                <span
                  className={
                    i === pathSegments.length - 1
                      ? "font-semibold text-[var(--text-primary)]"
                      : "text-[var(--text-tertiary)]"
                  }
                >
                  {segment}
                </span>
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] border border-[var(--border)] transition-colors cursor-pointer"
          aria-label="Switch Theme"
          title="Ubah Tema Terang/Gelap"
        >
          {mounted && (currentMode === "dark" || currentMode === "dark-darker") ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleToggleNotifications}
            className="relative p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] border border-[var(--border)] transition-colors cursor-pointer"
            aria-label="Notifikasi Pengumuman"
            title="Pengumuman Terbaru"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing size={16} className="text-primary" />
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Notifikasi Terbaru</h4>
                </div>
              </div>

              <div className="max-h-[280px] overflow-y-auto divide-y divide-[var(--border-subtle)] custom-scrollbar">
                {recentAnnouncements.length === 0 ? (
                  <p className="text-center py-6 text-[12px] text-[var(--text-tertiary)]">Tidak ada notifikasi.</p>
                ) : (
                  recentAnnouncements.map((item) => {
                    const isUnattended = item.type === 'unattended' || item.type === 'missed';
                    const isBantuan = item.type === 'bantuan';
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (item.type === 'announcement') {
                            router.push(`${profileBasePath}/pengumuman`);
                          } else if (isBantuan) {
                            router.push(`${profileBasePath}/bantuan`);
                          } else if (isUnattended) {
                            router.push(`${profileBasePath}/absensi`);
                          }
                        }}
                        className={`p-3 hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors ${
                          isUnattended ? 'bg-amber-500/10' : isBantuan ? 'bg-blue-500/10' : ''
                        }`}
                      >
                        <p className="text-[12px] font-bold text-[var(--text-primary)] line-clamp-1">{item.judul}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">{item.isi}</p>
                        <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-[1px] bg-[var(--border)] mx-0.5" />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-[var(--radius-sm)] hover:bg-[var(--surface-subtle)] transition-colors text-left cursor-pointer"
            aria-expanded={dropdownOpen}
          >
            <div className="w-7 h-7 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] font-medium text-xs overflow-hidden">
              {!userProfile ? (
                <Loader2 size={14} className="animate-spin text-primary" />
              ) : profileData.avatar && !imageError ? (
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-primary text-white font-bold text-[13px]">
                  {profileData.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="hidden md:block leading-tight">
              {!userProfile ? (
                <div className="space-y-1 w-20">
                  <div className="h-3 bg-[var(--border-subtle)] rounded animate-pulse w-full" />
                  <div className="h-2 bg-[var(--border-subtle)] rounded animate-pulse w-3/4" />
                </div>
              ) : (
                <>
                  <span className="block text-[13px] font-medium text-[var(--text-primary)]">
                    {profileData.name}
                  </span>
                  <span className="block text-[11px] text-[var(--text-tertiary)] capitalize">
                    {profileData.role}
                  </span>
                </>
              )}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-lg py-1.5 z-50 text-[13px]">
              <div className="px-3 py-2 border-b border-[var(--border)] md:hidden">
                <p className="font-medium text-[var(--text-primary)]">{profileData.name}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">{profileData.role}</p>
              </div>

              <a
                href={`${profileBasePath}/profil`}
                className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <UserCircle size={14} />
                <span>Profil Saya</span>
              </a>

              {resolvedRole === "ADMIN" && (
                <a
                  href="/admin/setting"
                  className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={14} />
                  <span>Pengaturan</span>
                </a>
              )}

              <div className="h-[1px] bg-[var(--border)] my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
