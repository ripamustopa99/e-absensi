"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  total?: number;
  limit?: number;
};

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  limit = 10,
}: PaginationProps) {
  if (total !== undefined && total === 0) return null;
  if (!total && totalPages <= 0) return null;

  const startItem = total && total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = total ? Math.min(page * limit, total) : 0;

  return (
    <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[var(--text-secondary)] font-medium">
      <span>
        {total !== undefined ? (
          <>
            Menampilkan data {startItem} - {endItem} dari {total} total data.
          </>
        ) : (
          <>
            Halaman {page} dari {totalPages || 1}
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page <= 1}
          className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--border)] transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Sebelumnya"
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 font-bold text-[var(--text-primary)]">
          Hal. {page} dari {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages || 1))}
          disabled={page >= (totalPages || 1)}
          className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--border)] transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Berikutnya"
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
