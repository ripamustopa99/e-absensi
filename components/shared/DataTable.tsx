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
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
        <Loader2 size={24} className="animate-spin mb-2 text-primary" />
        <p className="text-[13px] font-medium">Memuat data...</p>
      </div>
    );
  }

  if (data.length === 0) {
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
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] ${
                    idx === 0
                      ? "text-left w-12"
                      : idx === headers.length - 1
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {data.map((item, index) => renderRow(item, index))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card / List View */}
      {renderMobileCard && (
        <div className="sm:hidden space-y-3 p-3">
          {data.map((item, index) => renderMobileCard(item, index))}
        </div>
      )}
    </>
  );
}
