"use client";

import React from "react";
import { Loader2, Inbox } from "lucide-react";

type DataTableProps<T> = {
  loading: boolean;
  data: T[];
  headers: string[];
  renderRow: (item: T, index: number) => React.ReactNode;
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  minWidth?: string;
  alignments?: ("left" | "center" | "right")[];
};

export default function DataTable<T>({
  loading,
  data,
  headers,
  renderRow,
  renderMobileCard,
  emptyMessage = "Tidak ada data yang ditemukan.",
  emptyIcon = <Inbox size={36} className="mx-auto mb-3 opacity-50" />,
  minWidth = "min-w-[850px]",
  alignments,
}: DataTableProps<T>) {
  const safeData = data || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
        <Loader2 size={24} className="animate-spin mb-2 text-primary" />
        <p className="text-[13px] font-medium">Memuat data...</p>
      </div>
    );
  }

  if (safeData.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-tertiary)]">
        {emptyIcon}
        <p className="text-[13px]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className={`w-full ${minWidth}`}>
          <thead>
            <tr className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
              {headers.map((header, idx) => {
                const align = alignments ? alignments[idx] : (idx === 0 ? "left" : idx === headers.length - 1 ? "right" : "left");
                const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
                const widthClass = idx === 0 && (!alignments || alignments[0] === "left") ? "w-12" : "";
                return (
                  <th
                    key={idx}
                    className={`py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] ${alignClass} ${widthClass}`}
                  >
                    {header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {safeData.map((item, index) => renderRow(item, index))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card / List View */}
      {renderMobileCard && (
        <div className="sm:hidden space-y-3">
          {safeData.map((item, index) => renderMobileCard(item, index))}
        </div>
      )}
    </>
  );
}
