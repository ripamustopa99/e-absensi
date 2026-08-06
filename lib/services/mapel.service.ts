/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "@/lib/db";

export async function getMapelList(filters?: {
  search?: string;
  jenjang?: string;
  kurikulum?: string;
  tingkat?: string;
  isAktif?: string;
  page?: number;
  limit?: number;
}) {
  const whereClauses = [`1=1`];
  const params: any[] = [];

  if (filters?.search) {
    params.push(`%${filters.search}%`);
    whereClauses.push(`nama ILIKE $${params.length}`);
  }
  if (filters?.jenjang && filters.jenjang !== "ALL") {
    params.push(filters.jenjang);
    whereClauses.push(`jenjang = $${params.length}::"Jenjang"`);
  }
  if (filters?.kurikulum && filters.kurikulum !== "ALL") {
    params.push(filters.kurikulum);
    whereClauses.push(`$${params.length} = ANY(kurikulum)`);
  }
  if (filters?.tingkat && filters.tingkat !== "ALL") {
    params.push(filters.tingkat);
    whereClauses.push(`$${params.length} = ANY(tingkat)`);
  }
  if (filters?.isAktif !== undefined && filters.isAktif !== "ALL") {
    params.push(filters.isAktif === "true");
    whereClauses.push(`"isAktif" = $${params.length}`);
  }

  const whereStr = whereClauses.join(" AND ");

  const countRes = await query(`SELECT COUNT(*) FROM mapel WHERE ${whereStr}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT m.* 
    FROM mapel m 
    WHERE ${whereStr} 
    ORDER BY nama ASC 
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const dataRes = await query(sql, [...params, limit, offset]);

  const mapelIds = dataRes.rows.map((r: any) => r.id);
  const guruCountMap = new Map<string, number>();
  const jadwalCountMap = new Map<string, number>();

  if (mapelIds.length > 0) {
    try {
      const gCounts = await query(
        `SELECT "mapelId", COUNT(*) as count FROM user_mapel WHERE "mapelId" = ANY($1::text[]) GROUP BY "mapelId"`,
        [mapelIds]
      );
      for (const row of gCounts.rows) {
        guruCountMap.set(row.mapelId, parseInt(row.count, 10));
      }
    } catch {}

    try {
      const jCounts = await query(
        `SELECT "mapelId", COUNT(*) as count FROM jadwal_mengajar WHERE "mapelId" = ANY($1::text[]) GROUP BY "mapelId"`,
        [mapelIds]
      );
      for (const row of jCounts.rows) {
        jadwalCountMap.set(row.mapelId, parseInt(row.count, 10));
      }
    } catch {}
  }

  const formattedData = dataRes.rows.map((row: any) => {
    return {
      id: row.id,
      nama: row.nama,
      jenjang: row.jenjang,
      kurikulum: row.kurikulum,
      tingkat: row.tingkat,
      isAktif: row.isAktif,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        guru: guruCountMap.get(row.id) || 0,
        jadwal: jadwalCountMap.get(row.id) || 0,
      },
    };
  });

  return {
    data: formattedData,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function createMapel(data: {
  nama: string;
  jenjang: string;
  kurikulum?: string[] | string;
  tingkat?: string[];
  isAktif?: boolean;
}) {
  if (!data.nama || !data.jenjang) {
    throw new Error("Nama dan Jenjang mata pelajaran wajib diisi");
  }

  const kurikulumArr = Array.isArray(data.kurikulum) 
    ? data.kurikulum 
    : [data.kurikulum || "Kurikulum Merdeka"];
  
  const tingkatArr = Array.isArray(data.tingkat) ? data.tingkat : [];

  const result = await query(
    `INSERT INTO mapel (id, nama, jenjang, kurikulum, tingkat, "isAktif", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2::"Jenjang", $3, $4, COALESCE($5, true), NOW(), NOW())
     RETURNING *`,
    [
      data.nama,
      data.jenjang,
      kurikulumArr,
      tingkatArr,
      data.isAktif,
    ]
  );
  
  const row = result.rows[0];
  return {
    ...row,
    _count: { guru: 0, jadwal: 0 },
  };
}

export async function updateMapel(id: string, data: any) {
  if (!id) throw new Error("ID mata pelajaran tidak valid");

  const kurikulumArr = data.kurikulum !== undefined 
    ? (Array.isArray(data.kurikulum) ? data.kurikulum : [data.kurikulum])
    : undefined;

  const tingkatArr = data.tingkat !== undefined
    ? (Array.isArray(data.tingkat) ? data.tingkat : [])
    : undefined;

  const result = await query(
    `UPDATE mapel
     SET nama = COALESCE($2, nama),
         jenjang = COALESCE($3::"Jenjang", jenjang),
         kurikulum = COALESCE($4, kurikulum),
         tingkat = COALESCE($5, tingkat),
         "isAktif" = COALESCE($6, "isAktif"),
         "updatedAt" = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, data.nama, data.jenjang, kurikulumArr, tingkatArr, data.isAktif]
  );

  if (result.rows.length === 0) {
    throw new Error("Mata pelajaran tidak ditemukan");
  }

  const row = result.rows[0];
  let guruCount = 0;
  let jadwalCount = 0;
  try {
    const c1 = await query(`SELECT COUNT(*) FROM user_mapel WHERE "mapelId" = $1`, [id]);
    guruCount = parseInt(c1.rows[0]?.count || "0", 10);
  } catch {}
  try {
    const c2 = await query(`SELECT COUNT(*) FROM jadwal_mengajar WHERE "mapelId" = $1`, [id]);
    jadwalCount = parseInt(c2.rows[0]?.count || "0", 10);
  } catch {}

  return {
    ...row,
    _count: {
      guru: guruCount,
      jadwal: jadwalCount,
    },
  };
}

export async function deleteMapel(id: string) {
  const result = await query(`DELETE FROM mapel WHERE id = $1 RETURNING *`, [id]);
  if (result.rows.length === 0) {
    throw new Error("Mata pelajaran tidak ditemukan");
  }
  return result.rows[0];
}

export async function toggleMapelStatus(id: string) {
  const result = await query(
    `UPDATE mapel SET "isAktif" = NOT "isAktif", "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new Error("Mata pelajaran tidak ditemukan");
  }
  return result.rows[0];
}

export async function importMapel(data: {
  sourceKurikulum: string;
  targetKurikulum: string;
  mapelIds: string[];
  jenjang: string;
}) {
  if (!data.mapelIds || data.mapelIds.length === 0) {
    throw new Error("Tidak ada mata pelajaran yang dipilih untuk diambil");
  }
  if (!data.targetKurikulum) {
    throw new Error("Kurikulum tujuan wajib diisi");
  }

  let updatedCount = 0;
  for (const id of data.mapelIds) {
    const res = await query(`SELECT * FROM mapel WHERE id = $1 LIMIT 1`, [id]);
    if (res.rows.length === 0) continue;
    const m = res.rows[0];
    const currentKurikulum: string[] = Array.isArray(m.kurikulum) ? m.kurikulum : [m.kurikulum];
    if (!currentKurikulum.includes(data.targetKurikulum)) {
      const newKurikulum = [...currentKurikulum, data.targetKurikulum];
      await query(`UPDATE mapel SET kurikulum = $2, "updatedAt" = NOW() WHERE id = $1`, [id, newKurikulum]);
      updatedCount++;
    }
  }

  return {
    success: true,
    message: `Berhasil merelasikan ${updatedCount} mata pelajaran ke kurikulum ${data.targetKurikulum}`,
  };
}
