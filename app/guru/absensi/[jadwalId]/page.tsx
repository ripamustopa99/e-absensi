"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Search,
  FileText,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";
import type { AxiosError } from "axios";
import MobileFilterDrawer from "@/components/shared/MobileFilterDrawer";

// --- Types ---

type AttendanceStatus = "HADIR" | "SAKIT" | "IZIN" | "ALPA";

type Student = {
  id: string;
  nama: string;
  nisn: string;
  jenisKelamin: string | null;
  tingkat: string;
};

type ScheduleDetail = {
  id: string;
  jamMulai: string;
  jamSelesai: string;
  mapel: { id: string; nama: string };
  jenjang: string;
  tingkatList: { tingkat: string }[];
  siswa: Student[];
};

type AttendanceRecord = {
  siswaId: string;
  status: AttendanceStatus | null;
  alasan?: string;
};

type StatusCheckResponse = {
  success: true;
  data: {
    sudahAbsen: boolean;
    records: (AttendanceRecord & { status: AttendanceStatus })[];
  };
};

type ScheduleDetailResponse = {
  success: true;
  data: ScheduleDetail;
};

type ApiError = { success: false; message: string };

// --- Constants ---

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "HADIR",
    label: "H",
    color:
      "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface)]",
    activeColor: "bg-[var(--primary)] border-[var(--primary)] text-white",
  },
  {
    value: "SAKIT",
    label: "S",
    color:
      "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface)]",
    activeColor: "bg-blue-500 border-blue-500 text-white",
  },
  {
    value: "IZIN",
    label: "I",
    color:
      "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface)]",
    activeColor: "bg-amber-500 border-amber-500 text-white",
  },
  {
    value: "ALPA",
    label: "A",
    color:
      "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface)]",
    activeColor: "bg-rose-500 border-rose-500 text-white",
  },
];

