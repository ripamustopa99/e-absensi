"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children?: React.ReactNode;
}

export function Select({ children, className = "", ...props }: SelectProps) {
  return (
    <div className="relative inline-block w-full">
      <select
        className={`w-full appearance-none px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer pr-9 ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
        <ChevronDown size={14} />
      </div>
    </div>
  );
}
