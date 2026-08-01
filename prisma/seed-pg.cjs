require('dotenv/config');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Checking / creating local database "absensi_db"...');

  // 1. Connect to default 'postgres' db to create 'absensi_db' if not exists
  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:ripamustopa99@localhost:5432/postgres',
  });

  try {
    const client = await adminPool.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'absensi_db'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE absensi_db');
      console.log('✅ Database "absensi_db" created successfully.');
    } else {
      console.log('ℹ️ Database "absensi_db" already exists.');
    }
    client.release();
  } catch (err) {
    console.log('ℹ️ Note on DB creation:', err.message);
  } finally {
    await adminPool.end();
  }

  // 2. Connect to 'absensi-sekolah' db and run migrations/seed
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  try {
    console.log('📦 Creating tables if not exist...');
    
    // Create Enums if not exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('GURU', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "Jenjang" AS ENUM ('MTS', 'MA');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "Semester" AS ENUM ('GANJIL', 'GENAP');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "StatusAbsensiGuru" AS ENUM ('HADIR', 'TELAT', 'IZIN', 'SAKIT', 'CUTI', 'ALPA', 'BELUM_ABSEN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "StatusAbsensiSiswa" AS ENUM ('HADIR', 'SAKIT', 'IZIN', 'ALPA');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "StatusSiswa" AS ENUM ('AKTIF', 'MUTASI', 'LULUS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "JenisPengajuan" AS ENUM ('IZIN', 'SAKIT', 'CUTI');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "StatusApproval" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "JenisHariKalender" AS ENUM ('LIBUR_NASIONAL', 'CUTI_BERSAMA', 'KEGIATAN_SEKOLAH');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        "kodeAkses" VARCHAR(255) UNIQUE,
        "kodeUnik" VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        nama VARCHAR(255) NOT NULL,
        role "Role" DEFAULT 'GURU',
        "jenisKelamin" VARCHAR(50),
        "tempatLahir" VARCHAR(255),
        "tanggalLahir" TIMESTAMP,
        "noTelp" VARCHAR(50),
        foto TEXT,
        jabatan VARCHAR(255),
        "isAktif" BOOLEAN DEFAULT true,
        "mustChangePass" BOOLEAN DEFAULT true,
        "failedLoginAttempts" INTEGER DEFAULT 0,
        "lockUntil" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create tahun_ajaran table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tahun_ajaran (
        id VARCHAR(255) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        "isAktif" BOOLEAN DEFAULT false,
        "tanggalMulaiGanjil" TIMESTAMP NOT NULL,
        "tanggalSelesaiGanjil" TIMESTAMP NOT NULL,
        "tanggalMulaiGenap" TIMESTAMP NOT NULL,
        "tanggalSelesaiGenap" TIMESTAMP NOT NULL
      );
    `);

    // Create siswa table
    await client.query(`
      CREATE TABLE IF NOT EXISTS siswa (
        id VARCHAR(255) PRIMARY KEY,
        nisn VARCHAR(255) UNIQUE NOT NULL,
        nama VARCHAR(255) NOT NULL,
        jenjang "Jenjang" NOT NULL,
        tingkat VARCHAR(50) NOT NULL,
        "jenisKelamin" VARCHAR(50),
        "tanggalLahir" DATE,
        "namaOrangTua" VARCHAR(255),
        status "StatusSiswa" DEFAULT 'AKTIF',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create mapel table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mapel (
        id VARCHAR(255) PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        jenjang "Jenjang" NOT NULL,
        kurikulum TEXT[] DEFAULT ARRAY['Kurikulum Merdeka'],
        tingkat TEXT[],
        "isAktif" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create user_mapel table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_mapel (
        "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        "mapelId" VARCHAR(255) REFERENCES mapel(id) ON DELETE CASCADE,
        PRIMARY KEY ("userId", "mapelId")
      );
    `);

    // Create riwayat_siswa table
    await client.query(`
      CREATE TABLE IF NOT EXISTS riwayat_siswa (
        id VARCHAR(255) PRIMARY KEY,
        "siswaId" VARCHAR(255) REFERENCES siswa(id) ON DELETE CASCADE,
        jenjang "Jenjang" NOT NULL,
        tingkat VARCHAR(50) NOT NULL,
        "tahunAjaranId" VARCHAR(255) REFERENCES tahun_ajaran(id),
        status "StatusSiswa" DEFAULT 'AKTIF',
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create setting table
    await client.query(`
      CREATE TABLE IF NOT EXISTS setting (
        id VARCHAR(255) PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create jadwal_mengajar table
    await client.query(`
      CREATE TABLE IF NOT EXISTS jadwal_mengajar (
        id VARCHAR(255) PRIMARY KEY,
        "guruId" VARCHAR(255) REFERENCES users(id) NOT NULL,
        "guruPenggantiId" VARCHAR(255) REFERENCES users(id),
        "mapelId" VARCHAR(255) REFERENCES mapel(id) NOT NULL,
        jenjang "Jenjang" NOT NULL,
        semester "Semester" NOT NULL,
        hari INTEGER NOT NULL,
        "jamMulai" VARCHAR(50) NOT NULL,
        "jamSelesai" VARCHAR(50) NOT NULL,
        "tahunAjaranId" VARCHAR(255) REFERENCES tahun_ajaran(id) NOT NULL
      );
    `);

    // Create jadwal_tingkat table
    await client.query(`
      CREATE TABLE IF NOT EXISTS jadwal_tingkat (
        id VARCHAR(255) PRIMARY KEY,
        "jadwalMengajarId" VARCHAR(255) REFERENCES jadwal_mengajar(id) ON DELETE CASCADE,
        tingkat VARCHAR(50) NOT NULL
      );
    `);

    // Create absensi_guru table
    await client.query(`
      CREATE TABLE IF NOT EXISTS absensi_guru (
        id VARCHAR(255) PRIMARY KEY,
        "jadwalId" VARCHAR(255) REFERENCES jadwal_mengajar(id) NOT NULL,
        "guruId" VARCHAR(255) REFERENCES users(id) NOT NULL,
        tanggal DATE NOT NULL,
        "waktuAbsen" TIMESTAMP,
        status "StatusAbsensiGuru" DEFAULT 'BELUM_ABSEN',
        lokasi TEXT,
        catatan TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT absensi_guru_jadwalId_tanggal_key UNIQUE ("jadwalId", tanggal)
      );
    `);

    // Create absensi_siswa table
    await client.query(`
      CREATE TABLE IF NOT EXISTS absensi_siswa (
        id VARCHAR(255) PRIMARY KEY,
        "jadwalId" VARCHAR(255) REFERENCES jadwal_mengajar(id) NOT NULL,
        "siswaId" VARCHAR(255) REFERENCES siswa(id) NOT NULL,
        tanggal DATE NOT NULL,
        status "StatusAbsensiSiswa" DEFAULT 'HADIR',
        alasan TEXT,
        "materiAjar" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT absensi_siswa_unique_key UNIQUE ("jadwalId", "siswaId", tanggal)
      );
    `);

    // Create pengajuan_izin table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pengajuan_izin (
        id VARCHAR(255) PRIMARY KEY,
        "guruId" VARCHAR(255) REFERENCES users(id) NOT NULL,
        jenis "JenisPengajuan" NOT NULL,
        "tanggalMulai" DATE NOT NULL,
        "tanggalSelesai" DATE NOT NULL,
        keterangan TEXT NOT NULL,
        "lampiranUrl" TEXT,
        status "StatusApproval" DEFAULT 'MENUNGGU',
        "catatanAdmin" TEXT,
        "diprosesOlehId" VARCHAR(255) REFERENCES users(id),
        "diprosesPada" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create kalender_akademik table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kalender_akademik (
        id VARCHAR(255) PRIMARY KEY,
        tanggal DATE UNIQUE NOT NULL,
        jenis "JenisHariKalender" NOT NULL,
        keterangan TEXT NOT NULL,
        "tahunAjaranId" VARCHAR(255) REFERENCES tahun_ajaran(id)
      );
    `);

    // Create pengumuman table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pengumuman (
        id VARCHAR(255) PRIMARY KEY,
        judul VARCHAR(255) NOT NULL,
        isi TEXT NOT NULL,
        "dibuatOlehId" VARCHAR(255) REFERENCES users(id) NOT NULL,
        "targetJenjang" "Jenjang",
        pinned BOOLEAN DEFAULT false,
        foto TEXT,
        "tahunAjaranId" VARCHAR(255) REFERENCES tahun_ajaran(id),
        "isPublished" BOOLEAN DEFAULT true,
        "isAutoGenerated" BOOLEAN DEFAULT false,
        "tanggalPublish" TIMESTAMP DEFAULT NOW(),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create pengumuman_dibaca table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pengumuman_dibaca (
        id VARCHAR(255) PRIMARY KEY,
        "pengumumanId" VARCHAR(255) REFERENCES pengumuman(id) ON DELETE CASCADE,
        "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        "readAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT pengumuman_dibaca_unique_key UNIQUE ("pengumumanId", "userId")
      );
    `);

    // Create log_aktivitas table
    await client.query(`
      CREATE TABLE IF NOT EXISTS log_aktivitas (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) REFERENCES users(id) NOT NULL,
        aksi VARCHAR(255) NOT NULL,
        modul VARCHAR(255) NOT NULL,
        detail JSONB,
        "ipAddress" VARCHAR(100),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create masukan table (Pusat Bantuan & Masukan)
    await client.query(`
      CREATE TABLE IF NOT EXISTS masukan (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        kategori VARCHAR(50) NOT NULL DEFAULT 'SARAN',
        subjek VARCHAR(255) NOT NULL,
        pesan TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'MENUNGGU',
        "tanggapanAdmin" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create guru_wali_tingkat table
    await client.query(`
      CREATE TABLE IF NOT EXISTS guru_wali_tingkat (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        jenjang "Jenjang" NOT NULL,
        tingkat VARCHAR(50) NOT NULL,
        CONSTRAINT guru_wali_tingkat_unique UNIQUE ("userId", jenjang, tingkat)
      );
    `);

    // Create notifikasi table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifikasi (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        judul VARCHAR(255) NOT NULL,
        pesan TEXT NOT NULL,
        "isDibaca" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create faq table
    await client.query(`
      CREATE TABLE IF NOT EXISTS faq (
        id VARCHAR(255) PRIMARY KEY,
        pertanyaan TEXT NOT NULL,
        jawaban TEXT NOT NULL,
        urutan INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default FAQs if empty
    const faqCheck = await client.query('SELECT COUNT(*) FROM faq');
    if (parseInt(faqCheck.rows[0].count) === 0) {
      const defaultFaqs = [
        { id: 'faq-1', q: 'Bagaimana cara melakukan absensi harian bagi guru?', a: "Masuk ke menu Guru, pilih 'Absensi' atau 'Absensi Hari Ini', lalu klik tombol Check-In saat berada di jam jadwal mengajar Anda.", urutan: 1 },
        { id: 'faq-2', q: 'Bagaimana cara merekap kehadiran siswa per kelas?', a: "Buka menu Rekap di sidebar, pilih 'Absensi Siswa', lalu pilih kelas dan rentang tanggal yang ingin direkap atau di-export.", urutan: 2 },
        { id: 'faq-3', q: 'Bagaimana cara mengajukan izin atau sakit?', a: "Anda dapat mengajukan izin melalui menu profil atau pengajuan izin yang tersedia pada sistem portal akademik.", urutan: 3 },
        { id: 'faq-4', q: 'Bagaimana sistem keamanan login di portal ini?', a: "Portal ini menggunakan kode unik / NIP min. 6 digit dan password berstandar hashing Bcrypt. Sesi diamankan dengan HttpOnly & Secure cookies tanpa menyimpan token sensitif di localStorage.", urutan: 4 }
      ];
      for (const f of defaultFaqs) {
        await client.query(
          `INSERT INTO faq (id, pertanyaan, jawaban, urutan, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [f.id, f.q, f.a, f.urutan]
        );
      }
    }

    // Seed Admin
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminId = 'admin_default_01';

    await client.query(
      `INSERT INTO users (id, "kodeAkses", password, nama, role, "isAktif", "mustChangePass", "failedLoginAttempts", "lockUntil", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', true, false, 0, NULL, NOW(), NOW())
       ON CONFLICT ("kodeAkses") 
       DO UPDATE SET password = $3, nama = $4, role = 'ADMIN', "isAktif" = true, "mustChangePass" = false, "failedLoginAttempts" = 0, "lockUntil" = NULL, "updatedAt" = NOW()`,
      [adminId, 'ADM001', hashedPassword, 'Admin Sekolah']
    );
    console.log('✅ Admin account seeded: kodeAkses = ADM001, password = Admin123!');

    // Seed Tahun Ajaran
    const taId = 'ta-2026';
    await client.query(
      `INSERT INTO tahun_ajaran (id, label, "isAktif", "tanggalMulaiGanjil", "tanggalSelesaiGanjil", "tanggalMulaiGenap", "tanggalSelesaiGenap")
       VALUES ($1, $2, true, $3, $4, $5, $6)
       ON CONFLICT (id) 
       DO UPDATE SET label = $2, "isAktif" = true`,
      [taId, '2026/2027', '2026-07-13', '2026-12-19', '2027-01-05', '2027-06-20']
    );
    console.log('✅ Tahun Ajaran seeded: 2026/2027');

    // Seed Sample Students
    const sampleStudents = [
      { id: 'mts-01', nisn: '3120123401', nama: 'Ahmad Fauzi', jenjang: 'MTS', tingkat: 'VII', jk: 'Laki-laki', tgl: '2013-05-12', ortu: 'Bapak Fauzi' },
      { id: 'mts-02', nisn: '3120123402', nama: 'Siti Nurhaliza', jenjang: 'MTS', tingkat: 'VIII', jk: 'Perempuan', tgl: '2012-08-20', ortu: 'Ibu Haliza' },
      { id: 'mts-03', nisn: '3120123403', nama: 'Budi Santoso', jenjang: 'MTS', tingkat: 'IX', jk: 'Laki-laki', tgl: '2011-02-15', ortu: 'Bapak Santoso' },
      { id: 'ma-01', nisn: '4120123401', nama: 'Dewi Lestari', jenjang: 'MA', tingkat: 'X', jk: 'Perempuan', tgl: '2010-11-05', ortu: 'Bapak Lestari' },
      { id: 'ma-02', nisn: '4120123402', nama: 'Reza Pratama', jenjang: 'MA', tingkat: 'XI', jk: 'Laki-laki', tgl: '2009-04-22', ortu: 'Bapak Pratama' },
      { id: 'ma-03', nisn: '4120123403', nama: 'Rina Melati', jenjang: 'MA', tingkat: 'XII', jk: 'Perempuan', tgl: '2008-09-10', ortu: 'Ibu Melati' },
    ];

    for (const s of sampleStudents) {
      await client.query(
        `INSERT INTO siswa (id, nisn, nama, jenjang, tingkat, "jenisKelamin", "tanggalLahir", "namaOrangTua", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::"Jenjang", $5, $6, $7, $8, 'AKTIF'::"StatusSiswa", NOW(), NOW())
         ON CONFLICT (nisn) 
         DO UPDATE SET nama = $3, jenjang = $4::"Jenjang", tingkat = $5, "jenisKelamin" = $6, "tanggalLahir" = $7, "namaOrangTua" = $8, "updatedAt" = NOW()`,
        [s.id, s.nisn, s.nama, s.jenjang, s.tingkat, s.jk, s.tgl, s.ortu]
      );
    }
    console.log('✅ Sample students seeded successfully.');

    console.log('🎉 Seeding database lokal berhasil!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
