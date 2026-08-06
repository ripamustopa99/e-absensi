"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "./Modal";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  variant?: "danger" | "warning" | "info";
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Hapus",
  cancelText = "Batal",
  isDeleting = false,
  variant = "danger",
}: ConfirmModalProps) {
  const confirmBtnClass = {
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    info: "bg-primary hover:bg-primary-hover text-white",
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-full shrink-0 ${variant === "danger" ? "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"}`}>
            <AlertTriangle size={20} />
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed pt-1">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--border)] rounded-[var(--radius-md)] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={`inline-flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-[var(--radius-md)] transition-all disabled:opacity-50 ${confirmBtnClass}`}
          >
            {isDeleting && <Loader2 size={16} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
