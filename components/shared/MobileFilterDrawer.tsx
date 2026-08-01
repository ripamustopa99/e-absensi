"use client";

import React from "react";
import { Filter } from "lucide-react";
import Modal from "./Modal";

type MobileFilterDrawerProps = {
  title?: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onReset?: () => void;
  children: React.ReactNode;
  className?: string;
};

export default function MobileFilterDrawer({
  title = "Filter Data",
  isOpen,
  onOpen,
  onClose,
  onReset,
  children,
  className,
}: MobileFilterDrawerProps) {
  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={onOpen}
        type="button"
        className={`inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] font-bold rounded-[var(--radius-md)] shrink-0 shadow-sm hover:bg-[var(--surface-subtle)] ${className || ""}`}
      >
        <Filter size={14} /> Filter
      </button>

      {/* Modal / Drawer */}
      <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
        <div className="space-y-4">
          <div className="space-y-4">{children}</div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            {onReset && (
              <button
                type="button"
                onClick={() => {
                  onReset();
                  onClose();
                }}
                className="px-4 py-2 text-[12px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-[var(--radius-md)] transition-colors"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[12px] font-bold text-white rounded-[var(--radius-md)] transition-colors ml-auto bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
