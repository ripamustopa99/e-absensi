"use client";

import { ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  isFullWidth?: boolean;
};

export default function TopSalesWidget({ isFullWidth }: Props) {
  const topLevels = [
    { name: "Kelas XII (MA)", count: "110 Siswa", percentage: "96.1%" },
    { name: "Kelas X (MA)", count: "120 Siswa", percentage: "95.0%" },
    { name: "Kelas VII (MTS)", count: "140 Siswa", percentage: "94.5%" },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6 w-full">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">Top Kehadiran</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">Tingkat kelas dengan persentase tertinggi.</p>
        </div>
        <Link
          href="/admin/rekap/siswa"
          className="text-[12px] font-bold text-[#0FBE85] hover:underline flex items-center gap-1"
        >
          Detail <ChevronRight size={14} />
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-[var(--text-primary)]">95.2%</span>
          <span className="text-[12px] font-bold text-[#0FBE85] flex items-center gap-0.5">
            <ArrowUpRight size={14} /> +2.1% minggu ini
          </span>
        </div>

        {/* Micro Vertical Bar Chart representation matching reference.png (Taller when full width) */}
        <div className="pt-2 pb-2">
          <div className={`flex items-end gap-2 px-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl p-3 transition-all ${isFullWidth ? "h-36" : "h-20"}`}>
            {[45, 60, 75, 50, 65, 80, 95, 70, 85, 90, 60, 85, 100, 75, 88, 92, 80, 96, 82, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md transition-all hover:opacity-80"
                style={{
                  height: `${h}%`,
                  backgroundColor: i % 2 === 0 ? "#0FBE85" : "#3B82F6",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {topLevels.map((item) => (
          <div key={item.name} className="flex items-center justify-between p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
            <div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">{item.name}</p>
              <p className="text-[11px] text-[var(--text-secondary)]">{item.count}</p>
            </div>
            <span className="text-[12px] font-extrabold text-[#0FBE85] bg-[#0FBE85]/10 px-3 py-1 rounded-lg">
              {item.percentage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
