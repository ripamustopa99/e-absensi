/* eslint-disable */
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { History, Shield } from "lucide-react";
import type { AxiosError } from "axios";
import ModuleToolbar from "@/components/shared/ModuleToolbar";
import DataTable from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";

type LogItem = {
  id: string;
  aksi: string;
  modul: string;
  detail: any;
  ipAddress: string | null;
  createdAt: string;
  user_id: string;
  user_nama: string;
  user_role: string;
  user_kode: string;
};

export default function AdminLogAktivitasPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterModul, setFilterModul] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterModul !== "ALL") params.append("modul", filterModul);

      const res = await api.get<{ success: true; data: { logs: LogItem[]; pagination: any } }>(
        `/admin/log-aktivitas?${params.toString()}`
      );
      setLogs(res.data.data.logs);
      setTotalPages(res.data.data.pagination.totalPages);
      setTotalItems(res.data.data.pagination.totalItems);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat log aktivitas");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterModul, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setFilterModul("ALL");
    setSearchQuery("");
    setPage(1);
  };

  const desktopFilters = (
    <select
      value={filterModul}
      onChange={(e) => {
        setFilterModul(e.target.value);
        setPage(1);
      }}
      className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-primary cursor-pointer shadow-sm"
    >
      <option value="ALL">Semua Modul</option>
      <option value="Auth">Auth (Login/Logout)</option>
      <option value="Siswa">Siswa</option>
      <option value="Absensi">Absensi</option>
      <option value="Jadwal">Jadwal</option>
      <option value="Pengumuman">Pengumuman</option>
      <option value="Setting">Setting</option>
    </select>
  );

  const mobileFilters = (
    <div className="space-y-4 text-[13px]">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Modul</label>
        <select
          value={filterModul}
          onChange={(e) => {
            setFilterModul(e.target.value);
            setPage(1);
          }}
          className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-bold text-primary outline-none shadow-sm cursor-pointer"
        >
          <option value="ALL">Semua Modul</option>
          <option value="Auth">Auth</option>
          <option value="Siswa">Siswa</option>
          <option value="Absensi">Absensi</option>
          <option value="Jadwal">Jadwal</option>
          <option value="Pengumuman">Pengumuman</option>
          <option value="Setting">Setting</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-[var(--radius-md)] text-primary">
              <History size={24} />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
              Log Aktivitas Sistem (Audit Trail)
            </h1>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Pantau riwayat aktivitas dan tindakan yang dilakukan oleh pengguna di dalam aplikasi.
          </p>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <ModuleToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Cari nama pengguna, aksi, atau modul..."
          desktopFilters={desktopFilters}
          mobileFilters={mobileFilters}
          onResetFilters={handleResetFilters}
        />

        <DataTable
          loading={loading}
          data={logs}
          headers={["Pengguna", "Modul & Aksi", "Waktu & Tanggal", "IP Address", "Detail"]}
          minWidth="min-w-[900px]"
          emptyMessage="Belum ada log aktivitas yang tercatat."
          emptyIcon={<History size={36} className="mx-auto mb-3 opacity-50 text-[var(--text-tertiary)]" />}
          renderRow={(log) => (
            <tr key={log.id} className="hover:bg-[var(--surface-subtle)]/60 transition-colors">
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[13px] shrink-0">
                    {log.user_nama.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">{log.user_nama}</p>
                    <p className="text-[11px] font-medium text-[var(--text-tertiary)] flex items-center gap-1">
                      <Shield size={11} /> {log.user_role} ({log.user_kode || '-'})
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-black uppercase bg-primary/10 text-primary">
                    {log.modul}
                  </span>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">{log.aksi}</p>
                </div>
              </td>
              <td className="py-4 px-4">
                <p className="text-[12px] font-medium text-[var(--text-primary)]">
                  {new Date(log.createdAt).toLocaleDateString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {new Date(log.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                </p>
              </td>
              <td className="py-4 px-4">
                <span className="text-[12px] font-mono text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                  {log.ipAddress || "127.0.0.1"}
                </span>
              </td>
              <td className="py-4 px-5">
                <p className="text-[12px] text-[var(--text-secondary)] max-w-xs truncate font-mono bg-[var(--surface-subtle)] p-1.5 rounded">
                  {log.detail ? JSON.stringify(log.detail) : "-"}
                </p>
              </td>
            </tr>
          )}
          renderMobileCard={(log) => (
            <div key={log.id} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-2.5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[12px]">
                    {log.user_nama.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">{log.user_nama}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{log.user_role}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/10 text-primary">
                  {log.modul}
                </span>
              </div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">{log.aksi}</p>
              <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-subtle)]">
                <span>{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                <span className="font-mono">{log.ipAddress || "127.0.0.1"}</span>
              </div>
            </div>
          )}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          total={totalItems}
          limit={limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
