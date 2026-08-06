/* eslint-disable */
import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
          <FileQuestion size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Halaman Tidak Ditemukan</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Maaf, halaman yang Anda akses tidak ditemukan atau telah dipindahkan.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white text-[13px] font-bold rounded-xl shadow-sm transition-all"
        >
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
