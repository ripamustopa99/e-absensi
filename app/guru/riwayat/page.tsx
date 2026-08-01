"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";
import { Search, CalendarDays, BookOpen, Clock, Loader2, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { AxiosError } from "axios";

// --- Types ---
type SessionStats = {
  HADIR: number;
  IZIN: number;
  SAKIT: number;
  ALPA: number;
};

type SessionRiwayat = {
  id: string;
  jadwalId: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  mapel: string;
  kelas: string;
  isEditable: boolean;
  stats: SessionStats;
};

type TahunAjaran = {
  id: string;
  label: string;
  isAktif: boolean;
};

type ApiResponse = {
  success: true;
  data: {
    tahunAjaranId: string;
    semester: string;
    sessions: SessionRiwayat[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
};

export default function RiwayatSiswaPage() {
  const router = useRouter();
  const [data, setData] = useState<SessionRiwayat[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>(""); // format: `${tahunAjaranId}_${semester}`
  const [search, setSearch] = useState("");

  const semesterOptions = useMemo(() => {
    const options: { id: string; label: string; tahunAjaranId: string; semester: string; isAktif: boolean }[] = [];
    tahunAjaranList.forEach((ta) => {
      options.push({
        id: `${ta.id}_GANJIL`,
        label: `${ta.label} (Ganjil)`,
        tahunAjaranId: ta.id,
        semester: 'GANJIL',
        isAktif: ta.isAktif,
      });
      options.push({
        id: `${ta.id}_GENAP`,
        label: `${ta.label} (Genap)`,
        tahunAjaranId: ta.id,
        semester: 'GENAP',
        isAktif: ta.isAktif,
      });
    });
    return options;
  }, [tahunAjaranList]);

  const fetchRiwayat = async (tahunAjaranId?: string, semester?: string, pageNum = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tahunAjaranId) params.append("tahunAjaranId", tahunAjaranId);
      if (semester) params.append("semester", semester);
      params.append("page", pageNum.toString());
      params.append("limit", limit.toString());
      const res = await api.get<ApiResponse>(`/absensi-siswa/riwayat?${params.toString()}`);
      setData(res.data.data.sessions);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages || 1);
      setPage(res.data.data.page || pageNum);
      if (res.data.data.tahunAjaranId && res.data.data.semester && !selectedOption) {
        setSelectedOption(`${res.data.data.tahunAjaranId}_${res.data.data.semester}`);
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message ?? "Gagal memuat riwayat absensi siswa");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tahun Ajaran and auto-select active
  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const res = await api.get<{ success: true; data: TahunAjaran[] }>("/tahun-ajaran");
        if (res.data.success && res.data.data.length > 0) {
          const list = res.data.data;
          setTahunAjaranList(list);
          const active = list.find((t) => t.isAktif) || list[0];
          if (active && !selectedOption) {
            const now = new Date();
            const month = now.getMonth() + 1;
            const currentSemester = (month >= 7 && month <= 12) ? "GANJIL" : "GENAP";
            setSelectedOption(`${active.id}_${currentSemester}`);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchTahunAjaran();
    fetchRiwayat(undefined, undefined, 1);
  }, []);

  useEffect(() => {
    if (selectedOption) {
      const [tahunAjaranId, semester] = selectedOption.split("_");
      if (tahunAjaranId && semester) {
        setPage(1);
        fetchRiwayat(tahunAjaranId, semester, 1);
      }
    }
  }, [selectedOption]);

  const filteredData = data.filter((item) => {
    const query = search.toLowerCase();
    return item.mapel.toLowerCase().includes(query) || item.kelas.toLowerCase().includes(query);
  });

  const handleClickSession = (session: SessionRiwayat) => {
    router.push(`/guru/absensi/${session.jadwalId}?tanggal=${session.tanggal}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <UserCheck size={28} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">Riwayat Absensi Siswa</h1>
            <p className="text-[14px] font-medium text-[var(--text-secondary)] mt-0.5">Lihat dan edit kembali data kehadiran siswa yang telah Anda ajarkan.</p>
          </div>
        </div>

        <div className="flex flex-row items-center gap-3 relative z-10 w-full sm:w-auto">
          <select 
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
            className="flex-1 min-w-[220px] px-4 py-2.5 bg-white dark:bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
          >
            {semesterOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} {opt.isAktif ? "(Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Cari Mata Pelajaran atau Kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable
          loading={loading}
          data={filteredData}
          headers={["Tanggal & Waktu", "Kelas & Mapel", "Hadir", "Sakit", "Izin", "Alpa", "Aksi"]}
          emptyMessage="Tidak ada sesi mengajar ditemukan."
          minWidth="min-w-[800px]"
          renderRow={(item) => {
            const dateObj = new Date(item.tanggal);
            const dateFormatted = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <tr key={item.id} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                <td className="py-4 px-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-bold text-[var(--text-primary)] whitespace-nowrap">{dateFormatted}</span>
                    <span className="text-[12px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5 whitespace-nowrap">
                      <Clock size={12} className="text-blue-500 shrink-0" /> {item.waktuMulai} - {item.waktuSelesai}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <BookOpen size={14} className="text-purple-500" /> {item.mapel}
                    </span>
                    <span className="text-[12px] font-bold text-[var(--text-tertiary)]">
                      Kelas {item.kelas}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="inline-block px-3 py-1 bg-[#0FBE85]/10 text-[#0FBE85] border border-[#0FBE85]/20 font-bold text-[13px] rounded-md">
                    {item.stats.HADIR}
                  </span>
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold text-[13px] rounded-md">
                    {item.stats.SAKIT}
                  </span>
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-[13px] rounded-md">
                    {item.stats.IZIN}
                  </span>
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold text-[13px] rounded-md">
                    {item.stats.ALPA}
                  </span>
                </td>
                <td className="py-4 px-5 text-right">
                  <button
                    onClick={() => handleClickSession(item)}
                    className="text-[12px] font-bold text-[#0FBE85] hover:underline cursor-pointer"
                  >
                    Lihat
                  </button>
                </td>
              </tr>
            );
          }}
          renderMobileCard={(item) => {
            const dateObj = new Date(item.tanggal);
            const dateFormatted = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div key={item.id} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">{dateFormatted}</span>
                    <p className="text-[14px] font-bold text-[var(--text-primary)] mt-1">{item.mapel} - Kelas {item.kelas}</p>
                    <p className="text-[12px] text-[var(--text-secondary)]">{item.waktuMulai} - {item.waktuSelesai}</p>
                  </div>
                  <button
                    onClick={() => handleClickSession(item)}
                    className="px-3 py-1.5 bg-[#0FBE85]/10 text-[#0FBE85] rounded-lg text-[12px] font-bold"
                  >
                    Lihat
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] text-center text-[12px]">
                  <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                    <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Hadir</span>
                    <span className="font-bold text-[#0FBE85]">{item.stats.HADIR}</span>
                  </div>
                  <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                    <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Sakit</span>
                    <span className="font-bold text-amber-500">{item.stats.SAKIT}</span>
                  </div>
                  <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                    <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Izin</span>
                    <span className="font-bold text-blue-500">{item.stats.IZIN}</span>
                  </div>
                  <div className="bg-[var(--surface-subtle)] p-1.5 rounded">
                    <span className="block text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Alpa</span>
                    <span className="font-bold text-rose-500">{item.stats.ALPA}</span>
                  </div>
                </div>
              </div>
            );
          }}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(p) => {
            setPage(p);
            if (selectedOption) {
              const [taId, sem] = selectedOption.split("_");
              fetchRiwayat(taId, sem, p);
            } else {
              fetchRiwayat(undefined, undefined, p);
            }
          }}
        />
      </div>
    </div>
  );
}
