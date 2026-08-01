"use client";

import React, { useState } from "react";
import { Search, Filter } from "lucide-react";
import MobileFilterDrawer from "./MobileFilterDrawer";

type ModuleToolbarProps = {
  search: string;
  onSearchChange: (val: string) => void;
  placeholder?: string;
  desktopFilters?: React.ReactNode;
  mobileFilters?: React.ReactNode;
  onResetFilters?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export default function ModuleToolbar({
  search,
  onSearchChange,
  placeholder = "Cari data...",
  desktopFilters,
  mobileFilters,
  onResetFilters,
  actions,
  children,
}: ModuleToolbarProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  return (
    <div className="bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="p-4 bg-[#F6F8F7] dark:bg-[var(--surface-subtle)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Search & Mobile Filter Trigger */}
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 xl:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {mobileFilters && (
            <div className="xl:hidden">
              <MobileFilterDrawer
                isOpen={isMobileFilterOpen}
                onOpen={() => setIsMobileFilterOpen(true)}
                onClose={() => setIsMobileFilterOpen(false)}
                title="Filter Data"
                onReset={onResetFilters}
              >
                {mobileFilters}
              </MobileFilterDrawer>
            </div>
          )}
        </div>

        {/* Desktop Filters & Actions */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {desktopFilters && (
            <div className="hidden xl:flex items-center gap-2.5 flex-wrap">
              {desktopFilters}
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Extra Children / Sub-toolbar (e.g., Bulk Action Bars) */}
      {children}
    </div>
  );
}