function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function StudentAttendancePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const scheduleId = params["jadwalId"] as string;
  const targetDate = searchParams.get("tanggal") ?? getTodayIso();

  const [scheduleInfo, setScheduleInfo] = useState<ScheduleDetail | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, AttendanceRecord>
  >({});
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Check if attendance is editable
  const isEditable = useMemo(() => {
    if (!targetDate || !scheduleInfo) return false; // Default to false until loaded
    const now = new Date();

    // Check if target date is today
    const isToday = getTodayIso() === targetDate;
    if (!isToday) return false; // Strictly only today is editable

    // Check if within time window (jamMulai - 15m to jamSelesai + 15m)
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = scheduleInfo.jamMulai.split(":").map(Number);
    const [endH, endM] = scheduleInfo.jamSelesai.split(":").map(Number);

    const startMinutes = startH * 60 + startM - 15;
    const endMinutes = endH * 60 + endM + 15;

    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }, [targetDate, scheduleInfo]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<
    "ALL" | "PRESENT" | "ABSENT" | "UNSET"
  >("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const displayDate = new Date(targetDate + "T00:00:00").toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const initializeAttendance = useCallback(
    (
      studentList: Student[],
      existingRecords: (AttendanceRecord & { status: AttendanceStatus })[],
    ) => {
      const map: Record<string, AttendanceRecord> = {};
      for (const student of studentList) {
        const existing = existingRecords.find((r) => r.siswaId === student.id);
        // Default to null (Belum diset) if no existing record
        map[student.id] = existing ?? { siswaId: student.id, status: null };
      }
      setAttendanceRecords(map);
    },
    [],
  );

  useEffect(() => {
    if (!scheduleId || !targetDate) return;

    const fetchAllData = async () => {
      try {
        const [scheduleRes, statusRes] = await Promise.all([
          api.get<ScheduleDetailResponse>(`/jadwal/${scheduleId}`),
          api.get<StatusCheckResponse>(
            `/absensi-siswa/${scheduleId}/status?tanggal=${targetDate}`,
          ),
        ]);

        const fetchedSchedule = scheduleRes.data.data;
        const { sudahAbsen, records } = statusRes.data.data;

        setScheduleInfo(fetchedSchedule);
        setIsAlreadySubmitted(sudahAbsen);
        initializeAttendance(fetchedSchedule.siswa, records);
      } catch (err) {
        const error = err as AxiosError<ApiError>;
        toast.error(
          error.response?.data?.message ?? "Gagal memuat data absensi",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [scheduleId, targetDate, initializeAttendance]);

  const setAttendanceStatus = (studentId: string, status: AttendanceStatus) => {
    if (!isEditable) return;
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId]!, status, siswaId: studentId },
    }));
  };

  const setAttendanceReason = (studentId: string, alasan: string) => {
    if (!isEditable) return;
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId]!, alasan, siswaId: studentId },
    }));
  };

  const handleSaveAttendance = async () => {
    // Validation: ensure all students have a status set
    const unsetStudent = Object.values(attendanceRecords).find(
      (r) => r.status === null,
    );
    if (unsetStudent) {
      toast.error("Mohon lengkapi absensi seluruh siswa sebelum menyimpan");
      return;
    }

    const payloadArray = Object.values(attendanceRecords).map((record) => ({
      siswaId: record.siswaId,
      status: record.status as AttendanceStatus, // safe cast due to validation above
      ...(record.alasan ? { alasan: record.alasan } : {}),
    }));

    setIsSaving(true);
    try {
      await api.post(`/absensi-siswa/${scheduleId}`, {
        tanggal: targetDate,
        absensi: payloadArray,
      });
      toast.success("Data absensi berhasil disimpan!");
      setIsAlreadySubmitted(true);
      setTimeout(() => router.push("/guru/absensi"), 1200);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      toast.error(
        error.response?.data?.message ?? "Gagal menyimpan data absensi",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const summaryData = useMemo(() => {
    return Object.values(attendanceRecords).reduce(
      (acc, { status }) => {
        if (status === null) {
          acc.BELUM += 1;
        } else {
          acc[status] = (acc[status] ?? 0) + 1;
        }
        return acc;
      },
      { HADIR: 0, SAKIT: 0, IZIN: 0, ALPA: 0, BELUM: 0 },
    );
  }, [attendanceRecords]);

  // Derived state for filtered students
  const displayedStudents = useMemo(() => {
    if (!scheduleInfo) return [];
    return scheduleInfo.siswa.filter((student) => {
      const record = attendanceRecords[student.id];
      const status = record?.status;

      const matchesSearch =
        student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.nisn.includes(searchQuery);

      const matchesFilter =
        attendanceFilter === "ALL"
          ? true
          : attendanceFilter === "UNSET"
            ? status === null
            : attendanceFilter === "PRESENT"
              ? status === "HADIR"
              : status !== "HADIR" && status !== null;

      const matchesClass =
        classFilter === "ALL" || student.tingkat === classFilter;

      return matchesSearch && matchesFilter && matchesClass;
    });
  }, [
    scheduleInfo,
    attendanceRecords,
    searchQuery,
    attendanceFilter,
    classFilter,
  ]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-40">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!scheduleInfo) {
    return (
      <div className="max-w-5xl mx-auto text-center py-24">
        <p className="font-semibold text-[var(--text-primary)]">
          Jadwal mengajar tidak ditemukan
        </p>
        <Link
          href="/guru/jadwal"
          className="text-[13px] text-[var(--primary)] hover:underline mt-2 inline-block font-medium"
        >
          ← Kembali ke Jadwal
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-32 lg:pb-10 space-y-6">
      {/* Top Header */}
      <div className="flex items-start gap-4 pb-4 border-b border-[var(--border)]">
        <Link
          href="/guru/absensi"
          className="mt-1 p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] uppercase">
            ABSENSI SISWA - TINGKAT{" "}
            {scheduleInfo.tingkatList.map((t) => t.tingkat).join(", ")}
          </h1>
          <p className="text-[14px] font-medium text-[var(--text-secondary)] mt-1 flex items-center gap-2">
            <span>{scheduleInfo.jenjang}</span>
            <span>&bull;</span>
            <span>{scheduleInfo.mapel.nama}</span>
            <span>&bull;</span>
            <span>
              {scheduleInfo.jamMulai} - {scheduleInfo.jamSelesai}
            </span>
            <span>&bull;</span>
            <span>{displayDate}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column - Main Content */}
        <div className="flex-1 w-full min-w-0 space-y-5">
          {/* Search & Filter Toolbar */}
          <div className="flex items-center gap-3 p-1">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Cari Nama / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] shadow-sm transition-all"
              />
            </div>

            {/* Inline Filters (Desktop or 1 filter) */}
            <div
              className={`${scheduleInfo.tingkatList.length > 1 ? "hidden lg:flex" : "flex"} items-center gap-3`}
            >
              <div className="w-[180px]">
                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] shadow-sm transition-all cursor-pointer"
                >
                  <option value="ALL">Semua</option>
                  <option value="PRESENT">Hadir</option>
                  <option value="ABSENT">Tidak Hadir</option>
                  <option value="UNSET">Belum Set</option>
                </select>
              </div>

              {scheduleInfo.tingkatList.length > 1 && (
                <div className="w-[150px]">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] shadow-sm transition-all cursor-pointer"
                  >
                    <option value="ALL">Semua Tingkat</option>
                    {scheduleInfo.tingkatList.map((t) => (
                      <option key={t.tingkat} value={t.tingkat}>
                        {t.tingkat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Mobile Filter Trigger (Only if > 1 filter) */}
            {scheduleInfo.tingkatList.length > 1 && (
              <div className="lg:hidden">
                <MobileFilterDrawer
                  isOpen={isMobileFilterOpen}
                  onOpen={() => setIsMobileFilterOpen(true)}
                  onClose={() => setIsMobileFilterOpen(false)}
                  onReset={() => {
                    setAttendanceFilter("ALL");
                    setClassFilter("ALL");
                  }}
                  title="Filter Absensi Siswa"
                >
                  <div className="space-y-4 text-[13px]">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Kehadiran
                      </label>
                      <select
                        value={attendanceFilter}
                        onChange={(e) => setAttendanceFilter(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)]"
                      >
                        <option value="ALL">Semua</option>
                        <option value="PRESENT">Hadir</option>
                        <option value="ABSENT">Tidak Hadir</option>
                        <option value="UNSET">Belum Set</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Tingkat
                      </label>
                      <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)]"
                      >
                        <option value="ALL">Semua Tingkat</option>
                        {scheduleInfo.tingkatList.map((t) => (
                          <option key={t.tingkat} value={t.tingkat}>
                            {t.tingkat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </MobileFilterDrawer>
              </div>
            )}
          </div>

          {/* Student List */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText size={16} className="text-[var(--primary)]" />
                Daftar Siswa
              </h2>
            </div>

            {displayedStudents.length === 0 ? (
              <div className="p-16 text-center text-[var(--text-tertiary)]">
                <p className="text-[13px]">
                  Tidak ada siswa yang sesuai dengan filter/pencarian.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {displayedStudents.map((student, idx) => {
                  const record = attendanceRecords[student.id];
                  const currentStatus = record?.status;
                  const needsReason =
                    currentStatus === "SAKIT" ||
                    currentStatus === "IZIN" ||
                    currentStatus === "ALPA";

                  // Hitung nomor urut yang benar walaupun di-filter
                  const actualIndex =
                    scheduleInfo.siswa.findIndex((s) => s.id === student.id) +
                    1;

                  return (
                    <div
                      key={student.id}
                      className="p-5 hover:bg-[var(--surface-subtle)]/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        {/* Student Info */}
                        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
                            {actualIndex}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-[var(--text-primary)] truncate">
                              {student.nama}
                            </p>
                            <p className="text-[12px] font-medium text-[var(--text-tertiary)] mt-0.5">
                              NISN: {student.nisn}
                            </p>
                          </div>
                        </div>

                        {/* Status Toggles */}
                        <div className="flex bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] p-1 w-full sm:w-auto overflow-x-auto">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setAttendanceStatus(student.id, opt.value)
                              }
                              disabled={!isEditable}
                              className={`flex-1 sm:flex-none min-w-[40px] h-9 flex items-center justify-center text-[12px] font-bold rounded-md transition-all ${
                                currentStatus === opt.value
                                  ? opt.activeColor
                                  : opt.color
                              } ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}
                              title={opt.label}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Wide Textarea for Reason (Izin/Sakit/Alpa) */}
                      {needsReason && (
                        <div className="mt-4 pl-0 sm:pl-11 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                          <textarea
                            placeholder="Keterangan (opsional)..."
                            value={record?.alasan ?? ""}
                            onChange={(e) =>
                              setAttendanceReason(student.id, e.target.value)
                            }
                            disabled={!isEditable}
                            rows={2}
                            className={`w-full p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:bg-[var(--surface)] resize-none transition-all ${!isEditable ? "opacity-60 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Aside Summary */}
        <aside className="w-full lg:w-[280px] shrink-0 space-y-5 lg:sticky lg:top-24">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm sticky top-6">
            {!isEditable && !isAlreadySubmitted && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2">
                <span className="text-rose-500 shrink-0">⚠️</span>
                <p className="text-[12px] text-rose-600 font-medium leading-tight">
                  Waktu edit untuk hari ini telah habis. Anda hanya dapat
                  melihat data.
                </p>
              </div>
            )}

            <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <CheckCircle size={14} className="text-[var(--primary)]" />
              Ringkasan Kehadiran
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                  Total Siswa
                </span>
                <span className="text-[14px] font-bold text-[var(--text-primary)]">
                  {scheduleInfo.siswa.length}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)]"></div>{" "}
                    Hadir
                  </span>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">
                    {summaryData.HADIR}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>{" "}
                    Sakit
                  </span>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">
                    {summaryData.SAKIT}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>{" "}
                    Izin
                  </span>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">
                    {summaryData.IZIN}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>{" "}
                    Alpa
                  </span>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">
                    {summaryData.ALPA}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <span className="text-[13px] font-medium text-[var(--text-tertiary)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--border-subtle)] border border-[var(--border)]"></div>{" "}
                    Belum diset
                  </span>
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">
                    {summaryData.BELUM}
                  </span>
                </div>
              </div>
            </div>

            {isEditable && (
              <button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm shadow-[var(--primary)]/20 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Menyimpan...
                  </>
                ) : isAlreadySubmitted ? (
                  <>
                    <CheckCircle size={16} /> Tersimpan
                  </>
                ) : (
                  <>SIMPAN ABSENSI</>
                )}
              </button>
            )}
            {!isEditable && (
              <Link
                href="/guru/riwayat"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--surface-subtle)] border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-primary)] text-[13px] font-bold rounded-xl transition-all"
              >
                KEMBALI KE RIWAYAT
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
