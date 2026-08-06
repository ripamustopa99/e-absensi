/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Settings, Database, LayoutTemplate, Palette, Sun, Moon, Sparkles, Pencil, X } from "lucide-react";

const PRESET_COLORS = [
  { name: "Hijau (Default)", value: "#0FBE85" },
  { name: "Biru Profesional", value: "#3B82F6" },
  { name: "Ungu Elegan", value: "#8B5CF6" },
  { name: "Amber Hangat", value: "#F59E0B" },
  { name: "Rose Modern", value: "#EC4899" },
  { name: "Teal Segar", value: "#14B8A6" },
];

const LIGHT_VARIANTS = [
  { id: "light", name: "Terang (Standard)", desc: "Tampilan terang bersih dan seimbang", icon: Sun },
  { id: "light-lighter", name: "Lebih Terang (Light+)", desc: "Background lebih cerah dengan kontras tinggi", icon: Sparkles },
];

const DARK_VARIANTS = [
  { id: "dark", name: "Gelap (Standard)", desc: "Nyaman di mata untuk ruangan minim cahaya", icon: Moon },
  { id: "dark-darker", name: "Lebih Gelap (OLED Black)", desc: "Warna hitam pekat untuk efisiensi daya maksimal", icon: Moon },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"akademik" | "cms" | "tema">("akademik");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Edit Mode states
  const [isEditingAkademik, setIsEditingAkademik] = useState(false);
  const [isEditingCms, setIsEditingCms] = useState(false);

  // Form states
  const [akademik, setAkademik] = useState({
    tahunAjaranId: "",
    tanggalMulaiGanjil: "",
    tanggalSelesaiGanjil: "",
    tanggalMulaiGenap: "",
    tanggalSelesaiGenap: "",
  });

  const [tahunAjaranList, setTahunAjaranList] = useState<{ id: string; label: string }[]>([]);

  const [cms, setCms] = useState({
    namaAplikasi: "Absensi Sekolah",
    titleTab: "",
    logoUrl: "",
  });

  // Theme states
  const [themeConfig, setThemeConfig] = useState({
    primaryColor: "#0FBE85",
    defaultLightVariant: "light",
    defaultDarkVariant: "dark",
  });

  useEffect(() => {
    const htmlClasses = document.documentElement.classList;
    let currentMode = "light";
    for (const m of ["light", "light-lighter", "dark", "dark-darker"]) {
      if (htmlClasses.contains(m)) {
        currentMode = m;
        break;
      }
    }

    const currentCssPrimary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const activeColor = currentCssPrimary.startsWith("#") ? currentCssPrimary : "#0FBE85";

    setThemeConfig({
      primaryColor: activeColor,
      defaultLightVariant: currentMode.includes("dark") ? "light" : (currentMode || "light"),
      defaultDarkVariant: currentMode.includes("dark") ? currentMode : "dark",
    });

    fetchSettings();
    fetchTahunAjaran();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [resAkademik, resCms, resTheme] = await Promise.all([
        api.get("/setting/CONFIG_AKADEMIK").catch(() => ({ data: null })),
        api.get("/setting/CONFIG_APP").catch(() => ({ data: null })),
        api.get("/setting/CONFIG_THEME").catch(() => ({ data: null })),
      ]);
      if (resAkademik.data?.value) {
        const val = typeof resAkademik.data.value === "string" ? JSON.parse(resAkademik.data.value) : resAkademik.data.value;
        setAkademik(prev => ({ ...prev, ...val }));
      }
      if (resCms.data?.value) {
        const val = typeof resCms.data.value === "string" ? JSON.parse(resCms.data.value) : resCms.data.value;
        setCms(prev => ({ ...prev, ...val }));
      }
      if (resTheme.data?.value) {
        const val = typeof resTheme.data.value === "string" ? JSON.parse(resTheme.data.value) : resTheme.data.value;
        const currentCssPrimary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        const activeColor = val.primaryColor || (currentCssPrimary.startsWith("#") ? currentCssPrimary : "#0FBE85");
        const lightVar = val.defaultLightVariant || "light";
        const darkVar = val.defaultDarkVariant || "dark";

        setThemeConfig({
          primaryColor: activeColor,
          defaultLightVariant: lightVar,
          defaultDarkVariant: darkVar,
        });
        applyThemeLive(activeColor, lightVar);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  const fetchTahunAjaran = async () => {
    try {
      const res = await api.get("/tahun-ajaran");
      setTahunAjaranList(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const hexToRgba = (hex: string, alpha: number) => {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    const num = parseInt(c, 16);
    return `rgba(${num >> 16}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  };

  const adjustBrightness = (hex: string, percent: number) => {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    const num = parseInt(c, 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 255) + percent;
    let b = (num & 255) + percent;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const applyThemeLive = (color: string, mode: string) => {
    document.documentElement.style.setProperty("--primary", color);
    const hoverColor = adjustBrightness(color, -15);
    document.documentElement.style.setProperty("--primary-hover", hoverColor);
    document.documentElement.style.setProperty("--primary-subtle", hexToRgba(color, 0.15));

    document.documentElement.classList.remove("light", "light-lighter", "dark", "dark-darker");
    document.documentElement.classList.add(mode);

    document.cookie = `app_brightness_mode=${mode}; path=/; max-age=31536000`;
  };

  const handleColorChange = (color: string) => {
    setThemeConfig((prev) => ({ ...prev, primaryColor: color }));
    const currentMode = document.documentElement.classList.contains("dark") || document.documentElement.classList.contains("dark-darker") 
      ? themeConfig.defaultDarkVariant 
      : themeConfig.defaultLightVariant;
    applyThemeLive(color, currentMode);
  };

  const handleLightVariantChange = (variant: string) => {
    setThemeConfig((prev) => ({ ...prev, defaultLightVariant: variant }));
    applyThemeLive(themeConfig.primaryColor, variant);
  };

  const handleDarkVariantChange = (variant: string) => {
    setThemeConfig((prev) => ({ ...prev, defaultDarkVariant: variant }));
    applyThemeLive(themeConfig.primaryColor, variant);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setCms({ ...cms, logoUrl: previewUrl });
    toast.success("Logo dipilih (preview aktif). Klik Simpan untuk mengunggah.");
  };

  const saveSettings = async (key: string, data: any) => {
    setSaving(true);
    try {
      let currentData = { ...data };
      if (key === "CONFIG_APP" && logoFile) {
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append("file", logoFile);
        const uploadRes = await api.post<{ success: true; data: { url: string } }>("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        currentData.logoUrl = uploadRes.data.data.url;
        setLogoFile(null);
        setUploadingLogo(false);
      }

      await api.put(`/setting/${key}`, { value: currentData });
      toast.success("Pengaturan berhasil disimpan");
      if (key === "CONFIG_APP") {
        window.dispatchEvent(new Event("brand-updated"));
        setIsEditingCms(false);
      }
      if (key === "CONFIG_AKADEMIK") {
        setIsEditingAkademik(false);
      }
      router.refresh();
      fetchSettings();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  const handleGenerateNextYear = async () => {
    if (!confirm("Apakah Anda yakin ingin membuat tahun ajaran berikutnya secara otomatis?")) return;
    try {
      await api.post("/tahun-ajaran/generate");
      toast.success("Tahun ajaran berhasil di-generate");
      fetchTahunAjaran();
    } catch (err) {
      console.error(err);
      toast.error("Gagal men-generate tahun ajaran");
    }
  };

  const activeTaLabel = tahunAjaranList.find((t) => t.id === akademik.tahunAjaranId)?.label || "Belum dipilih";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: "var(--primary)" }}>
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pengaturan Sistem</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Kelola konfigurasi akademik, branding aplikasi, dan standar tema institusi.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto">
        <button
          onClick={() => setActiveTab("akademik")}
          className={`px-4 py-3 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === "akademik" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          <Database size={16} className="inline mr-2" /> Pengaturan Akademik
        </button>
        <button
          onClick={() => setActiveTab("cms")}
          className={`px-4 py-3 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === "cms" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          <LayoutTemplate size={16} className="inline mr-2" /> Branding (CMS)
        </button>
        <button
          onClick={() => setActiveTab("tema")}
          className={`px-4 py-3 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === "tema" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          <Palette size={16} className="inline mr-2" /> Tampilan & Tema Institusi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          {activeTab === "akademik" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Pengaturan Kalender & Semester Akademik</h2>
                  <p className="text-[12px] text-[var(--text-secondary)]">Kelola tahun ajaran aktif serta rentang tanggal semester ganjil dan genap.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateNextYear}
                    className="px-3 py-1.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-bold rounded-lg hover:bg-[var(--border)] transition-colors"
                  >
                    Generate TA Otomatis
                  </button>
                  {!isEditingAkademik ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingAkademik(true)}
                      className="px-4 py-1.5 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      <Pencil size={13} /> Edit Pengaturan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAkademik(false);
                        fetchSettings();
                      }}
                      className="px-3 py-1.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-bold rounded-lg hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                    >
                      <X size={13} /> Batal
                    </button>
                  )}
                </div>
              </div>

              {!isEditingAkademik ? (
                // View Mode
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tahun Ajaran Aktif</span>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">{activeTaLabel}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Semester Ganjil</span>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {akademik.tanggalMulaiGanjil || "—"} s.d. {akademik.tanggalSelesaiGanjil || "—"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Semester Genap</span>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {akademik.tanggalMulaiGenap || "—"} s.d. {akademik.tanggalSelesaiGenap || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Pilih Tahun Ajaran Aktif</label>
                    <select
                      value={akademik.tahunAjaranId}
                      onChange={(e) => setAkademik({ ...akademik, tahunAjaranId: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                    >
                      <option value="">-- Pilih Tahun Ajaran --</option>
                      {tahunAjaranList.map((ta) => (
                        <option key={ta.id} value={ta.id}>{ta.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)]">Mulai Semester Ganjil</label>
                      <input
                        type="date"
                        value={akademik.tanggalMulaiGanjil}
                        onChange={(e) => setAkademik({ ...akademik, tanggalMulaiGanjil: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)]">Selesai Semester Ganjil</label>
                      <input
                        type="date"
                        value={akademik.tanggalSelesaiGanjil}
                        onChange={(e) => setAkademik({ ...akademik, tanggalSelesaiGanjil: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)]">Mulai Semester Genap</label>
                      <input
                        type="date"
                        value={akademik.tanggalMulaiGenap}
                        onChange={(e) => setAkademik({ ...akademik, tanggalMulaiGenap: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)]">Selesai Semester Genap</label>
                      <input
                        type="date"
                        value={akademik.tanggalSelesaiGenap}
                        onChange={(e) => setAkademik({ ...akademik, tanggalSelesaiGenap: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-3">
                    <button
                      onClick={() => saveSettings("CONFIG_AKADEMIK", akademik)}
                      disabled={saving}
                      className="px-5 py-2.5 text-white rounded-[var(--radius-md)] text-[13px] font-bold shadow-sm transition-all flex items-center gap-2"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      {saving && <Loader2 size={14} className="animate-spin" />} Simpan Perubahan Akademik
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingAkademik(false);
                        fetchSettings();
                      }}
                      className="px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[13px] font-bold rounded-[var(--radius-md)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "cms" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Branding Aplikasi & Tab Browser</h2>
                  <p className="text-[12px] text-[var(--text-secondary)]">Kelola nama aplikasi, judul tab browser, dan logo identitas instansi.</p>
                </div>
                <div>
                  {!isEditingCms ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingCms(true)}
                      className="px-4 py-1.5 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      <Pencil size={13} /> Edit Branding
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCms(false);
                        fetchSettings();
                      }}
                      className="px-3 py-1.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-bold rounded-lg hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                    >
                      <X size={13} /> Batal
                    </button>
                  )}
                </div>
              </div>

              {!isEditingCms ? (
                // View Mode CMS
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Nama Aplikasi (Brand)</span>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">{cms.namaAplikasi || "—"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-1">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Judul Tab Browser (Title Tab)</span>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{cms.titleTab || "—"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Logo & Icon Instansi</span>
                    {cms.logoUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={cms.logoUrl} alt="Logo" className="w-12 h-12 object-cover rounded-xl border border-[var(--border)] shadow-sm" />
                        <span className="text-[12px] text-[var(--text-secondary)] font-mono truncate">{cms.logoUrl}</span>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--text-tertiary)] italic">Belum ada logo yang diatur.</p>
                    )}
                  </div>
                </div>
              ) : (
                // Edit Mode CMS
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Nama Aplikasi (Brand)</label>
                    <input
                      type="text"
                      value={cms.namaAplikasi}
                      onChange={e => setCms({...cms, namaAplikasi: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                      placeholder="Nama Aplikasi"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Judul Tab Browser (Title Tab)</label>
                    <input
                      type="text"
                      value={cms.titleTab}
                      onChange={e => setCms({...cms, titleTab: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                      placeholder="Contoh: Portal Akademik | Absensi Sekolah"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Logo Brand & Icon (Sidebar, Login & Favicon Tab)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={cms.logoUrl}
                        onChange={e => setCms({...cms, logoUrl: e.target.value})}
                        className="flex-1 px-3.5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px]"
                        placeholder="https://example.com/logo.png atau unggah ke Cloudinary"
                      />
                      <label className="px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-[12px] font-bold rounded-[var(--radius-md)] hover:bg-[var(--border)] cursor-pointer transition-colors shrink-0">
                        {uploadingLogo ? "Mengunggah..." : "Upload ke Cloudinary"}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>
                    {cms.logoUrl && (
                      <div className="mt-2 flex items-center gap-3 p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
                        <img src={cms.logoUrl} alt="Preview Logo & Icon" className="w-10 h-10 object-cover rounded-lg border border-[var(--border)]" />
                        <span className="text-[12px] text-[var(--text-secondary)] truncate">Preview Logo & Icon Tab Aktif</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex items-center gap-3">
                    <button
                      onClick={() => saveSettings("CONFIG_APP", cms)}
                      disabled={saving}
                      className="px-5 py-2.5 text-white rounded-[var(--radius-md)] text-[13px] font-bold shadow-sm transition-all flex items-center gap-2"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      {saving && <Loader2 size={14} className="animate-spin" />} Simpan Perubahan Branding
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingCms(false);
                        setLogoFile(null);
                        fetchSettings();
                      }}
                      className="px-4 py-2.5 bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)] text-[13px] font-bold rounded-[var(--radius-md)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "tema" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">Pilih Warna Utama (Primary Color)</h2>
                <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                  Warna utama akan diterapkan ke seluruh tombol, badge, indikator aktif, dan aksen navigasi aplikasi secara real-time.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {PRESET_COLORS.map((color) => {
                    const isSelected = themeConfig.primaryColor.toLowerCase() === color.value.toLowerCase();
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleColorChange(color.value)}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                          isSelected
                            ? "border-[var(--primary)] shadow-sm bg-[var(--surface-subtle)]"
                            : "border-[var(--border)] hover:border-[var(--text-tertiary)]"
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color.value }} />
                        <div>
                          <p className="text-[12px] font-bold text-[var(--text-primary)]">{color.name}</p>
                          <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{color.value}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Picker */}
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] space-y-3">
                  <label className="text-xs font-bold text-[var(--text-secondary)] block">Atau Pilih Warna Kustom (Custom Color)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfig.primaryColor.startsWith("#") && themeConfig.primaryColor.length === 7 ? themeConfig.primaryColor : "#0FBE85"}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-12 h-10 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeConfig.primaryColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="px-3.5 py-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-[13px] font-mono uppercase w-36"
                      placeholder="#0FBE85"
                    />
                  </div>
                </div>
              </div>

              {/* Standar Varian Terang (Light Mode Nuansa) */}
              <div className="pt-4 border-t border-[var(--border)]">
                <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">Standar Varian Terang (Light Mode Nuansa)</h2>
                <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                  Tentukan varian terang standar institusi yang digunakan saat pengguna memilih Light Mode.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LIGHT_VARIANTS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = themeConfig.defaultLightVariant === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleLightVariantChange(m.id)}
                        className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
                          isSelected ? "border-[var(--primary)] shadow-sm bg-[var(--surface-subtle)]" : "border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-[13px]">
                          <Icon size={16} className="text-[var(--primary)]" />
                          <span>{m.name}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Standar Varian Gelap (Dark Mode Nuansa) */}
              <div className="pt-4 border-t border-[var(--border)]">
                <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">Standar Varian Gelap (Dark Mode Nuansa)</h2>
                <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                  Tentukan varian gelap standar institusi yang digunakan saat pengguna memilih Dark Mode.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DARK_VARIANTS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = themeConfig.defaultDarkVariant === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleDarkVariantChange(m.id)}
                        className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
                          isSelected ? "border-[var(--primary)] shadow-sm bg-[var(--surface-subtle)]" : "border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-[13px]">
                          <Icon size={16} className="text-[var(--primary)]" />
                          <span>{m.name}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => saveSettings("CONFIG_THEME", themeConfig)}
                  disabled={saving}
                  className="px-5 py-2.5 text-white rounded-[var(--radius-md)] text-[13px] font-bold shadow-sm transition-all flex items-center gap-2"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />} Simpan Pengaturan Tema Institusi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
