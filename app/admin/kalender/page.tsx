"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  CalendarRange,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AxiosError } from "axios";

type TahunAjaranData = {
  id: string;
  label: string;
  isAktif: boolean;
  tanggalMulaiGanjil: string;
  tanggalSelesaiGanjil: string;
  tanggalMulaiGenap: string;
  tanggalSelesaiGenap: string;
};

type KalenderEvent = {
  id: string;
  kegiatan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  tahunAjaranId: string;
  tahunAjaran?: string;
  semester: "Ganjil" | "Genap";
};

type KalenderFormData = {
  kegiatan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  tahunAjaranId: string;
  semester: "Ganjil" | "Genap" | "";
};

const DEFAULT_FORM: KalenderFormData = {
  kegiatan: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  tahunAjaranId: "",
  semester: "Ganjil",
};

export default function AdminKalenderPage() {
  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaranData[]>([]);
  const [filterTahunId, setFilterTahunId] = useState<string>("ALL");
  const [filterSemester, setFilterSemester] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<KalenderFormData>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<KalenderEvent | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const taRes = await api.get<{ data: TahunAjaranData[] }>("/tahun-ajaran");
      const taList = taRes.data.data;
      setTahunAjaranList(taList);

      const activeTa = taList.find((t) => t.isAktif) || taList[0];
      if (filterTahunId === "ALL" && activeTa && !formData.tahunAjaranId) {
        setFilterTahunId(activeTa.id);
        setFormData((prev) => ({ ...prev, tahunAjaranId: activeTa.id }));
      }

      const queryParams =
        filterTahunId !== "ALL" ? `?tahunAjaranId=${filterTahunId}` : "";
      const kalRes = await api.get<{ data: any[] }>(`/kalender${queryParams}`);

      const mappedEvents: KalenderEvent[] = kalRes.data.data.map((item) => {
        const ta = taList.find((t) => t.id === item.tahunAjaranId);
        const eventDate = new Date(item.tanggal);
        const month = eventDate.getMonth() + 1;
        const semester: "Ganjil" | "Genap" =
          month >= 7 && month <= 12 ? "Ganjil" : "Genap";

        return {
          id: item.id,
          kegiatan: item.keterangan,
          tanggalMulai: item.tanggal.split("T")[0],
          tanggalSelesai: item.tanggal.split("T")[0],
          tahunAjaranId: item.tahunAjaranId || "",
          tahunAjaran: ta ? ta.label : "2025/2026",
          semester,
        };
      });

      setEvents(mappedEvents);
    } catch (err) {
      toast.error("Gagal memuat data kalender akademik");
    } finally {
      setIsLoading(false);
    }
  }, [filterTahunId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => {
        const matchTahun =
          filterTahunId === "ALL" || e.tahunAjaranId === filterTahunId;
        const matchSemester =
          filterSemester === "ALL" || e.semester === filterSemester;
        return matchTahun && matchSemester;
      })
      .sort(
        (a, b) =>
          new Date(a.tanggalMulai).getTime() -
          new Date(b.tanggalMulai).getTime(),
      );
  }, [events, filterTahunId, filterSemester]);

  const openCreateModal = () => {
    const activeTa =
      tahunAjaranList.find((t) => t.isAktif) || tahunAjaranList[0];
    setFormData({
      ...DEFAULT_FORM,
      tahunAjaranId: activeTa ? activeTa.id : "",
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: KalenderEvent) => {
    setFormData({
      kegiatan: event.kegiatan,
      tanggalMulai: event.tanggalMulai,
      tanggalSelesai: event.tanggalSelesai,
      tahunAjaranId: event.tahunAjaranId,
      semester: event.semester,
    });
    setEditingId(event.id);
    setIsModalOpen(true);
  };

  const handleFormChange = (field: keyof KalenderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.kegiatan ||
      !formData.tanggalMulai ||
      !formData.tanggalSelesai ||
      !formData.tahunAjaranId ||
      !formData.semester
    ) {
      toast.error("Mohon lengkapi semua kolom yang wajib diisi");
      return;
    }

    if (new Date(formData.tanggalMulai) > new Date(formData.tanggalSelesai)) {
      toast.error("Tanggal selesai tidak boleh lebih awal dari tanggal mulai");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.delete(`/kalender/${editingId}`);
      }
      await api.post("/kalender", {
        tanggal: formData.tanggalMulai,
        jenis: "KEGIATAN_SEKOLAH",
        keterangan: formData.kegiatan,
        tahunAjaranId: formData.tahunAjaranId,
      });

      toast.success(
        editingId
          ? "Kegiatan berhasil diperbarui"
          : "Kegiatan baru berhasil ditambahkan",
      );
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(
        error.response?.data?.message ?? "Terjadi kesalahan saat menyimpan",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/kalender/${deleteTarget.id}`);
      toast.success("Kegiatan berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error("Gagal menghapus kegiatan");
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <CalendarRange size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Kalender Akademik
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              Kelola agenda dan jadwal kegiatan sekolah tahunan.
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex justify-center items-center gap-2 px-4 py-2.5 text-white text-[13px] font-bold rounded-[var(--radius-md)] transition-all shadow-sm cursor-pointer"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Plus size={16} />
          Tambah Kegiatan
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar (Simple Inline, No Modal) */}
        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-center justify-end gap-3 bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={filterTahunId}
              onChange={(e) => setFilterTahunId(e.target.value)}
              className="flex-1 sm:w-auto px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tahun Ajaran</option>
              {tahunAjaranList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} {t.isAktif ? "(Aktif)" : ""}
                </option>
              ))}
            </select>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="flex-1 sm:w-auto px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[13px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="ALL">Semua Semester</option>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-20 text-[var(--text-tertiary)]">
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--primary)" }}
              />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-tertiary)]">
              <CalendarRange size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-[13px]">
                Tidak ada kegiatan untuk filter yang dipilih.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                  <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] w-12">
                    No
                  </th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Kegiatan
                  </th>
                  <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Waktu Pelaksanaan
                  </th>
                  <th className="text-right py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] w-28">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredEvents.map((event, idx) => {
                  const isSatuHari =
                    event.tanggalMulai === event.tanggalSelesai;
                  const showDivider =
                    filterSemester === "ALL" &&
                    idx > 0 &&
                    event.semester !== filteredEvents[idx - 1].semester;

                  return (
                    <Fragment key={event.id}>
                      {showDivider && (
                        <tr className="bg-[var(--surface-subtle)]">
                          <td
                            colSpan={4}
                            className="py-2 px-5 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider"
                          >
                            Semester {event.semester}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                        <td className="py-4 px-5 text-[12px] font-medium text-[var(--text-tertiary)]">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-[13px] font-bold text-[var(--text-primary)]">
                            {event.kegiatan}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2 text-[13px] text-[var(--text-primary)] font-medium">
                            <CalendarDays
                              size={14}
                              className="text-[var(--text-tertiary)]"
                            />
                            {isSatuHari ? (
                              <span>{formatDate(event.tanggalMulai)}</span>
                            ) : (
                              <span>
                                {formatDate(event.tanggalMulai)} &mdash;{" "}
                                {formatDate(event.tanggalSelesai)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(event)}
                              className="p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-primary rounded-md transition-all cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(event)}
                              className="p-2 text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-500 rounded-md transition-all cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] text-[12px] text-[var(--text-secondary)] font-medium">
          Menampilkan {filteredEvents.length} kegiatan
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="bg-[var(--surface)] w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[var(--border)]">
            <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <CalendarRange size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                    {editingId ? "Edit Kegiatan" : "Tambah Kegiatan"}
                  </h3>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Kelola agenda kalender akademik
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[var(--text-tertiary)] hover:bg-[var(--border)] rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Nama Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.kegiatan}
                    onChange={(e) =>
                      handleFormChange("kegiatan", e.target.value)
                    }
                    placeholder="Contoh: Penilaian Tengah Semester..."
                    className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Tanggal Mulai <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.tanggalMulai}
                      onChange={(e) =>
                        handleFormChange("tanggalMulai", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Tanggal Selesai <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.tanggalSelesai}
                      onChange={(e) =>
                        handleFormChange("tanggalSelesai", e.target.value)
                      }
                      className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Tahun Ajaran <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.tahunAjaranId}
                        onChange={(e) =>
                          handleFormChange("tahunAjaranId", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Pilih --</option>
                        {tahunAjaranList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label} {t.isAktif ? "(Aktif)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Semester <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.semester}
                        onChange={(e) =>
                          handleFormChange("semester", e.target.value as any)
                        }
                        className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                      >
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--surface-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--surface)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold text-white transition-all flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}{" "}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          ></div>
          <div className="bg-[var(--surface)] w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-[var(--border)]">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Hapus Kegiatan?
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-2">
                  Apakah Anda yakin ingin menghapus kegiatan{" "}
                  <strong>&ldquo;{deleteTarget.kegiatan}&rdquo;</strong>?
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--surface-subtle)]">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--surface)] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-bold bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
