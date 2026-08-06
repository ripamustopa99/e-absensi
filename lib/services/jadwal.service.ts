/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "@/lib/db";
import { getCurrentAcademicContext, ensureDefaultTahunAjaran } from "@/lib/academic-helper";

const HARI_MAP: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};



export async function getAdminJadwalList(filters?: {
  jenjang?: string;
  tahunAjaranId?: string;
  tingkat?: string;
  guruId?: string;
  hari?: string;
  page?: number;
  limit?: number;
}) {
  await ensureDefaultTahunAjaran();

  try {
    const whereClauses = [`1=1`];
    const params: any[] = [];

    if (filters?.jenjang && filters.jenjang !== "ALL") {
      params.push(filters.jenjang);
      whereClauses.push(`j.jenjang::text = $${params.length}`);
    }

    if (filters?.tahunAjaranId && filters.tahunAjaranId !== "ALL") {
      params.push(filters.tahunAjaranId);
      whereClauses.push(`j."tahunAjaranId" = $${params.length}`);
    }

    if (filters?.guruId && filters.guruId !== "ALL") {
      params.push(filters.guruId);
      whereClauses.push(`j."guruId" = $${params.length}`);
    }

    if (filters?.hari && filters.hari !== "ALL") {
      params.push(parseInt(filters.hari, 10));
      whereClauses.push(`j.hari = $${params.length}`);
    }

    if (filters?.tingkat && filters.tingkat !== "ALL") {
      params.push(filters.tingkat);
      whereClauses.push(
        `EXISTS (SELECT 1 FROM jadwal_tingkat jt WHERE jt."jadwalMengajarId" = j.id AND jt.tingkat = $${params.length})`,
      );
    }

    const whereStr = whereClauses.join(" AND ");

    const countRes = await query(
      `SELECT COUNT(*) FROM jadwal_mengajar j WHERE ${whereStr}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT j.*, 
             row_to_json(m) as mapel,
             row_to_json(ta) as "tahunAjaran",
             row_to_json(g) as guru
      FROM jadwal_mengajar j
      LEFT JOIN mapel m ON j."mapelId" = m.id
      LEFT JOIN tahun_ajaran ta ON j."tahunAjaranId" = ta.id
      LEFT JOIN users g ON j."guruId" = g.id
      WHERE ${whereStr}
      ORDER BY j.hari ASC, j."jamMulai" ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await query(sql, [...params, limit, offset]);

    const jadwalIds = result.rows.map((r: any) => r.id);
    let allTingkat: any[] = [];
    if (jadwalIds.length > 0) {
      try {
        const tingkatRes = await query(
          `SELECT "jadwalMengajarId", tingkat FROM jadwal_tingkat WHERE "jadwalMengajarId" = ANY($1::text[])`,
          [jadwalIds],
        );
        allTingkat = tingkatRes.rows;
      } catch {}
    }

    const tingkatMap = new Map<string, any[]>();
    for (const t of allTingkat) {
      if (!tingkatMap.has(t.jadwalMengajarId)) {
        tingkatMap.set(t.jadwalMengajarId, []);
      }
      tingkatMap.get(t.jadwalMengajarId)!.push({ tingkat: t.tingkat });
    }

    const data = result.rows.map((row: any) => {
      return {
        ...row,
        namaHari: HARI_MAP[row.hari] || "Hari",
        tingkatList: tingkatMap.get(row.id) || [],
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (err) {
    console.error("getAdminJadwalList error:", err);
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 1 };
  }
}

export async function getFormOptions() {
  await ensureDefaultTahunAjaran();

  const guruRes = await query(
    `SELECT id, nama, "kodeAkses" FROM users WHERE role = 'GURU' AND "isAktif" = true ORDER BY nama ASC`,
  );
  const mapelRes = await query(
    `SELECT id, nama, jenjang FROM mapel WHERE "isAktif" = true ORDER BY nama ASC`,
  );
  const taRes = await query(
    `SELECT id, label, "isAktif" FROM tahun_ajaran ORDER BY label DESC`,
  );
  const studentCountsRes = await query(
    `SELECT jenjang, tingkat, COUNT(*) as count FROM siswa WHERE status = 'AKTIF' GROUP BY jenjang, tingkat`,
  );

  return {
    guru: guruRes.rows,
    mapel: mapelRes.rows,
    tahunAjaran: taRes.rows,
    studentCounts: studentCountsRes.rows,
  };
}

export async function createJadwal(data: {
  guruId: string;
  mapelId: string;
  jenjang: string;
  semester?: string;
  tingkatList: string[];
  tahunAjaranId?: string;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
}) {
  const currentContext = await getCurrentAcademicContext();
  const tahunAjaranId = data.tahunAjaranId || currentContext.tahunAjaranId;
  const semester = data.semester || currentContext.semester;

  if (
    !data.guruId ||
    !data.mapelId ||
    !data.jenjang ||
    !tahunAjaranId ||
    !data.tingkatList ||
    data.tingkatList.length === 0
  ) {
    throw new Error("Semua field wajib diisi termasuk tingkat kelas");
  }

  for (const tingkat of data.tingkatList) {
    const studentCheck = await query(
      `SELECT 1 FROM siswa WHERE jenjang = $1 AND tingkat = $2 AND status = 'AKTIF' LIMIT 1`,
      [data.jenjang, tingkat]
    );
    if (studentCheck.rows.length === 0) {
      throw new Error(`Tingkat ${data.jenjang} - ${tingkat} tidak dapat dipilih karena belum memiliki data siswa aktif.`);
    }
  }

  let warning = undefined;
  try {
    const conflictRes = await query(
      `SELECT j.id FROM jadwal_mengajar j 
       WHERE j."guruId" = $1 AND j."tahunAjaranId" = $2 AND j.hari = $3 
       AND (
         (j."jamMulai" <= $4 AND j."jamSelesai" > $4) OR
         (j."jamMulai" < $5 AND j."jamSelesai" >= $5) OR
         (j."jamMulai" >= $4 AND j."jamSelesai" <= $5)
       ) LIMIT 1`,
      [
        data.guruId,
        tahunAjaranId,
        data.hari,
        data.jamMulai,
        data.jamSelesai,
      ],
    );

    if (conflictRes.rows.length > 0) {
      warning =
        "Peringatan: Guru yang dipilih sudah memiliki jadwal mengajar di jam yang bentrok pada hari tersebut!";
    }
  } catch {}

  const result = await query(
    `INSERT INTO jadwal_mengajar (id, "guruId", "mapelId", jenjang, semester, hari, "jamMulai", "jamSelesai", "tahunAjaranId")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.guruId,
      data.mapelId,
      data.jenjang,
      semester,
      data.hari,
      data.jamMulai,
      data.jamSelesai,
      tahunAjaranId,
    ],
  );

  const jadwal = result.rows[0];

  for (const tingkat of data.tingkatList) {
    try {
      await query(
        `INSERT INTO jadwal_tingkat (id, "jadwalMengajarId", tingkat) VALUES (gen_random_uuid(), $1, $2)`,
        [jadwal.id, tingkat],
      );
    } catch {}
  }

  return {
    success: true,
    message: "Jadwal berhasil ditambahkan",
    warning,
    data: jadwal,
  };
}

