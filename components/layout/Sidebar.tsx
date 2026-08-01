"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";

export type NavItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  subItems?: { name: string; href: string }[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  sections: NavSection[];
}

export function Sidebar({ isOpen, setIsOpen, sections }: SidebarProps) {
  const pathname = usePathname();
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsDesktopCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsDesktopCollapsed(false);
    }
  }, [isOpen]);

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {},
  );
  const [brand, setBrand] = useState<{ namaAplikasi: string; logoUrl: string } | null>(null);

  useEffect(() => {
    const fetchBrand = () => {
      api.get("/public/setting/config")
        .then((res) => setBrand(res.data))
        .catch(() => setBrand({ namaAplikasi: "Absensi Sekolah", logoUrl: "" }));
    };
    fetchBrand();

    const handleBrandUpdate = () => {
      fetchBrand();
    };
    window.addEventListener("brand-updated", handleBrandUpdate);
    return () => {
      window.removeEventListener("brand-updated", handleBrandUpdate);
    };
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "bg-[var(--surface)] border-r border-[var(--border)]",
          "transform transition-all duration-300 ease-in-out",
          "lg:relative lg:z-40 lg:flex-shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isDesktopCollapsed ? "lg:w-[72px]" : "lg:w-64",
        ].join(" ")}
      >
        {/* Brand */}
        <div
          className={`h-14 flex items-center ${isDesktopCollapsed ? "justify-center" : "px-5"} border-b border-[var(--border)] relative shrink-0`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 bg-primary rounded-[var(--radius-sm)] flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
              {!brand ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xs leading-none">
                  {brand.namaAplikasi.charAt(0)}
                </span>
              )}
            </div>
            {!brand ? (
              <div className={`h-4 bg-[var(--border-subtle)] rounded animate-pulse w-24 ${isDesktopCollapsed ? "hidden" : "block"}`} />
            ) : (
              <span
                className={`font-bold text-[15px] text-[var(--text-primary)] tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                  isDesktopCollapsed ? "w-0 opacity-0 max-w-0" : "w-auto opacity-100 max-w-[150px]"
                }`}
              >
                {brand.namaAplikasi}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setIsDesktopCollapsed(!isDesktopCollapsed);
              if (!isDesktopCollapsed) setOpenDropdowns({});
            }}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--surface)] border border-[var(--border)] rounded-full items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors z-50 shadow-md cursor-pointer"
          >
            {isDesktopCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar overflow-x-hidden">
          {sections.map((section) => (
            <div key={section.label}>
              <p
                className={`px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                  isDesktopCollapsed ? "max-h-0 opacity-0 my-0 py-0" : "max-h-6 opacity-100"
                }`}
              >
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const hasSubItems = Boolean(item.subItems?.length);
                  const isDropdownOpen = openDropdowns[item.name];

                  const isActive = item.href
                    ? pathname === item.href ||
                      (item.href !== "/admin" &&
                        item.href !== "/guru" &&
                        pathname.startsWith(item.href))
                    : item.subItems?.some((sub) =>
                        pathname.startsWith(sub.href),
                      );

                  const Icon = item.icon;

                  return (
                    <div key={item.name}>
                      {hasSubItems ? (
                        // Dropdown Parent
                        <button
                          onClick={() => {
                            if (isDesktopCollapsed) {
                              setIsDesktopCollapsed(false);
                              setOpenDropdowns({ [item.name]: true });
                            } else {
                              toggleDropdown(item.name);
                            }
                          }}
                          title={isDesktopCollapsed ? item.name : undefined}
                          className={[
                            "relative w-full flex items-center justify-between py-2 rounded-[var(--radius-sm)] transition-colors duration-150 cursor-pointer",
                            isDesktopCollapsed ? "px-0 justify-center" : "px-3",
                            isActive
                              ? "bg-primary-subtle text-primary"
                              : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]",
                          ].join(" ")}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-sm" />
                          )}
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Icon
                              size={18}
                              className={
                                isActive
                                  ? "text-primary"
                                  : "text-[var(--text-tertiary)]"
                              }
                            />
                            <span
                              className={`text-[13px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                                isActive ? "text-primary" : ""
                              } ${isDesktopCollapsed ? "max-w-0 opacity-0 w-0" : "max-w-[150px] opacity-100 w-auto"}`}
                            >
                              {item.name}
                            </span>
                          </div>
                          <ChevronDown
                            size={14}
                            className={`text-[var(--text-tertiary)] transition-all duration-300 ease-in-out shrink-0 ${
                              isDesktopCollapsed ? "max-w-0 opacity-0 w-0 overflow-hidden" : "max-w-4 opacity-100 w-4"
                            } ${isDropdownOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : (
                        // Regular Link
                        <Link
                          href={item.href!}
                          onClick={() => setIsOpen(false)}
                          title={isDesktopCollapsed ? item.name : undefined}
                          className={[
                            "relative flex items-center gap-3 py-2 rounded-[var(--radius-sm)] transition-colors duration-150",
                            isDesktopCollapsed ? "px-0 justify-center" : "px-3",
                            isActive
                              ? "bg-primary-subtle text-primary"
                              : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]",
                          ].join(" ")}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-sm" />
                          )}
                          <Icon
                            size={18}
                            className={
                              isActive
                                ? "text-primary"
                                : "text-[var(--text-tertiary)]"
                            }
                          />
                          <span
                            className={`text-[13px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                              isDesktopCollapsed ? "max-w-0 opacity-0 w-0" : "max-w-[150px] opacity-100 w-auto"
                            }`}
                          >
                            {item.name}
                          </span>
                        </Link>
                      )}

                      {/* Dropdown Children */}
                      {hasSubItems && isDropdownOpen && (
                        <div
                          className={`mt-1 mb-2 space-y-0.5 relative before:absolute before:left-[21px] before:top-0 before:bottom-2 before:w-px before:bg-[var(--border)] transition-all duration-300 ease-in-out overflow-hidden ${
                            isDesktopCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
                          }`}
                        >
                          {item.subItems!.map((sub) => {
                            const isSubActive = pathname.startsWith(sub.href);
                            return (
                              <Link
                                key={sub.name}
                                href={sub.href}
                                onClick={() => setIsOpen(false)}
                                className={[
                                  "flex items-center pl-10 pr-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors duration-150 relative",
                                  isSubActive
                                    ? "text-primary"
                                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]",
                                ].join(" ")}
                              >
                                <div
                                  className={`absolute left-[19px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                                    isSubActive ? "bg-primary ring-2 ring-primary/20" : "bg-[var(--border)]"
                                  }`}
                                />
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                                  {sub.name}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer */}
        <div
          className={`border-t border-[var(--border)] p-3 flex flex-col shrink-0 ${
            isDesktopCollapsed ? "items-center" : ""
          } gap-1`}
        ></div>
      </aside>
    </>
  );
}
