/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/shared/Modal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  HelpCircle,
  MessageSquarePlus,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  User,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";

type MasukanItem = {
  id: string;
  kategori: string;
  subjek: string;
  pesan: string;
  status: string;
  tanggapanAdmin?: string;
  createdAt: string;
  user?: { nama: string; role: string; nip: string };
};

type FaqItem = {
  id: string;
  pertanyaan: string;
  jawaban: string;
  urutan: number;
};

type Props = {
  userRole: "ADMIN" | "GURU";
};

export default function SharedHelpPage({ userRole }: Props) {
  const [activeTab, setActiveTab] = useState<"faq" | "kirim" | "riwayat">("faq");
  const [masukanList, setMasukanList] = useState<MasukanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [kategori, setKategori] = useState("SARAN");
  const [subjek, setSubjek] = useState("");
  const [pesan, setPesan] = useState("");

  // Admin response modal state
  const [selectedMasukan, setSelectedMasukan] = useState<MasukanItem | null>(null);
  const [adminStatus, setAdminStatus] = useState("MENUNGGU");
  const [adminTanggapan, setAdminTanggapan] = useState("");

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqPertanyaan, setFaqPertanyaan] = useState("");
  const [faqJawaban, setFaqJawaban] = useState("");
  const [faqUrutan, setFaqUrutan] = useState<number>(0);

  const waitingCount = masukanList.filter((item) => item.status === "MENUNGGU").length;

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await api.get<{ success: true; data: FaqItem[] }>("/faq");
      setFaqList(res.data.data || []);
    } catch {
      // fallback
    }
  }, []);

  const fetchMasukan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: true; data: MasukanItem[] }>("/masukan");
      setMasukanList(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasukan();
    fetchFaqs();
  }, [fetchMasukan, fetchFaqs]);

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqPertanyaan.trim() || !faqJawaban.trim()) {
      toast.error("Pertanyaan dan jawaban wajib diisi.");
      return;
    }

    try {
      if (editingFaq) {
        await api.put(`/faq/${editingFaq.id}`, {
          pertanyaan: faqPertanyaan,
          jawaban: faqJawaban,
          urutan: faqUrutan,
        });
        toast.success("FAQ berhasil diperbarui!");
      } else {
        await api.post("/faq", {
          pertanyaan: faqPertanyaan,
          jawaban: faqJawaban,
          urutan: faqUrutan,
        });
        toast.success("FAQ berhasil ditambahkan!");
      }
      setShowFaqModal(false);
      setEditingFaq(null);
      setFaqPertanyaan("");
      setFaqJawaban("");
      setFaqUrutan(0);
      fetchFaqs();
    } catch {
      toast.error("Gagal menyimpan FAQ");
    }
  };

  const [faqToDelete, setFaqToDelete] = useState<FaqItem | null>(null);
  const [isDeletingFaq, setIsDeletingFaq] = useState(false);

  const handleDeleteFaq = async () => {
    if (!faqToDelete) return;
    setIsDeletingFaq(true);
    try {
      await api.delete(`/faq/${faqToDelete.id}`);
      toast.success("FAQ berhasil dihapus!");
      setFaqToDelete(null);
      fetchFaqs();
    } catch {
      toast.error("Gagal menghapus FAQ");
    } finally {
      setIsDeletingFaq(false);
    }
  };

  const handleSubmitMasukan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjek.trim() || !pesan.trim()) {
      toast.error("Subjek dan pesan wajib diisi secara lengkap.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/masukan", { kategori, subjek, pesan });
      toast.success("Masukan atau kendala berhasil dikirim!");
      setSubjek("");
      setPesan("");
      setActiveTab("riwayat");
      fetchMasukan();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      toast.error(error.response?.data?.message || "Gagal mengirim masukan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasukan) return;

    try {
      await api.put(`/masukan/${selectedMasukan.id}`, {
        status: adminStatus,
        tanggapanAdmin: adminTanggapan,
      });
      toast.success("Tanggapan dan status berhasil diperbarui!");
      setSelectedMasukan(null);
      fetchMasukan();
    } catch {
      toast.error("Gagal memperbarui tanggapan");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center gap-3.5 bg-[var(--surface)] border border-[var(--border)] sm:border-0 sm:bg-transparent p-4 sm:p-0 rounded-2xl shadow-sm sm:shadow-none">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: "var(--primary)" }}>
          <HelpCircle size={22} />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
            Pusat Bantuan & Masukan
          </h1>
          <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            Temukan panduan penggunaan sistem atau sampaikan masukan, saran, serta kendala Anda.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-4 sm:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none pb-0">
        <button
          onClick={() => setActiveTab("faq")}
          className={`py-3 text-[12px] sm:text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "faq"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <HelpCircle size={16} /> Panduan & FAQ
        </button>
        {userRole === "GURU" && (
          <button
            onClick={() => setActiveTab("kirim")}
            className={`py-3 text-[12px] sm:text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "kirim"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <MessageSquarePlus size={16} /> Kirim Masukan / Kendala
          </button>
        )}
        <button
          onClick={() => setActiveTab("riwayat")}
          className={`py-3 text-[12px] sm:text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 relative shrink-0 cursor-pointer ${
            activeTab === "riwayat"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Clock size={16} />
          {userRole === "ADMIN" ? "Kelola Masukan Masuk" : "Riwayat Masukan"} ({masukanList.length})
          {userRole === "ADMIN" && waitingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full animate-pulse">
              {waitingCount} baru
            </span>
          )}
        </button>
      </div>

      {/* Tab Content: FAQ */}
      {activeTab === "faq" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            {userRole === "ADMIN" && (
              <button
                onClick={() => {
                  setEditingFaq(null);
                  setFaqPertanyaan("");
                  setFaqJawaban("");
                  setFaqUrutan(faqList.length + 1);
                  setShowFaqModal(true);
                }}
                className="px-3 py-1.5 text-white text-[12px] font-bold rounded-xl shadow-sm hover:opacity-90 transition-colors flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Plus size={14} /> Tambah FAQ
              </button>
            )}
          </div>

          <div className="space-y-3">
            {faqList.length === 0 ? (
              <p className="text-center py-8 text-[12px] text-[var(--text-tertiary)]">
                Belum ada data FAQ.
              </p>
            ) : (
              faqList.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.id} className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-subtle)]">
                    <div className="w-full flex items-center justify-between p-4 text-left font-bold text-[13px] text-[var(--text-primary)]">
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="flex-1 flex items-center justify-between text-left cursor-pointer pr-2"
                      >
                        <span>{faq.pertanyaan}</span>
                        <ChevronDown size={16} className={`transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {userRole === "ADMIN" && (
                        <div className="flex items-center gap-1 ml-2 shrink-0 border-l border-[var(--border)] pl-2">
                          <button
                            onClick={() => {
                              setEditingFaq(faq);
                              setFaqPertanyaan(faq.pertanyaan);
                              setFaqJawaban(faq.jawaban);
                              setFaqUrutan(faq.urutan);
                              setShowFaqModal(true);
                            }}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-primary transition-colors cursor-pointer"
                            title="Edit FAQ"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setFaqToDelete(faq)}
                            className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Hapus FAQ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 text-[12px] text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-3">
                        {faq.jawaban}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 rounded-xl mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ backgroundColor: "var(--primary-subtle)", borderColor: "var(--border)", borderWidth: 1 }}>
            <div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">Butuh bantuan teknis mendesak?</p>
              <p className="text-[11px] text-[var(--text-secondary)]">Hubungi tim IT sekolah melalui WhatsApp atau email dukungan.</p>
            </div>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-white text-[12px] font-bold rounded-xl shadow-sm transition-colors w-full sm:w-auto text-center"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Hubungi Tim IT
            </a>
          </div>
        </div>
      )}

      {/* Tab Content: Kirim Masukan */}
      {activeTab === "kirim" && userRole === "GURU" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 shadow-sm max-w-2xl">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-4">
            Sampaikan Saran atau Kendala Sistem
          </h2>
          <form onSubmit={handleSubmitMasukan} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">
                Kategori
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="SARAN">Saran Fitur Baru</option>
                <option value="BUG">Laporan Bug / Error</option>
                <option value="KENDALA">Kendala Absensi / Sistem</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">
                Subjek
              </label>
              <input
                type="text"
                value={subjek}
                onChange={(e) => setSubjek(e.target.value)}
                placeholder="Contoh: Tombol absen kelas IX tidak muncul"
                className="w-full px-3 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">
                Pesan Detail
              </label>
              <textarea
                rows={5}
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                placeholder="Jelaskan saran atau kendala yang Anda alami secara detail..."
                className="w-full p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 text-white text-[13px] font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Kirim Masukan
            </button>
          </form>
        </div>
      )}

      {/* Tab Content: Riwayat */}
      {activeTab === "riwayat" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              {userRole === "ADMIN" ? "Semua Masukan & Kendala Masuk" : "Riwayat Masukan Saya"}
            </h2>
            <button
              onClick={fetchMasukan}
              className="text-[12px] font-bold hover:underline cursor-pointer"
              style={{ color: "var(--primary)" }}
            >
              Muat Ulang
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          ) : masukanList.length === 0 ? (
            <p className="text-center py-12 text-[12px] text-[var(--text-tertiary)]">
              Belum ada riwayat masukan atau kendala.
            </p>
          ) : (
            <div className="space-y-4">
              {masukanList.map((item) => {
                const isSelesai = item.status === "SELESAI";
                const isDitinjau = item.status === "DITINJAU";

                return (
                  <div key={item.id} className="p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-md" style={{ backgroundColor: "var(--primary-subtle)", color: "var(--primary)" }}>
                          {item.kategori}
                        </span>
                        <h3 className="text-[14px] font-bold text-[var(--text-primary)]">{item.subjek}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isSelesai
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isDitinjau
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {isSelesai ? <CheckCircle2 size={12} /> : isDitinjau ? <Clock size={12} /> : <AlertCircle size={12} />}
                          {item.status}
                        </span>
                        {userRole === "ADMIN" && (
                          <button
                            onClick={() => {
                              setSelectedMasukan(item);
                              setAdminStatus(item.status);
                              setAdminTanggapan(item.tanggapanAdmin || "");
                            }}
                            className="px-3 py-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-bold rounded-lg hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
                          >
                            Tanggapi
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{item.pesan}</p>

                    {item.user && userRole === "ADMIN" && (
                      <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1 pt-1 border-t border-[var(--border)] mt-2 pt-2">
                        <User size={12} /> Dikirim oleh: <span className="font-bold">{item.user.nama}</span> ({item.user.role})
                      </p>
                    )}

                    {item.tanggapanAdmin && (
                      <div className="mt-2 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg space-y-1">
                        <p className="text-[11px] font-bold" style={{ color: "var(--primary)" }}>Tanggapan Admin:</p>
                        <p className="text-[12px] text-[var(--text-primary)]">{item.tanggapanAdmin}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Admin Response Modal */}
      <Modal
        isOpen={selectedMasukan !== null}
        onClose={() => setSelectedMasukan(null)}
        title="Tanggapi Masukan / Kendala"
        description="Perbarui status dan berikan tanggapan untuk pengirim"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateAdminResponse} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1 uppercase">
              Status Penanganan
            </label>
            <select
              value={adminStatus}
              onChange={(e) => setAdminStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="MENUNGGU">Menunggu</option>
              <option value="DITINJAU">Ditinjau</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1 uppercase">
              Tanggapan / Catatan Admin
            </label>
            <textarea
              rows={4}
              value={adminTanggapan}
              onChange={(e) => setAdminTanggapan(e.target.value)}
              placeholder="Tulis tanggapan atau solusi untuk pengirim..."
              className="w-full p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text-primary)] focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setSelectedMasukan(null)}
              className="px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-white text-[12px] font-bold rounded-xl shadow-sm cursor-pointer"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Simpan Tanggapan
            </button>
          </div>
        </form>
      </Modal>

      {/* FAQ Modal (Admin) */}
      <Modal
        isOpen={showFaqModal}
        onClose={() => setShowFaqModal(false)}
        title={editingFaq ? "Edit FAQ" : "Tambah FAQ Baru"}
        description="Kelola pertanyaan dan jawaban pusat bantuan"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveFaq} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1 uppercase">
              Pertanyaan
            </label>
            <input
              type="text"
              value={faqPertanyaan}
              onChange={(e) => setFaqPertanyaan(e.target.value)}
              placeholder="Contoh: Bagaimana cara absen?"
              className="w-full px-3.5 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1 uppercase">
              Jawaban
            </label>
            <textarea
              rows={4}
              value={faqJawaban}
              onChange={(e) => setFaqJawaban(e.target.value)}
              placeholder="Tuliskan jawaban panduan..."
              className="w-full p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1 uppercase">
              Urutan Tampilan
            </label>
            <input
              type="number"
              value={faqUrutan}
              onChange={(e) => setFaqUrutan(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowFaqModal(false)}
              className="px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-white text-[12px] font-bold rounded-xl shadow-sm cursor-pointer"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {editingFaq ? "Simpan Perubahan" : "Tambah FAQ"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!faqToDelete}
        onClose={() => setFaqToDelete(null)}
        onConfirm={handleDeleteFaq}
        title="Hapus FAQ?"
        message={`Apakah Anda yakin ingin menghapus pertanyaan "${faqToDelete?.pertanyaan}"?`}
        isDeleting={isDeletingFaq}
        confirmText="YA, HAPUS"
      />
    </div>
  );
}
