import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

async function ensureUserTablesExist() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS "guru_wali_tingkat" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        jenjang TEXT NOT NULL,
        tingkat TEXT NOT NULL
      );
    `);
  } catch {}
}

export async function getUsersList(filters?: { role?: string; search?: string; page?: number; limit?: number; isAktif?: string }) {
  await ensureUserTablesExist();

  let whereClauses = [`role = 'GURU'`];
  const params: any[] = [];

  if (filters?.role && filters.role !== "ALL") {
    params.push(filters.role);
    whereClauses[0] = `role = $${params.length}`;
  }

  if (filters?.isAktif && filters.isAktif !== "ALL") {
    params.push(filters.isAktif === "true");
    whereClauses.push(`"isAktif" = $${params.length}`);
  }

  if (filters?.search) {
    params.push(`%${filters.search}%`);
    whereClauses.push(`(nama ILIKE $${params.length} OR "kodeAkses" ILIKE $${params.length})`);
  }

  const whereStr = whereClauses.join(" AND ");

  const countRes = await query(`SELECT COUNT(*) FROM users WHERE ${whereStr}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  let sql = `SELECT id, "kodeAkses", "kodeUnik", nama, role, "jenisKelamin", "tempatLahir", "tanggalLahir", "noTelp", foto, jabatan, "isAktif", "createdAt", "updatedAt" FROM users WHERE ${whereStr} ORDER BY nama ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  
  const dataRes = await query(sql, [...params, limit, offset]);

  const usersWithWali = await Promise.all(
    dataRes.rows.map(async (user) => {
      let wkRows = [];
      try {
        const wkRes = await query(
          `SELECT id, jenjang, tingkat FROM guru_wali_tingkat WHERE "userId" = $1`,
          [user.id]
        );
        wkRows = wkRes.rows;
      } catch {}

      return {
        ...user,
        waliTingkat: wkRows,
      };
    })
  );

  return {
    data: usersWithWali,
    total,
    totalPages,
  };
}

async function validateWaliTingkat(waliTingkat: { jenjang: "MTS" | "MA"; tingkat: string }[], currentUserId?: string) {
  if (!waliTingkat || !Array.isArray(waliTingkat) || waliTingkat.length === 0) return;
  for (const w of waliTingkat) {
    let checkSql = `SELECT "userId" FROM guru_wali_tingkat WHERE jenjang = $1 AND tingkat = $2`;
    const params: any[] = [w.jenjang, w.tingkat];
    if (currentUserId) {
      checkSql += ` AND "userId" != $3`;
      params.push(currentUserId);
    }
    const res = await query(checkSql, params);
    if (res.rows.length > 0) {
      throw new Error(`Kelas ${w.jenjang} - Tingkat ${w.tingkat} sudah memiliki wali kelas lain.`);
    }
  }
}

export async function createUser(data: {
  kodeAkses: string;
  password?: string;
  nama: string;
  role?: string;
  jabatan?: string;
  noTelp?: string;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  waliTingkat?: { jenjang: "MTS" | "MA"; tingkat: string }[];
}) {
  await ensureUserTablesExist();

  if (data.waliTingkat && data.waliTingkat.length > 0) {
    await validateWaliTingkat(data.waliTingkat);
  }

  const hashedPassword = await bcrypt.hash(data.password || "Gr2026!", 10);
  const result = await query(
    `INSERT INTO users (id, "kodeAkses", password, nama, role, jabatan, "noTelp", "jenisKelamin", "tempatLahir", "tanggalLahir", "isAktif", "mustChangePass", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4::"Role", $5, $6, $7, $8, $9, true, true, NOW(), NOW())
     RETURNING id, "kodeAkses", nama, role, jabatan, "noTelp", "jenisKelamin", "tempatLahir", "tanggalLahir", "isAktif", "createdAt", "updatedAt"`,
    [
      data.kodeAkses,
      hashedPassword,
      data.nama,
      data.role || "GURU",
      data.jabatan || null,
      data.noTelp || null,
      data.jenisKelamin || null,
      data.tempatLahir || null,
      data.tanggalLahir || null,
    ]
  );
  const newUser = result.rows[0];

  if (data.waliTingkat && data.waliTingkat.length > 0) {
    for (const w of data.waliTingkat) {
      try {
        await query(
          `INSERT INTO guru_wali_tingkat (id, "userId", jenjang, tingkat) VALUES (gen_random_uuid(), $1, $2, $3)`,
          [newUser.id, w.jenjang, w.tingkat]
        );
      } catch {}
    }
  }

  let wkRows = [];
  try {
    const wkRes = await query(
      `SELECT id, jenjang, tingkat FROM guru_wali_tingkat WHERE "userId" = $1`,
      [newUser.id]
    );
    wkRows = wkRes.rows;
  } catch {}

  return {
    ...newUser,
    waliTingkat: wkRows,
  };
}

export async function updateUser(id: string, data: any) {
  await ensureUserTablesExist();

  let hashedPassword = undefined;
  if (data.password) {
    hashedPassword = await bcrypt.hash(data.password, 10);
  }

  const result = await query(
    `UPDATE users 
     SET "kodeAkses" = COALESCE($2, "kodeAkses"),
         nama = COALESCE($3, nama),
         role = COALESCE($4::"Role", role),
         "jenisKelamin" = $5,
         "tempatLahir" = $6,
         "tanggalLahir" = $7,
         "noTelp" = $8,
         jabatan = $9,
         password = COALESCE($10, password),
         "updatedAt" = NOW()
     WHERE id = $1
     RETURNING id, "kodeAkses", nama, role, "jenisKelamin", "tempatLahir", "tanggalLahir", "noTelp", foto, jabatan, "isAktif", "createdAt", "updatedAt"`,
    [
      id,
      data.kodeAkses || null,
      data.nama || null,
      data.role || null,
      data.jenisKelamin || null,
      data.tempatLahir || null,
      data.tanggalLahir || null,
      data.noTelp || null,
      data.jabatan || null,
      hashedPassword,
    ]
  );

  if (result.rows.length === 0) {
    throw new Error("Pengguna tidak ditemukan");
  }

  if (data.waliTingkat !== undefined) {
    if (Array.isArray(data.waliTingkat) && data.waliTingkat.length > 0) {
      await validateWaliTingkat(data.waliTingkat, id);
    }
    try {
      await query(`DELETE FROM guru_wali_tingkat WHERE "userId" = $1`, [id]);
      if (Array.isArray(data.waliTingkat) && data.waliTingkat.length > 0) {
        for (const w of data.waliTingkat) {
          await query(
            `INSERT INTO guru_wali_tingkat (id, "userId", jenjang, tingkat) VALUES (gen_random_uuid(), $1, $2, $3)`,
            [id, w.jenjang, w.tingkat]
          );
        }
      }
    } catch (err: any) {
      throw err;
    }
  }

  let wkRows = [];
  try {
    const wkRes = await query(
      `SELECT id, jenjang, tingkat FROM guru_wali_tingkat WHERE "userId" = $1`,
      [id]
    );
    wkRows = wkRes.rows;
  } catch {}

  return {
    ...result.rows[0],
    waliTingkat: wkRows,
  };
}

export async function deleteUser(id: string) {
  const result = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
  return result.rows[0];
}

export async function toggleUserStatus(id: string) {
  const result = await query(
    `UPDATE users SET "isAktif" = NOT "isAktif", "updatedAt" = NOW() WHERE id = $1 RETURNING id, "isAktif"`,
    [id]
  );
  return result.rows[0];
}

export async function resetPassword(id: string) {
  const defaultPassword = "Gr2026!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  const result = await query(
    `UPDATE users SET password = $2, "mustChangePass" = true, "failedLoginAttempts" = 0, "lockUntil" = NULL, "updatedAt" = NOW() WHERE id = $1 RETURNING id, "kodeAkses"`,
    [id, hashedPassword]
  );
  return { defaultPassword, user: result.rows[0] };
}
