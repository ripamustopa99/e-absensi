"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Megaphone,
  Loader2,
  Pin,
  Eye,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import Image from "next/image";

type Pengumuman = {
  id: string;
  judul: string;
  isi: string;
  targetJenjang: "MTS" | "MA" | null;
  pinned: boolean;
  foto: string | null;
  tanggalPublish: string;
  dibuatOleh: { nama: string; role: string };
  tahunAjaran?: { label: string; semester: string } | null;
};

export default function GuruPengumumanPage() {
  const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filters
  const [filterJenjang, setFilterJenjang] = useState("");

  const fetchPengumuman = useCallback(async () => {
    setLoading(true);
    try {
      const [res] = await Promise.all([
        api.get<{ success: boolean; data: Pengumuman[] }>(
          "/pengumuman?isPublished=true",
        ),
        api.post("/pengumuman/mark-read").catch(() => {}),
      ]);
      const rawData = res.data.data as any;
      const list = Array.isArray(rawData) ? rawData : rawData?.data || [];
      setPengumumanList(list);
    } catch (err) {
      toast.error("Gagal memuat pengumuman");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPengumuman();
  }, [fetchPengumuman]);

  const filteredList = useMemo(() => {
    return pengumumanList.filter((p) => {
      if (filterJenjang && p.targetJenjang && p.targetJenjang !== filterJenjang)
        return false;
      return true;
    });
  }, [pengumumanList, filterJenjang]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Megaphone size={20} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)]">
              Pengumuman & Informasi Sekolah
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              Informasi penting, agenda, dan pengumuman resmi dari pihak
              manajemen sekolah.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 bg-[var(--surface-subtle)] p-1.5 rounded-xl border border-[var(--border)] w-full md:w-auto">
          <div className="pl-3 text-[var(--text-tertiary)]">
            <Filter size={16} />
          </div>
          <select
            value={filterJenjang}
            onChange={(e) => setFilterJenjang(e.target.value)}
            className="bg-transparent px-2 py-1.5 pr-8 text-[13px] font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer w-full"
          >
            <option value="">Semua Jenjang</option>
            <option value="MTS">MTS</option>
            <option value="MA">MA</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2
            size={36}
            className="animate-spin"
            style={{ color: "var(--primary)" }}
          />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-16 text-center shadow-sm">
          <Megaphone
            size={36}
            className="text-[var(--text-tertiary)] mx-auto mb-3 opacity-40"
          />
          <p className="font-bold text-[var(--text-primary)]">
            Belum ada pengumuman
          </p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Semua informasi terbaru akan ditampilkan di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className={`bg-[var(--surface)] border rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all ${
                item.pinned
                  ? "border-[var(--primary)]/50 ring-1 ring-[var(--primary)]/20"
                  : "border-[var(--border)]"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.pinned && (
                      <span
                        className="px-2 py-0.5 text-[10px] font-black rounded flex items-center gap-1"
                        style={{
                          backgroundColor: "var(--primary-subtle)",
                          color: "var(--primary)",
                        }}
                      >
                        <Pin size={10} /> PINNED
                      </span>
                    )}
                    {item.targetJenjang && (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded">
                        {item.targetJenjang}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(item.tanggalPublish).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {item.judul}
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {item.isi}
                </p>

                {item.foto && (
                  <div
                    onClick={() => setPreviewImage(item.foto)}
                    className="relative w-full h-44 rounded-xl overflow-hidden border border-[var(--border)] cursor-pointer group mt-3"
                  >
                    <Image
                      src={item.foto}
                      alt="Lampiran"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[12px] font-bold gap-1.5">
                      <Eye size={16} /> Lihat Gambar Penuh
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                <span>
                  Diterbitkan oleh: <strong>{item.dibuatOleh.nama}</strong>
                </span>
                {item.tahunAjaran && (
                  <span className="bg-[var(--surface-subtle)] px-2.5 py-1 rounded-md border border-[var(--border)]">
                    TA {item.tahunAjaran.label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Image Preview Lightbox Modal ─── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black cursor-pointer"
            >
              <X size={20} />
            </button>
            <Image
              src={previewImage}
              alt="Preview"
              width={1000}
              height={800}
              className="object-contain max-h-[90vh] w-auto h-auto rounded-2xl"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