export async function updateJadwal(
  id: string,
  data: {
    guruId?: string;
    mapelId?: string;
    jenjang?: string;
    semester?: string;
    tingkatList?: string[];
    tahunAjaranId?: string;
    hari?: number;
    jamMulai?: string;
    jamSelesai?: string;
  },
) {
  if (!id) throw new Error("ID jadwal tidak valid");

  if (data.tingkatList && data.tingkatList.length > 0) {
    for (const tingkat of data.tingkatList) {
      const studentCheck = await query(
        `SELECT 1 FROM siswa WHERE jenjang = $1 AND tingkat = $2 AND status = 'AKTIF' LIMIT 1`,
        [data.jenjang, tingkat]
      );
      if (studentCheck.rows.length === 0) {
        throw new Error(`Tingkat ${data.jenjang} - ${tingkat} tidak dapat dipilih karena belum memiliki data siswa aktif.`);
      }
    }
  }

  const currentContext = await getCurrentAcademicContext();
  const tahunAjaranId = data.tahunAjaranId || currentContext.tahunAjaranId;
  const semester = data.semester || currentContext.semester;

  let warning = undefined;
  try {
    const conflictRes = await query(
      `SELECT j.id FROM jadwal_mengajar j 
       WHERE j."guruId" = $1 AND j."tahunAjaranId" = $2 AND j.hari = $3 AND j.id != $4
       AND (
         (j."jamMulai" <= $5 AND j."jamSelesai" > $5) OR
         (j."jamMulai" < $6 AND j."jamSelesai" >= $6) OR
         (j."jamMulai" >= $5 AND j."jamSelesai" <= $6)
       ) LIMIT 1`,
      [
        data.guruId,
        tahunAjaranId,
        data.hari,
        id,
        data.jamMulai,
        data.jamSelesai,
      ],
    );

    if (conflictRes.rows.length > 0) {
      warning =
        "Peringatan: Guru yang dipilih sudah memiliki jadwal mengajar di jam yang bentrok pada hari tersebut!";
    }
  } catch {}

  const result = await query(
    `UPDATE jadwal_mengajar 
     SET "guruId" = COALESCE($2, "guruId"),
         "mapelId" = COALESCE($3, "mapelId"),
         jenjang = COALESCE($4, jenjang),
         semester = COALESCE($5, semester),
         hari = COALESCE($6, hari),
         "jamMulai" = COALESCE($7, "jamMulai"),
         "jamSelesai" = COALESCE($8, "jamSelesai"),
         "tahunAjaranId" = COALESCE($9, "tahunAjaranId")
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.guruId,
      data.mapelId,
      data.jenjang,
      semester,
      data.hari,
      data.jamMulai,
      data.jamSelesai,
      tahunAjaranId,
    ],
  );

  if (result.rows.length === 0) {
    throw new Error("Jadwal tidak ditemukan");
  }

  if (data.tingkatList && data.tingkatList.length > 0) {
    try {
      await query(`DELETE FROM jadwal_tingkat WHERE "jadwalMengajarId" = $1`, [
        id,
      ]);
      for (const tingkat of data.tingkatList) {
        await query(
          `INSERT INTO jadwal_tingkat (id, "jadwalMengajarId", tingkat) VALUES (gen_random_uuid(), $1, $2)`,
          [id, tingkat],
        );
      }
    } catch {}
  }

  return {
    success: true,
    message: "Jadwal berhasil diperbarui",
    warning,
    data: result.rows[0],
  };
}

export async function deleteJadwal(id: string) {
  const result = await query(
    `DELETE FROM jadwal_mengajar WHERE id = $1 RETURNING *`,
    [id],
  );
  if (result.rows.length === 0) {
    throw new Error("Jadwal tidak ditemukan");
  }
  return { success: true, message: "Jadwal berhasil dihapus" };
}

export async function importJadwal(data: {
  sourceTahunAjaranId: string;
  targetTahunAjaranId: string;
}) {
  if (!data.sourceTahunAjaranId || !data.targetTahunAjaranId) {
    throw new Error("Tahun ajaran sumber dan tujuan wajib dipilih");
  }

  const sourceRes = await query(
    `SELECT * FROM jadwal_mengajar WHERE "tahunAjaranId" = $1`,
    [data.sourceTahunAjaranId],
  );

  let importedCount = 0;
  for (const s of sourceRes.rows) {
    const newRes = await query(
      `INSERT INTO jadwal_mengajar (id, "guruId", "mapelId", jenjang, semester, hari, "jamMulai", "jamSelesai", "tahunAjaranId")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        s.guruId,
        s.mapelId,
        s.jenjang,
        s.semester,
        s.hari,
        s.jamMulai,
        s.jamSelesai,
        data.targetTahunAjaranId,
      ],
    );
    const newId = newRes.rows[0].id;

    try {
      const tingkatRes = await query(
        `SELECT tingkat FROM jadwal_tingkat WHERE "jadwalMengajarId" = $1`,
        [s.id],
      );

      for (const t of tingkatRes.rows) {
        await query(
          `INSERT INTO jadwal_tingkat (id, "jadwalMengajarId", tingkat) VALUES (gen_random_uuid(), $1, $2)`,
          [newId, t.tingkat],
        );
      }
    } catch {}

    importedCount++;
  }

  return {
    success: true,
    message: `Berhasil mengimpor ${importedCount} jadwal ke tahun ajaran baru`,
  };
}
