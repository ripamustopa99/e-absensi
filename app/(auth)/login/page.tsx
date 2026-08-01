"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  identifier: z.string().min(6, "Kode akses minimal 6 digit"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(18, "Password maksimal 18 karakter"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [brand, setBrand] = useState<{ namaAplikasi: string; logoUrl: string } | null>(null);

  useEffect(() => {
    api
      .get("/public/setting/config")
      .then((res) => setBrand(res.data))
      .catch(() => setBrand({ namaAplikasi: "Absensi Sekolah", logoUrl: "" }));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    console.log("Submitting login to:", "/auth/login");
    try {
      const res = await api.post<{
        success: true;
        data: { user: { role: "ADMIN" | "GURU"; mustChangePass: boolean } };
      }>("/auth/login", data);

      toast.success("Login berhasil!");

      if (res.data.data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/guru");
      }
    } catch {
      toast.error("Kode unik atau password salah");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-200">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[900px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[550px] relative z-10">
        {/* Left Side - Form Section */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-between bg-[var(--surface)]">
          <div className="w-full max-w-[380px] mx-auto">
            {/* Logo / Brand Header */}
            <div className="flex items-center gap-2 mb-10">
              <div className="w-8 h-8 rounded-lg bg-primary-subtle flex items-center justify-center text-primary font-extrabold text-sm overflow-hidden">
                {!brand ? (
                  <Loader2 size={16} className="animate-spin text-primary" />
                ) : brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  brand.namaAplikasi.charAt(0)
                )}
              </div>
              {!brand ? (
                <div className="h-4 bg-[var(--border-subtle)] rounded animate-pulse w-28" />
              ) : (
                <span className="font-bold tracking-wider text-[var(--text-primary)] text-sm">
                  {brand.namaAplikasi}
                </span>
              )}
            </div>

            {/* Title & Subtitle */}
            <div className="mb-8">
              {/* <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Masuk ke Akun Anda
              </h1> */}
              <p className="text-[13px] text-[var(--text-secondary)] mt-1.5">
                Silakan masukkan kode akses dan password Anda.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              {/* Identifier */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider"
                >
                  Kode Akses
                </label>
                <input
                  id="identifier"
                  {...register("identifier")}
                  type="text"
                  autoComplete="username"
                  placeholder="Masukkan min. 6 digit"
                  className={[
                    "w-full px-3.5 py-3 rounded-md text-[13px]",
                    "bg-[var(--surface-subtle)] border text-[var(--text-primary)]",
                    "placeholder:text-[var(--text-tertiary)]",
                    "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all",
                    errors.identifier
                      ? "border-rose-500"
                      : "border-[var(--border)]",
                  ].join(" ")}
                />
                {errors.identifier && (
                  <p className="text-rose-500 text-[11px] font-medium mt-1">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider"
                >
                  Password (6 - 18 Karakter)
                </label>
                <input
                  id="password"
                  {...register("password")}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={[
                    "w-full px-3.5 py-3 rounded-md text-[13px]",
                    "bg-[var(--surface-subtle)] border text-[var(--text-primary)]",
                    "placeholder:text-[var(--text-tertiary)]",
                    "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all",
                    errors.password
                      ? "border-rose-500"
                      : "border-[var(--border)]",
                  ].join(" ")}
                />
                {errors.password && (
                  <p className="text-rose-500 text-[11px] font-medium mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 bg-primary text-white text-[13px] font-bold rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>
          </div>

          {/* Footer Info */}
          <div className="pt-6 mt-6 border-t border-[var(--border)] text-center">
            <p className="text-[12px] text-[var(--text-tertiary)]">
              Butuh bantuan akses? Hubungi Tim IT Sekolah.
            </p>
          </div>
        </div>

        {/* Right Side - Analytics Illustration */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 bg-[var(--surface-subtle)] border-l border-[var(--border)] relative overflow-hidden p-10">
          {/* Kotak-kotak dekoratif background */}
          <div className="absolute top-6 right-8 w-10 h-10 border border-[var(--border)] rounded-sm rotate-12 opacity-60" />
          <div className="absolute top-16 right-24 w-7 h-7 bg-primary-subtle rounded-sm -rotate-6" />
          <div className="absolute bottom-12 left-10 w-8 h-8 border border-[var(--border)] rounded-sm rotate-45 opacity-40" />

          {/* Wrapper Kartu Analitik */}
          <div className="relative w-full max-w-[260px] mb-8">
            {/* Kartu Grafik Utama */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Analitik
                </span>
                <div className="flex items-center gap-0.5 bg-[var(--surface-subtle)] border border-[var(--border)] p-0.5 rounded-md text-[9px] font-medium text-[var(--text-secondary)]">
                  <span className="px-2 py-0.5 rounded">Mingguan</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-primary)] shadow-sm font-semibold">
                    Bulanan
                  </span>
                </div>
              </div>

              {/* Batang Grafik Bar Chart */}
              <div className="h-20 flex items-end justify-between gap-2 px-1 pt-2 border-b border-[var(--border)] pb-2">
                <div className="w-1/5 bg-primary/30 h-[45%] rounded-sm"></div>
                <div className="w-1/5 bg-primary h-[85%] rounded-sm"></div>
                <div className="w-1/5 bg-primary/60 h-[60%] rounded-sm"></div>
                <div className="w-1/5 bg-primary h-[95%] rounded-sm"></div>
                <div className="w-1/5 bg-primary/80 h-[75%] rounded-sm"></div>
              </div>

              <div className="flex justify-between text-[9px] font-bold text-[var(--text-tertiary)] px-1 mt-2">
                <span>SEN</span>
                <span>SEL</span>
                <span>RAB</span>
                <span>KAM</span>
                <span>JUM</span>
              </div>
            </div>

            {/* Kartu Kecil Melayang */}
            <div className="absolute -bottom-6 -right-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 shadow-2xl flex items-center gap-3 w-36">
              <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-extrabold text-[10px] shrink-0">
                +8%
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-tertiary)] block font-semibold uppercase">
                  Performa
                </span>
                <span className="text-xs font-extrabold text-[var(--text-primary)]">
                  Sangat Baik
                </span>
              </div>
            </div>
          </div>

          {/* Teks Deskripsi di Bawah */}
          <div className="text-center relative z-10 max-w-[280px]">
            <h3 className="text-[var(--text-primary)] font-bold text-sm mb-1">
              Cara mudah untuk berinteraksi
            </h3>
            <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
              Selamat datang di Sistem Absensi Sekolah! Pantau dan kelola aktivitas akademik Anda dengan mudah.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
