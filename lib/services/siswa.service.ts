import { query } from "@/lib/db";

const TINGKAT_RANKS: Record<string, number> = {
  'VII': 1,
  'VIII': 2,
  'IX': 3,
  'X': 4,
  'XI': 5,
  'XII': 6,
};



async function syncRiwayatSiswa(siswaId: string, jenjang: string, newTingkat: string, newStatus: string, tahunAjaranId?: string) {
  if (!tahunAjaranId) {
    const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
    tahunAjaranId = taRes.rows[0]?.id || "default-ta";
  }

  const currentRiwayatRes = await query(
    `SELECT id, tingkat, status FROM riwayat_siswa WHERE "siswaId" = $1 ORDER BY "createdAt" ASC`,
    [siswaId]
  );
  const existing = currentRiwayatRes.rows;
  const newRank = TINGKAT_RANKS[newTingkat] || 0;

  if (existing.length === 0) {
    await query(
      `INSERT INTO riwayat_siswa (id, "siswaId", jenjang, tingkat, "tahunAjaranId", status, "createdAt")
       VALUES (gen_random_uuid(), $1, $2::"Jenjang", $3, $4, $5::"StatusSiswa", NOW())`,
      [siswaId, jenjang, newTingkat, tahunAjaranId, newStatus]
    );
    return;
  }

  const maxExistingRank = Math.max(...existing.map((r: any) => TINGKAT_RANKS[r.tingkat] || 0));
  const minExistingRank = Math.min(...existing.map((r: any) => TINGKAT_RANKS[r.tingkat] || 0));

  if (newRank < maxExistingRank) {
    // Downgrade: delete any riwayat with rank > newRank
    for (const r of existing) {
      if ((TINGKAT_RANKS[r.tingkat] || 0) > newRank) {
        await query(`DELETE FROM riwayat_siswa WHERE id = $1`, [r.id]);
      }
    }
  } else if (newRank > maxExistingRank) {
    // Upgrade / jump: backfill intermediate grades only if student had prior lower grade history (not direct entry at higher grade)
    const baseRank = minExistingRank <= 3 ? 1 : 4; // VII for MTS, X for MA
    const maxLimitRank = minExistingRank <= 3 ? 3 : 6; // IX for MTS, XII for MA

    for (let r = baseRank; r <= Math.min(newRank, maxLimitRank); r++) {
      const tName = Object.keys(TINGKAT_RANKS).find(key => TINGKAT_RANKS[key] === r);
      if (tName) {
        const exists = existing.some((e: any) => e.tingkat === tName);
        if (!exists) {
          await query(
            `INSERT INTO riwayat_siswa (id, "siswaId", jenjang, tingkat, "tahunAjaranId", status, "createdAt")
             VALUES (gen_random_uuid(), $1, $2::"Jenjang", $3, $4, $5::"StatusSiswa", NOW())`,
            [siswaId, jenjang, tName, tahunAjaranId, r === newRank ? newStatus : 'AKTIF']
          );
        }
      }
    }
  }

  const checkExists = await query(`SELECT id FROM riwayat_siswa WHERE "siswaId" = $1 AND tingkat = $2`, [siswaId, newTingkat]);
  if (checkExists.rows.length === 0) {
    await query(
      `INSERT INTO riwayat_siswa (id, "siswaId", jenjang, tingkat, "tahunAjaranId", status, "createdAt")
       VALUES (gen_random_uuid(), $1, $2::"Jenjang", $3, $4, $5::"StatusSiswa", NOW())`,
      [siswaId, jenjang, newTingkat, tahunAjaranId, newStatus]
    );
  } else {
    await query(`UPDATE riwayat_siswa SET status = $2::"StatusSiswa" WHERE "siswaId" = $1 AND tingkat = $3`, [siswaId, newStatus, newTingkat]);
  }
}

