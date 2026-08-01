"use client";

import React from "react";
import { Search } from "lucide-react";

type SearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
};

export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = "Cari data...",
  children,
}: SearchFilterBarProps) {
  return (
    <div className="p-4 border-b border-[var(--border)] bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex flex-col sm:flex-row gap-3 justify-between items-center">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--primary)] transition-all"
        />
      </div>

      {/* Additional Filters / Dropdowns */}
      {children && (
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 justify-start sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
