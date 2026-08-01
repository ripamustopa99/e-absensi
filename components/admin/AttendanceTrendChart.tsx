"use client";

import { useState } from "react";
import { TrendingUp, Filter } from "lucide-react";

type TrendData = {
  label: string;
  guru: number;
  siswa: number;
};

type Props = {
  guruTrend?: TrendData[];
  siswaTrend?: TrendData[];
};

export default function AttendanceTrendChart({ guruTrend }: Props) {
  const [periode, setPeriode] = useState<"harian" | "bulanan">("harian");

  const defaultHarian = [
    { label: "Senin", guru: 92, siswa: 88 },
    { label: "Selasa", guru: 95, siswa: 90 },
    { label: "Rabu", guru: 91, siswa: 85 },
    { label: "Kamis", guru: 94, siswa: 92 },
    { label: "Jumat", guru: 96, siswa: 89 },
    { label: "Sabtu", guru: 89, siswa: 84 },
    { label: "Minggu", guru: 98, siswa: 95 },
  ];

  const defaultBulanan = [
    { label: "Jan", guru: 93, siswa: 89 },
    { label: "Feb", guru: 94, siswa: 91 },
    { label: "Mar", guru: 92, siswa: 88 },
    { label: "Apr", guru: 95, siswa: 92 },
    { label: "Mei", guru: 96, siswa: 90 },
    { label: "Jun", guru: 94, siswa: 89 },
    { label: "Jul", guru: 95, siswa: 91 },
    { label: "Agu", guru: 97, siswa: 93 },
  ];

  const currentData = periode === "harian" ? (guruTrend?.length ? guruTrend : defaultHarian) : defaultBulanan;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 600;
  const height = 240;
  const padding = 45;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxVal = 100;
  const minVal = 70;

  const getCoordinates = (value: number, index: number) => {
    const x = padding + (index / (currentData.length - 1)) * graphWidth;
    const y = height - padding - ((value - minVal) / (maxVal - minVal)) * graphHeight;
    return { x, y };
  };

  const guruPoints = currentData.map((d, i) => getCoordinates(d.guru, i));
  const siswaPoints = currentData.map((d, i) => getCoordinates(d.siswa, i));

  const createSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const createAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    const smooth = createSmoothPath(points);
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = height - padding;
    return `${smooth} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp size={18} className="text-[#0FBE85]" /> Analitik Kehadiran Sekolah
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Grafik perbandingan tingkat kehadiran Guru dan Murid secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-tertiary)]" />
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value as "harian" | "bulanan")}
            className="bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0FBE85]/30 cursor-pointer"
          >
            <option value="harian">Harian (7 Hari)</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[12px] font-bold">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#0FBE85]" />
          <span className="text-[var(--text-primary)]">Guru</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
          <span className="text-[var(--text-primary)]">Murid</span>
        </div>
      </div>

      {/* SVG Smooth Curve Chart with Gradient */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[480px]">
          <defs>
            <linearGradient id="guruGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0FBE85" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0FBE85" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="siswaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[70, 80, 90, 100].map((val) => {
            const y = height - padding - ((val - minVal) / (maxVal - minVal)) * graphHeight;
            return (
              <g key={val}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeDasharray="4 4" strokeWidth="1" />
                <text x={padding - 10} y={y + 4} fontSize="10" fill="var(--text-tertiary)" textAnchor="end">
                  {val}%
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {currentData.map((d, i) => {
            const { x } = getCoordinates(d.guru, i);
            return (
              <text key={d.label} x={x} y={height - 15} fontSize="11" fill="var(--text-secondary)" textAnchor="middle" fontWeight="600">
                {d.label}
              </text>
            );
          })}

          {/* Area Fills */}
          <path d={createAreaPath(guruPoints)} fill="url(#guruGradient)" />
          <path d={createAreaPath(siswaPoints)} fill="url(#siswaGradient)" />

          {/* Smooth Curves */}
          <path d={createSmoothPath(guruPoints)} fill="none" stroke="#0FBE85" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={createSmoothPath(siswaPoints)} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Invisible interactive hover columns */}
          {currentData.map((d, i) => {
            const { x } = getCoordinates(d.guru, i);
            return (
              <rect
                key={d.label}
                x={x - graphWidth / currentData.length / 2}
                y={padding}
                width={graphWidth / currentData.length}
                height={graphHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              />
            );
          })}

          {/* Hover indicator & Tooltip (Only shown on hover, no permanent dots) */}
          {hoveredIndex !== null && (() => {
            const i = hoveredIndex;
            const d = currentData[i];
            const gPt = guruPoints[i];
            const sPt = siswaPoints[i];

            return (
              <g>
                {/* Vertical guide line */}
                <line x1={gPt.x} y1={padding} x2={gPt.x} y2={height - padding} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Hover dots */}
                <circle cx={gPt.x} cy={gPt.y} r={6} fill="#0FBE85" stroke="white" strokeWidth="2" />
                <circle cx={sPt.x} cy={sPt.y} r={6} fill="#3B82F6" stroke="white" strokeWidth="2" />

                {/* Floating Tooltip placed safely above the curve so it never gets covered */}
                <g transform={`translate(${gPt.x}, ${Math.max(15, Math.min(gPt.y, sPt.y) - 45)})`}>
                  <rect x="-55" y="-36" width="110" height="40" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1" className="shadow-2xl" />
                  <text x="0" y="-22" fontSize="10" fill="#34D399" textAnchor="middle" fontWeight="bold">
                    Guru: {d.guru}%
                  </text>
                  <text x="0" y="-10" fontSize="10" fill="#60A5FA" textAnchor="middle" fontWeight="bold">
                    Murid: {d.siswa}%
                  </text>
                  <text x="0" y="2" fontSize="8" fill="#94A3B8" textAnchor="middle">
                    {d.label}
                  </text>
                </g>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