export async function getSiswaList(filters?: {
  jenjang?: string;
  tingkat?: string;
  status?: string;
  search?: string;
  tahunAjaranId?: string;
  excludeImportedMa?: string | boolean;
  page?: number;
  limit?: number;
}) {
  let whereClauses = [`1=1`];
  const params: any[] = [];

  if (filters?.jenjang && filters.jenjang !== "ALL") {
    params.push(filters.jenjang);
    whereClauses.push(`jenjang = $${params.length}::"Jenjang"`);
  }

  if (filters?.tingkat && filters.tingkat !== "ALL") {
    params.push(filters.tingkat);
    whereClauses.push(`tingkat = $${params.length}`);
  }

  if (filters?.status && filters.status !== "ALL") {
    params.push(filters.status);
    whereClauses.push(`status = $${params.length}::"StatusSiswa"`);
  }

  if (filters?.tahunAjaranId && filters.tahunAjaranId !== "ALL") {
    params.push(filters.tahunAjaranId);
    whereClauses.push(`EXISTS (SELECT 1 FROM riwayat_siswa rs WHERE rs."siswaId" = siswa.id AND rs."tahunAjaranId" = $${params.length})`);
  }

  if (filters?.excludeImportedMa === 'true' || filters?.excludeImportedMa === true) {
    whereClauses.push(`NOT EXISTS (SELECT 1 FROM siswa ma WHERE ma.nisn = siswa.nisn AND ma.jenjang = 'MA'::"Jenjang")`);
  }

  if (filters?.search) {
    params.push(`%${filters.search}%`);
    whereClauses.push(`(nama ILIKE $${params.length} OR nisn ILIKE $${params.length})`);
  }

  const whereStr = whereClauses.join(" AND ");

  const countRes = await query(`SELECT COUNT(*) FROM siswa WHERE ${whereStr}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const sql = `SELECT * FROM siswa WHERE ${whereStr} ORDER BY nama ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const dataRes = await query(sql, [...params, limit, offset]);

  const studentIds = dataRes.rows.map((s: any) => s.id);
  let allRiwayat: any[] = [];
  if (studentIds.length > 0) {
    try {
      const riwayatRes = await query(
        `SELECT id, "siswaId", jenjang, tingkat, status, "createdAt" 
         FROM riwayat_siswa 
         WHERE "siswaId" = ANY($1::text[]) 
         ORDER BY 
           CASE tingkat 
             WHEN 'VII' THEN 1 
             WHEN 'VIII' THEN 2 
             WHEN 'IX' THEN 3 
             WHEN 'X' THEN 4 
             WHEN 'XI' THEN 5 
             WHEN 'XII' THEN 6 
             ELSE 7 
           END ASC, 
           "createdAt" ASC`,
        [studentIds]
      );
      allRiwayat = riwayatRes.rows;
    } catch (e: any) {}
  }

  const riwayatMap = new Map<string, any[]>();
  for (const r of allRiwayat) {
    if (!riwayatMap.has(r.siswaId)) {
      riwayatMap.set(r.siswaId, []);
    }
    const list = riwayatMap.get(r.siswaId)!;
    if (!list.some((item: any) => item.tingkat === r.tingkat)) {
      list.push(r);
    }
  }

  const dataWithRiwayat = dataRes.rows.map((s: any) => {
    let riwayatRows = riwayatMap.get(s.id) || [];
    if (riwayatRows.length === 0) {
      riwayatRows = [
        {
          id: "fallback-" + s.id,
          jenjang: s.jenjang,
          tingkat: s.tingkat,
          status: s.status,
          createdAt: s.createdAt || new Date(),
        },
      ];
    }

    return {
      ...s,
      riwayat: riwayatRows,
    };
  });

  return {
    data: dataWithRiwayat,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function createSiswa(data: {
  nisn: string;
  nama: string;
  jenjang: string;
  tingkat: string;
  jenisKelamin?: string | null;
  tanggalLahir?: string | null;
  namaOrangTua?: string | null;
  status?: string;
}) {
  if (!data.nisn || !data.nama || !data.jenjang || !data.tingkat) {
    throw new Error("NISN, Nama, Jenjang, dan Tingkat wajib diisi");
  }

  const existing = await query(`SELECT id FROM siswa WHERE nisn = $1 AND jenjang = $2::"Jenjang" LIMIT 1`, [data.nisn, data.jenjang]);
  if (existing.rows.length > 0) {
    throw new Error("NISN / NIK sudah terdaftar untuk jenjang ini");
  }

  const status = data.status || 'AKTIF';
  if (status === 'LULUS') {
    if ((data.jenjang === 'MTS' && data.tingkat !== 'IX') || (data.jenjang === 'MA' && data.tingkat !== 'XII')) {
      throw new Error("Siswa dengan status Lulus hanya boleh berada di tingkat akhir (IX untuk MTs, XII untuk MA)");
    }
  }

  const result = await query(
    `INSERT INTO siswa (id, nisn, nama, jenjang, tingkat, "jenisKelamin", "tanggalLahir", "namaOrangTua", status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3::"Jenjang", $4, $5, $6, $7, $8::"StatusSiswa", NOW(), NOW())
     RETURNING *`,
    [
      data.nisn,
      data.nama,
      data.jenjang,
      data.tingkat,
      data.jenisKelamin || null,
      data.tanggalLahir || null,
      data.namaOrangTua || null,
      status,
    ]
  );

  const siswa = result.rows[0];

  const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
  const tahunAjaranId = taRes.rows[0]?.id;

  if (tahunAjaranId) {
    try {
      await syncRiwayatSiswa(siswa.id, siswa.jenjang, siswa.tingkat, siswa.status, tahunAjaranId);
    } catch {}
  }

  return siswa;
}

export async function updateSiswa(id: string, data: any) {
  if (!id) throw new Error("ID siswa tidak valid");

  const currentRes = await query(`SELECT * FROM siswa WHERE id = $1 LIMIT 1`, [id]);
  if (currentRes.rows.length === 0) {
    throw new Error("Siswa tidak ditemukan");
  }
  const currentSiswa = currentRes.rows[0];

  const newStatus = data.status !== undefined ? data.status : currentSiswa.status;
  const newTingkat = data.tingkat !== undefined ? data.tingkat : currentSiswa.tingkat;
  const jenjang = currentSiswa.jenjang;

  if (newStatus === 'LULUS') {
    if ((jenjang === 'MTS' && newTingkat !== 'IX') || (jenjang === 'MA' && newTingkat !== 'XII')) {
      throw new Error("Siswa dengan status Lulus hanya boleh berada di tingkat akhir (IX untuk MTs, XII untuk MA). Tidak dapat menetapkan tingkat non-akhir untuk siswa Lulus.");
    }
  }

  const result = await query(
    `UPDATE siswa 
     SET nisn = COALESCE($2, nisn),
         nama = COALESCE($3, nama),
         jenjang = COALESCE($4::"Jenjang", jenjang),
         tingkat = COALESCE($5, tingkat),
         "jenisKelamin" = $6,
         "tanggalLahir" = $7,
         "namaOrangTua" = $8,
         status = COALESCE($9::"StatusSiswa", status),
         "updatedAt" = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.nisn,
      data.nama,
      data.jenjang,
      data.tingkat,
      data.jenisKelamin,
      data.tanggalLahir,
      data.namaOrangTua,
      data.status,
    ]
  );

  const updatedSiswa = result.rows[0];

  if (newTingkat !== currentSiswa.tingkat || newStatus !== currentSiswa.status) {
    const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
    const tahunAjaranId = taRes.rows[0]?.id;
    if (tahunAjaranId) {
      try {
        await syncRiwayatSiswa(id, updatedSiswa.jenjang, updatedSiswa.tingkat, updatedSiswa.status, tahunAjaranId);
      } catch {}
    }
  }

  return updatedSiswa;
}

export async function deleteSiswa(id: string) {
  const result = await query(`DELETE FROM siswa WHERE id = $1 RETURNING *`, [id]);
  if (result.rows.length === 0) {
    throw new Error("Siswa tidak ditemukan");
  }
  return result.rows[0];
}

export async function updateSiswaStatusBatch(ids: string[], status: string) {
  if (!ids || ids.length === 0) throw new Error("Tidak ada siswa yang dipilih");
  await query(
    `UPDATE siswa SET status = $2::"StatusSiswa", "updatedAt" = NOW() WHERE id = ANY($1::text[])`,
    [ids, status]
  );
}

export async function naikKelasSiswa(ids: string[]) {
  if (!ids || ids.length === 0) throw new Error("Tidak ada siswa yang dipilih untuk kenaikan kelas");

  const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
  const tahunAjaranId = taRes.rows[0]?.id;

  for (const id of ids) {
    const res = await query(`SELECT * FROM siswa WHERE id = $1 LIMIT 1`, [id]);
    if (res.rows.length === 0) continue;
    const s = res.rows[0];

    let nextTingkat = s.tingkat;
    let nextStatus = s.status;

    if (s.jenjang === "MTS") {
      if (s.tingkat === "VII") nextTingkat = "VIII";
      else if (s.tingkat === "VIII") nextTingkat = "IX";
      else if (s.tingkat === "IX") {
        nextStatus = "LULUS";
      }
    } else if (s.jenjang === "MA") {
      if (s.tingkat === "X") nextTingkat = "XI";
      else if (s.tingkat === "XI") nextTingkat = "XII";
      else if (s.tingkat === "XII") {
        nextStatus = "LULUS";
      }
    }

    await query(
      `UPDATE siswa SET tingkat = $2, status = $3::"StatusSiswa", "updatedAt" = NOW() WHERE id = $1`,
      [id, nextTingkat, nextStatus]
    );

    if (tahunAjaranId) {
      try {
        await syncRiwayatSiswa(id, s.jenjang, nextTingkat, nextStatus, tahunAjaranId);
      } catch {}
    }
  }
}

export async function luluskanSiswaBatch(ids: string[]) {
  if (!ids || ids.length === 0) throw new Error("Tidak ada siswa yang dipilih untuk kelulusan");

  const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
  const tahunAjaranId = taRes.rows[0]?.id;

  for (const id of ids) {
    const res = await query(`SELECT * FROM siswa WHERE id = $1 LIMIT 1`, [id]);
    if (res.rows.length === 0) continue;
    const s = res.rows[0];

    if ((s.jenjang === "MTS" && s.tingkat !== "IX") || (s.jenjang === "MA" && s.tingkat !== "XII")) {
      throw new Error(`Siswa ${s.nama} belum berada di tingkat akhir (IX/XII) sehingga belum dapat diluluskan.`);
    }

    await query(
      `UPDATE siswa SET status = 'LULUS'::"StatusSiswa", "updatedAt" = NOW() WHERE id = $1`,
      [id]
    );

    if (tahunAjaranId) {
      try {
        await syncRiwayatSiswa(id, s.jenjang, s.tingkat, 'LULUS', tahunAjaranId);
      } catch {}
    }
  }
}

export async function importMaFromMts(ids: string[]) {
  if (!ids || ids.length === 0) throw new Error("Tidak ada siswa MTs yang dipilih untuk diimpor ke MA");

  const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
  const tahunAjaranId = taRes.rows[0]?.id;

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const id of ids) {
    try {
      const res = await query(`SELECT * FROM siswa WHERE id = $1 AND jenjang = 'MTS' LIMIT 1`, [id]);
      if (res.rows.length === 0) {
        failedCount++;
        continue;
      }
      const mtsSiswa = res.rows[0];

      if (!mtsSiswa.nisn || mtsSiswa.nisn.trim() === "") {
        failedCount++;
        errors.push(`Siswa ${mtsSiswa.nama}: NISN kosong.`);
        continue;
      }

      // In-Place Update: migrate existing student record from MTs to MA (Level X) without duplication
      await query(
        `UPDATE siswa 
         SET jenjang = 'MA'::"Jenjang", 
             tingkat = 'X', 
             status = 'AKTIF'::"StatusSiswa", 
             "updatedAt" = NOW() 
         WHERE id = $1`,
        [id]
      );

      if (tahunAjaranId) {
        try {
          await syncRiwayatSiswa(id, 'MA', 'X', 'AKTIF', tahunAjaranId);
        } catch {}
      }
      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`Error: ${err.message}`);
    }
  }

  if (successCount === 0 && failedCount > 0) {
    throw new Error(errors[0] || "Gagal memigrasi siswa ke MA");
  }

  return { successCount, failedCount, errors };
}
