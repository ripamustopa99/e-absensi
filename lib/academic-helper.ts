import { query } from "@/lib/db";

export async function ensureAbsensiSiswaTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS "absensi_siswa" (
        id TEXT PRIMARY KEY,
        "jadwalId" TEXT NOT NULL,
        "siswaId" TEXT NOT NULL,
        tanggal DATE NOT NULL,
        status TEXT DEFAULT 'HADIR',
        alasan TEXT,
        "materiAjar" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT absensi_siswa_jadwal_siswa_tanggal_key UNIQUE ("jadwalId", "siswaId", tanggal)
      );
    `);
  } catch (err) {
    console.error("ensureAbsensiSiswaTableExists error:", err);
  }
}

export async function ensureDefaultTahunAjaran() {
  try {
    const res = await query(`SELECT COUNT(*) as count FROM tahun_ajaran`);
    const count = parseInt(res.rows[0]?.count || "0", 10);
    if (count === 0) {
      const year = new Date().getFullYear();
      const nextYear = year + 1;
      const label = `${year}/${nextYear}`;
      const id = `ta-${year}`;
      const tanggalMulaiGanjil = `${year}-07-13`;
      const tanggalSelesaiGanjil = `${year}-12-19`;
      const tanggalMulaiGenap = `${nextYear}-01-05`;
      const tanggalSelesaiGenap = `${nextYear}-06-20`;

      await query(
        `INSERT INTO tahun_ajaran (id, label, "isAktif", "tanggalMulaiGanjil", "tanggalSelesaiGanjil", "tanggalMulaiGenap", "tanggalSelesaiGenap")
         VALUES ($1, $2, true, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [id, label, tanggalMulaiGanjil, tanggalSelesaiGanjil, tanggalMulaiGenap, tanggalSelesaiGenap]
      );

      await query(
        `INSERT INTO setting (id, key, value, "updatedAt") 
         VALUES (gen_random_uuid(), 'CONFIG_AKADEMIK', $1::jsonb, NOW()) 
         ON CONFLICT (key) DO NOTHING`,
        [
          JSON.stringify({
            tahunAjaranId: id,
            tanggalMulaiGanjil,
            tanggalSelesaiGanjil,
            tanggalMulaiGenap,
            tanggalSelesaiGenap,
          }),
        ]
      );
    }
  } catch (err) {
    console.error("ensureDefaultTahunAjaran error:", err);
  }
}

export async function getCurrentAcademicContext() {
  try {
    await ensureDefaultTahunAjaran();

    const settingRes = await query(`SELECT value FROM setting WHERE key = 'CONFIG_AKADEMIK'`);
    let config = settingRes.rows[0]?.value;
    if (typeof config === "string") {
      try { config = JSON.parse(config); } catch {}
    }

    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    let tahunAjaranId = config?.tahunAjaranId;
    let semester = "GANJIL";

    if (config?.tanggalMulaiGanjil && config?.tanggalSelesaiGanjil && todayStr >= config.tanggalMulaiGanjil && todayStr <= config.tanggalSelesaiGanjil) {
      semester = "GANJIL";
    } else if (config?.tanggalMulaiGenap && config?.tanggalSelesaiGenap && todayStr >= config.tanggalMulaiGenap && todayStr <= config.tanggalSelesaiGenap) {
      semester = "GENAP";
    } else {
      const month = now.getMonth() + 1;
      semester = (month >= 7 && month <= 12) ? "GANJIL" : "GENAP";
    }

    if (!tahunAjaranId) {
      const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`);
      if (taRes.rows.length > 0) {
        tahunAjaranId = taRes.rows[0].id;
      } else {
        const latestTaRes = await query(`SELECT id FROM tahun_ajaran ORDER BY label DESC LIMIT 1`);
        if (latestTaRes.rows.length > 0) {
          tahunAjaranId = latestTaRes.rows[0].id;
        }
      }
    }

    return {
      tahunAjaranId,
      semester,
    };
  } catch (err) {
    console.error("getCurrentAcademicContext error:", err);
    const taRes = await query(`SELECT id FROM tahun_ajaran WHERE "isAktif" = true LIMIT 1`).catch(() => ({ rows: [] }));
    const fallbackTaId = taRes.rows[0]?.id || "";
    const month = new Date().getMonth() + 1;
    return {
      tahunAjaranId: fallbackTaId,
      semester: (month >= 7 && month <= 12) ? "GANJIL" : "GENAP",
    };
  }
}
