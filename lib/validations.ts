import { z } from "zod";

export const userCreateSchema = z.object({
  kodeAkses: z.string().min(3, "Kode akses minimal 3 karakter"),
  nama: z.string().min(2, "Nama wajib diisi"),
  password: z.string().optional(),
  role: z.enum(["ADMIN", "GURU"]).optional(),
  jabatan: z.string().optional().nullable(),
  noTelp: z.string().optional().nullable(),
  jenisKelamin: z.string().optional().nullable(),
  tempatLahir: z.string().optional().nullable(),
  tanggalLahir: z.string().optional().nullable(),
  waliTingkat: z.array(z.object({
    jenjang: z.enum(["MTS", "MA"]),
    tingkat: z.string(),
  })).optional(),
});

export const userUpdateSchema = userCreateSchema.partial();

export const siswaCreateSchema = z.object({
  nisn: z.string().min(3, "NISN/NIK wajib diisi"),
  nama: z.string().min(2, "Nama siswa wajib diisi"),
  jenjang: z.enum(["MTS", "MA"]),
  tingkat: z.string().min(1, "Tingkat wajib diisi"),
  jenisKelamin: z.string().optional().nullable(),
  tanggalLahir: z.string().optional().nullable(),
  namaOrangTua: z.string().optional().nullable(),
  status: z.enum(["AKTIF", "MUTASI", "LULUS"]).optional(),
});

export const siswaUpdateSchema = siswaCreateSchema.partial();

export const mapelCreateSchema = z.object({
  nama: z.string().min(2, "Nama mapel wajib diisi"),
  jenjang: z.enum(["MTS", "MA"]),
  kurikulum: z.union([z.string(), z.array(z.string())]).optional(),
  tingkat: z.array(z.string()).optional(),
  isAktif: z.boolean().optional(),
});

export const mapelUpdateSchema = mapelCreateSchema.partial();

export const jadwalCreateSchema = z.object({
  guruId: z.string().min(1, "Guru wajib dipilih"),
  mapelId: z.string().min(1, "Mapel wajib dipilih"),
  jenjang: z.enum(["MTS", "MA"]),
  semester: z.enum(["GANJIL", "GENAP"]),
  tingkatList: z.array(z.string()).min(1, "Pilih minimal 1 tingkat kelas"),
  tahunAjaranId: z.string().min(1, "Tahun ajaran wajib dipilih"),
  hari: z.number().min(1).max(7),
  jamMulai: z.string().min(1, "Jam mulai wajib diisi"),
  jamSelesai: z.string().min(1, "Jam selesai wajib diisi"),
});

export const jadwalUpdateSchema = jadwalCreateSchema.partial();

export const loginSchema = z.object({
  identifier: z.string().min(3, "Kode akses atau kode unik wajib diisi"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string()
    .min(8, "Password baru minimal 8 karakter")
    .max(32, "Password baru maksimal 32 karakter")
    .regex(/[A-Z]/, "Password baru harus mengandung minimal 1 huruf besar")
    .regex(/[a-z]/, "Password baru harus mengandung minimal 1 huruf kecil")
    .regex(/[0-9]/, "Password baru harus mengandung minimal 1 angka")
    .refine((val) => val !== "Gr2026!" && val !== "Admin123!", "Password baru tidak boleh menggunakan password default"),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

export const pengumumanCreateSchema = z.object({
  judul: z.string().min(1, "Judul wajib diisi"),
  isi: z.string().min(1, "Isi wajib diisi"),
  targetJenjang: z.enum(["MTS", "MA"]).optional().nullable(),
  pinned: z.boolean().optional(),
  foto: z.string().optional().nullable(),
  tahunAjaranId: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
});

export const pengumumanUpdateSchema = pengumumanCreateSchema.partial();
