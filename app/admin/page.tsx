"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  Users,
  FileCheck,
  Megaphone,
  CalendarDays,
  ArrowUpRight,
  Loader2,
  GraduationCap,
  SlidersHorizontal,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import AttendanceTrendChart from "@/components/admin/AttendanceTrendChart";
import TopSalesWidget from "@/components/admin/TopSalesWidget";

type DashboardStats = {
  totalGuru: number;
  totalSiswa: number;
  totalKelas: number;
  totalMapel: number;
  guruHadirHariIni: number;
  persentaseGuruHadir: number;
  persentaseSiswaHadir: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalGuru: 45,
    totalSiswa: 420,
    totalKelas: 12,
    totalMapel: 18,
    guruHadirHariIni: 42,
    persentaseGuruHadir: 93.3,
    persentaseSiswaHadir: 92.5,
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [draftPengumuman, setDraftPengumuman] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");

  // Widget visibility state for dropdown
  const [isWidgetDropdownOpen, setIsWidgetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [widgets, setWidgets] = useState({
    statCards: true,
    trenGrafik: true,
    topKehadiran: true,
    monitoringGuru: true,
    kalenderDraft: true,
    statistikSistem: true,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWidgetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAdminDashboard = async () => {
      try {
        const [guruRekapRes, siswaRes, kelasRes, mapelRes, pengumumanDraftRes, laporanKehadiranRes] = await Promise.all([
          api.get<any>("/absensi-guru/admin/rekap").catch(() => null),
          api.get<any>("/siswa").catch(() => null),
          api.get<any>("/kelas").catch(() => null),
          api.get<any>("/mapel").catch(() => null),
          api.get<any>("/pengumuman?isPublished=false").catch(() => ({ data: { data: [] } })),
          api.get<any>("/laporan/kehadiran").catch(() => null),
        ]);

        let totalSiswaCount = 420;
        if (siswaRes?.data?.data) {
          totalSiswaCount = siswaRes.data.data.length || 420;
        }

        let totalKelasCount = 12;
        if (kelasRes?.data?.data) {
          totalKelasCount = kelasRes.data.data.length || 12;
        }

        let totalMapelCount = 18;
        if (mapelRes?.data?.data) {
          totalMapelCount = mapelRes.data.data.length || 18;
        }

        let persentaseSiswa = 92.5;
        if (laporanKehadiranRes?.data?.data?.grouped) {
          const grouped = laporanKehadiranRes.data.data.grouped;
          let totalHadir = 0;
          let totalSemua = 0;
          grouped.forEach((g: any) => {
            if (g.status === "HADIR") totalHadir += g._count.status;
            totalSemua += g._count.status;
          });
          if (totalSemua > 0) {
            persentaseSiswa = Number(((totalHadir / totalSemua) * 100).toFixed(1));
          }
        }

        if (guruRekapRes?.data?.data) {
          const d = guruRekapRes.data.data;
          setStats((prev) => ({
            ...prev,
            totalGuru: d.summary.totalGuru || prev.totalGuru,
            guruHadirHariIni: d.summary.totalHadir || prev.guruHadirHariIni,
            persentaseGuruHadir: d.summary.avgPersentase || prev.persentaseGuruHadir,
            persentaseSiswaHadir: persentaseSiswa,
            totalSiswa: totalSiswaCount,
            totalKelas: totalKelasCount,
            totalMapel: totalMapelCount,
          }));
        }

        const pengumumanData = pengumumanDraftRes?.data?.data;
        const pengumumanList = Array.isArray(pengumumanData)
          ? pengumumanData
          : (pengumumanData?.data && Array.isArray(pengumumanData.data) ? pengumumanData.data : []);
        setDraftPengumuman(pengumumanList);

        if (guruRekapRes?.data?.data?.rekapHarian) {
          const list = guruRekapRes.data.data.rekapHarian.slice(0, 5).map((item: any) => ({
            name: item.guru?.nama || "Guru",
            role: item.guru?.jabatan || "Pengajar",
            time: item.waktuAbsen ? new Date(item.waktuAbsen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " WIB" : "—",
            status: item.status === "HADIR" ? "Tepat Waktu" : item.status === "TELAT" ? "Terlambat" : "Belum Absen",
          }));
          setRecentAttendance(list);
        } else {
          setRecentAttendance([]);
        }
      } catch (err) {
        console.error("Admin dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminDashboard();
  }, []);

  const handlePublishDraft = async (id: string) => {
    try {
      await api.put(`/pengumuman/${id}/publish`);
      toast.success("Draft kalender berhasil dipublikasikan!");
      setDraftPengumuman((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error("Gagal mempublikasikan pengumuman");
    }
  };

  const filteredAttendance = recentAttendance.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "Semua" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ─── Header & Top Actions (Bahasa Indonesia) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)]">
            Ringkasan & Kendali Sekolah
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Statistik real-time kehadiran guru, murid, dan agenda akademik sekolah.
          </p>
        </div>
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          {/* Customize Widget Dropdown Toggle */}
          <button
            onClick={() => setIsWidgetDropdownOpen(!isWidgetDropdownOpen)}
            className="px-4 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl hover:bg-[var(--border-subtle)] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <SlidersHorizontal size={14} style={{ color: "var(--primary)" }} /> Atur Widget
          </button>

          {/* Dropdown Menu */}
          {isWidgetDropdownOpen && (
            <div className="absolute right-0 top-12 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-64 p-3 shadow-xl space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-2 pt-1">
                Tampilkan Widget:
              </p>
              {[
                { key: "statCards", label: "Kartu Statistik Utama" },
                { key: "trenGrafik", label: "Grafik Tren Kehadiran" },
                { key: "topKehadiran", label: "Top Kehadiran Kelas" },
                { key: "monitoringGuru", label: "Monitoring Kehadiran Guru" },
                { key: "kalenderDraft", label: "Draft Kalender Akademik" },
                { key: "statistikSistem", label: "Informasi & Statistik Sistem" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] cursor-pointer text-[12px] font-bold text-[var(--text-primary)]"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={(widgets as any)[item.key]}
                    onChange={(e) =>
                      setWidgets((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded cursor-pointer accent-[var(--primary)]"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      {widgets.statCards && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: "var(--primary-subtle)" }} />
            <div className="flex items-start justify-between mb-4">
              <span className="text-[13px] font-bold text-[var(--text-secondary)]">Kehadiran Guru Hari Ini</span>
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: "var(--primary-subtle)", color: "var(--primary)" }}><Users size={18} /></div>
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{stats.persentaseGuruHadir}%</p>
            <p className="text-[12px] font-bold mt-2 flex items-center gap-1" style={{ color: "var(--primary)" }}>
              <ArrowUpRight size={14} /> {stats.guruHadirHariIni} dari {stats.totalGuru} guru hadir
            </p>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between mb-4">
              <span className="text-[13px] font-bold text-[var(--text-secondary)]">Kehadiran Murid (Rata-rata)</span>
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl"><GraduationCap size={18} /></div>
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{stats.persentaseSiswaHadir}%</p>
            <p className="text-[12px] font-bold text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
              <ArrowUpRight size={14} /> Update terbaru dari sistem
            </p>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between mb-4">
              <span className="text-[13px] font-bold text-[var(--text-secondary)]">Total Siswa Aktif</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl"><FileCheck size={18} /></div>
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{stats.totalSiswa}</p>
            <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
              <ArrowUpRight size={14} /> Terbagi di {stats.totalKelas} Kelas
            </p>
          </div>
        </div>
      )}

      {/* ─── Main Analytics Section (Dynamic width & height handling) ─── */}
      {(widgets.trenGrafik || widgets.topKehadiran) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {widgets.trenGrafik && widgets.topKehadiran && (
            <>
              <div className="xl:col-span-2">
                <AttendanceTrendChart />
              </div>
              <div className="xl:col-span-1">
                <TopSalesWidget isFullWidth={false} />
              </div>
            </>
          )}

          {widgets.trenGrafik && !widgets.topKehadiran && (
            <div className="xl:col-span-3">
              <AttendanceTrendChart />
            </div>
          )}

          {!widgets.trenGrafik && widgets.topKehadiran && (
            <div className="xl:col-span-3">
              <TopSalesWidget isFullWidth={true} />
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom Table & Calendar Draft Section ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {widgets.monitoringGuru && (
          <div className="xl:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                Monitoring Kehadiran Guru Hari Ini
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Cari guru..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[var(--surface-subtle)] border border-[var(--border)] text-[12px] rounded-xl pl-9 pr-3 py-1.5 focus:outline-none text-[var(--text-primary)] w-44"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[var(--surface-subtle)] border border-[var(--border)] text-[12px] font-bold rounded-xl px-3 py-1.5 focus:outline-none text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Tepat Waktu">Tepat Waktu</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Belum Absen">Belum Absen</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    <th className="text-left pb-3">Guru</th>
                    <th className="text-left pb-3">Jabatan</th>
                    <th className="text-left pb-3">Jam Masuk</th>
                    <th className="text-right pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-[12px] text-[var(--text-tertiary)]">
                        Belum ada guru yang melakukan absensi pada hari ini.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((row) => {
                      const isOnTime = row.status === "Tepat Waktu";
                      const isLate = row.status === "Terlambat";
                      return (
                        <tr key={row.name} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px]" style={{ backgroundColor: "var(--primary-subtle)", color: "var(--primary)" }}>
                                {row.name.charAt(0)}
                              </div>
                              <span className="text-[13px] font-bold text-[var(--text-primary)]">{row.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-[12px] text-[var(--text-secondary)]">{row.role}</td>
                          <td className="py-3.5 pr-4 text-[12px] text-[var(--text-secondary)]">{row.time}</td>
                          <td className="py-3.5 text-right">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                                isOnTime
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : isLate
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/10 text-rose-500"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnTime ? "bg-emerald-500" : isLate ? "bg-amber-500" : "bg-rose-500"
                                }`}
                              />
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Right: Calendar Draft Approvals & System Summary */}
        <div className="space-y-6">
          {widgets.kalenderDraft && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CalendarDays size={16} style={{ color: "var(--primary)" }} /> Draft Kalender Akademik ({draftPengumuman.length})
              </h2>

              {draftPengumuman.length === 0 ? (
                <p className="text-center py-6 text-[12px] text-[var(--text-tertiary)]">Tidak ada draft kalender menunggu.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {draftPengumuman.map((item) => (
                    <div key={item.id} className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl space-y-2">
                      <p className="text-[13px] font-bold text-[var(--text-primary)] line-clamp-1">{item.judul}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{item.isi}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-[var(--text-tertiary)]">Menunggu Persetujuan</span>
                        <button
                          onClick={() => handlePublishDraft(item.id)}
                          className="px-3 py-1 text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                          style={{ backgroundColor: "var(--primary)" }}
                        >
                          PUBLISH
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {widgets.statistikSistem && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-3">
              <h2 className="text-[14px] font-bold text-[var(--text-primary)]">Statistik & Konfigurasi Sistem</h2>
              <div className="space-y-2 text-[12px] text-[var(--text-secondary)]">
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span>Total Kelas Aktif</span>
                  <span className="font-bold text-[var(--text-primary)]">{stats.totalKelas} Kelas</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span>Mata Pelajaran</span>
                  <span className="font-bold text-[var(--text-primary)]">{stats.totalMapel} Mapel</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Tahun Ajaran Aktif</span>
                  <span className="font-bold" style={{ color: "var(--primary)" }}>2025/2026 Ganjil</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
