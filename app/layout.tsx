import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  let namaAplikasi = "SekolahApp";
  let titleTab = "";
  let logoUrl = "";
  try {
    const res = await query(`SELECT value FROM setting WHERE key = $1`, ["CONFIG_APP"]);
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value;
      if (val.namaAplikasi) namaAplikasi = val.namaAplikasi;
      if (val.titleTab) titleTab = val.titleTab;
      if (val.logoUrl) logoUrl = val.logoUrl;
    }
  } catch {}

  return {
    title: titleTab || `${namaAplikasi} — Sistem Absensi Terpadu`,
    description: "Platform manajemen kehadiran guru dan jadwal mengajar",
    icons: logoUrl ? { icon: logoUrl } : undefined,
  };
}

function hexToRgba(hex: string, alpha: number) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return `rgba(${num >> 16}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function adjustBrightness(hex: string, percent: number) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  let num = parseInt(c, 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 255) + percent;
  let b = (num & 255) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const brightnessCookie = cookieStore.get("app_brightness_mode")?.value;

  let primaryColor = "#0FBE85";
  let defaultLightVariant = "light";
  try {
    const res = await query(`SELECT value FROM setting WHERE key = $1`, ["CONFIG_THEME"]);
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value;
      if (val.primaryColor) {
        primaryColor = val.primaryColor;
      }
      if (val.defaultLightVariant) {
        defaultLightVariant = val.defaultLightVariant;
      }
    }
  } catch {}

  const activeBrightness = brightnessCookie || defaultLightVariant;

  const hoverColor = adjustBrightness(primaryColor, -15);
  const subtleColor = hexToRgba(primaryColor, 0.15);

  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} h-full antialiased ${activeBrightness}`}
      style={{
        "--primary": primaryColor,
        "--primary-hover": hoverColor,
        "--primary-subtle": subtleColor,
      } as React.CSSProperties}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
