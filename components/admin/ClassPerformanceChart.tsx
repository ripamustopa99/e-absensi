"use client";

import { BarChart3 } from "lucide-react";

export default function ClassPerformanceChart() {
  const classLevels = [
    { level: "Kelas VII (MTS)", percentage: 94.5, count: "140 Siswa" },
    { level: "Kelas VIII (MTS)", percentage: 91.2, count: "135 Siswa" },
    { level: "Kelas IX (MTS)", percentage: 89.8, count: "145 Siswa" },
    { level: "Kelas X (MA)", percentage: 95.0, count: "120 Siswa" },
    { level: "Kelas XI (MA)", percentage: 92.4, count: "125 Siswa" },
    { level: "Kelas XII (MA)", percentage: 96.1, count: "110 Siswa" },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 size={18} className="text-[#0FBE85]" /> Kehadiran per Tingkat Kelas
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Persentase kehadiran rata-rata siswa berdasarkan jenjang & tingkat.
          </p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 bg-[#0FBE85]/10 text-[#0FBE85] rounded-full">
          Live Update
        </span>
      </div>

      <div className="space-y-4">
        {classLevels.map((item) => (
          <div key={item.level} className="space-y-1.5">
            <div className="flex justify-between items-center text-[13px]">
              <span className="font-bold text-[var(--text-primary)]">{item.level}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-tertiary)]">{item.count}</span>
                <span className="font-extrabold text-[#0FBE85]">{item.percentage}%</span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-gradient-to-r from-[#0FBE85] to-[#0DA876] rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
