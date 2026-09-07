"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

type AdminHeaderProps = {
  title: string;
  description: string;
  variant?: "jenjang" | "icon";
  jenjang?: "MTS" | "MA" | string;
  moduleLabel?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
};

export function AdminHeader({
  title,
  description,
  variant = "icon",
  jenjang,
  moduleLabel,
  icon: Icon,
  actions,
}: AdminHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        {variant === "jenjang" ? (
          <div className="flex items-center gap-2 mb-1">
            {jenjang && (
              <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-bold uppercase tracking-wider">
                Jenjang {jenjang}
              </span>
            )}
            {moduleLabel && (
              <span className="text-[12px] text-[var(--text-tertiary)] font-medium">
                {jenjang ? "|" : ""} {moduleLabel}
              </span>
            )}
          </div>
        ) : (
          Icon && (
            <div className="flex items-center gap-3 mb-1.5">
              <div className="p-2 bg-primary/10 rounded-[var(--radius-md)] text-primary">
                <Icon size={22} />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] leading-tight">
                {title}
              </h1>
            </div>
          )
        )}

        {(variant === "jenjang" || !Icon) && (
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] leading-tight">
            {title}
          </h1>
        )}

        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          {description}
        </p>
      </div>

      {actions && (
        <div className="flex flex-row items-center gap-2.5 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
