import { query } from "@/lib/db";

export async function logActivity(
  userId: string | null,
  aksi: string,
  modul: string,
  detail?: any,
  ipAddress?: string
) {
  try {
    if (!userId) return;
    await query(
      `INSERT INTO log_aktivitas (id, "userId", aksi, modul, detail, "ipAddress", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
      [userId, aksi, modul, detail ? JSON.stringify(detail) : null, ipAddress || null]
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
