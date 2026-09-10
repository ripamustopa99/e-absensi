/* eslint-disable @typescript-eslint/no-require-imports */
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
      DROP TABLE IF EXISTS guru_wali_tingkat CASCADE;
      CREATE TABLE guru_wali_tingkat (
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
        { id: 'faq-1', q: 'Bagaimana cara melakukan absensi harian bagi guru?', a: "Masuk ke menu Guru, pilih 'Absensi', lalu klik tombol Check-In saat berada di jam jadwal mengajar Anda.", urutan: 1 },
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

    // 1. Truncate all tables to clean old data completely
    console.log('🧹 Cleaning existing database records...');
    await client.query(`
      TRUNCATE TABLE 
        absensi_siswa, 
        absensi_guru, 
        jadwal_tingkat, 
        jadwal_mengajar, 
        guru_wali_tingkat, 
        riwayat_siswa, 
        user_mapel, 
        siswa, 
        mapel, 
        pengumuman_dibaca, 
        pengumuman, 
        log_aktivitas, 
        masukan, 
        notifikasi, 
        faq, 
        tahun_ajaran, 
        users 
      CASCADE;
    `);
    console.log('✅ Database successfully cleaned.');

    // Seed Admin
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminId = 'admin_default_01';

    await client.query(
      `INSERT INTO users (id, "kodeAkses", password, nama, role, "isAktif", "mustChangePass", "failedLoginAttempts", "lockUntil", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', true, false, 0, NULL, NOW(), NOW())`,
      [adminId, 'ADM001', hashedPassword, 'Admin Sekolah']
    );
    console.log('✅ Admin account seeded: kodeAkses = ADM001, password = Admin123!');

    // Seed Tahun Ajaran
    const taId = 'ta-2026';
    await client.query(
      `INSERT INTO tahun_ajaran (id, label, "isAktif", "tanggalMulaiGanjil", "tanggalSelesaiGanjil", "tanggalMulaiGenap", "tanggalSelesaiGenap")
       VALUES ($1, $2, true, $3, $4, $5, $6)`,
      [taId, '2026/2027', '2026-07-13', '2026-12-19', '2027-01-05', '2027-06-20']
    );
    console.log('✅ Tahun Ajaran seeded: 2026/2027');

    // Seed Structured Sample Students
    const sampleStudents = [
      // MTs Tingkat VII (Wali: GURU01)
      { id: 'mts-01', nisn: '3120260701', nama: 'Ahmad Fauzi', jenjang: 'MTS', tingkat: 'VII', jk: 'Laki-laki', tgl: '2013-05-12', ortu: 'Bapak Fauzi' },
      { id: 'mts-02', nisn: '3120260702', nama: 'Aisyah Humairah', jenjang: 'MTS', tingkat: 'VII', jk: 'Perempuan', tgl: '2013-03-10', ortu: 'Bapak Humairah' },
      { id: 'mts-03', nisn: '3120260703', nama: 'Muhammad Al Fatih', jenjang: 'MTS', tingkat: 'VII', jk: 'Laki-laki', tgl: '2013-07-22', ortu: 'Bapak Fatih' },
      { id: 'mts-04', nisn: '3120260704', nama: 'Salma Nur Azizah', jenjang: 'MTS', tingkat: 'VII', jk: 'Perempuan', tgl: '2013-01-15', ortu: 'Ibu Azizah' },
      { id: 'mts-05', nisn: '3120260705', nama: 'Umar bin Khattab', jenjang: 'MTS', tingkat: 'VII', jk: 'Laki-laki', tgl: '2013-09-09', ortu: 'Bapak Khattab' },

      // MTs Tingkat VIII (Wali: GURU04)
      { id: 'mts-06', nisn: '3120260801', nama: 'Zaid bin Tsabit', jenjang: 'MTS', tingkat: 'VIII', jk: 'Laki-laki', tgl: '2012-04-11', ortu: 'Bapak Tsabit' },
      { id: 'mts-07', nisn: '3120260802', nama: 'Fatimah Az-Zahra', jenjang: 'MTS', tingkat: 'VIII', jk: 'Perempuan', tgl: '2012-10-05', ortu: 'Bapak Zahra' },

      // MA Tingkat X (Wali: GURU02)
      { id: 'ma-01', nisn: '4120261001', nama: 'Tariq bin Ziyad', jenjang: 'MA', tingkat: 'X', jk: 'Laki-laki', tgl: '2010-11-05', ortu: 'Bapak Ziyad' },
      { id: 'ma-02', nisn: '4120261002', nama: 'Maryam binti Imran', jenjang: 'MA', tingkat: 'X', jk: 'Perempuan', tgl: '2010-06-22', ortu: 'Bapak Imran' },
      { id: 'ma-03', nisn: '4120261003', nama: 'Ali bin Abi Thalib', jenjang: 'MA', tingkat: 'X', jk: 'Laki-laki', tgl: '2010-02-14', ortu: 'Bapak Thalib' },
    ];

    for (const s of sampleStudents) {
      await client.query(
        `INSERT INTO siswa (id, nisn, nama, jenjang, tingkat, "jenisKelamin", "tanggalLahir", "namaOrangTua", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::"Jenjang", $5, $6, $7, $8, 'AKTIF'::"StatusSiswa", NOW(), NOW())`,
        [s.id, s.nisn, s.nama, s.jenjang, s.tingkat, s.jk, s.tgl, s.ortu]
      );
    }
    console.log('✅ Structured sample students seeded successfully.');

    // Seed Teachers (Guru)
    const teacherPassword = await bcrypt.hash('Guru123!', 10);
    const teachers = [
      { id: 'guru-01', kodeAkses: 'GURU01', nama: 'Ustadz Ahmad Fauzi, S.Pd.I', jabatan: 'Guru Fiqih & Wali Kelas MTs VII', noTelp: '081234567891' },
      { id: 'guru-02', kodeAkses: 'GURU02', nama: 'Ustadzah Siti Aminah, M.Pd', jabatan: 'Guru Matematika & Wali Kelas MA X', noTelp: '081234567892' },
      { id: 'guru-03', kodeAkses: 'GURU03', nama: 'Ustadz Budi Santoso, S.Pd', jabatan: 'Guru Mapel Umum (Non-Wali Kelas)', noTelp: '081234567893' },
      { id: 'guru-04', kodeAkses: 'GURU04', nama: 'Ustadz Drs. H. M. Zainal Arifin', jabatan: 'Guru Quran Hadits & Wali Kelas MTs VIII', noTelp: '081234567894' },
    ];

    for (const t of teachers) {
      await client.query(
        `INSERT INTO users (id, "kodeAkses", password, nama, role, jabatan, "noTelp", "isAktif", "mustChangePass", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'GURU'::"Role", $5, $6, true, false, NOW(), NOW())`,
        [t.id, t.kodeAkses, teacherPassword, t.nama, t.jabatan, t.noTelp]
      );
    }
    console.log('✅ Sample teachers seeded (GURU01, GURU02, GURU03, GURU04 with password: Guru123!).');

    // Seed Wali Kelas Assignment (guru_wali_tingkat)
    const waliAssignments = [
      { userId: 'guru-01', jenjang: 'MTS', tingkat: 'VII' },
      { userId: 'guru-04', jenjang: 'MTS', tingkat: 'VIII' },
      { userId: 'guru-02', jenjang: 'MA', tingkat: 'X' },
    ];

    for (const w of waliAssignments) {
      await client.query(
        `INSERT INTO guru_wali_tingkat (id, "userId", jenjang, tingkat)
         VALUES (gen_random_uuid(), $1, $2::"Jenjang", $3)`,
        [w.userId, w.jenjang, w.tingkat]
      );
    }
    console.log('✅ Homeroom teacher (Wali Kelas) assignments seeded.');

    // Seed Mapel
    const sampleMapel = [
      { id: 'mapel-01', nama: 'Al-Qur`an Hadits', jenjang: 'MTS' },
      { id: 'mapel-02', nama: 'Fiqih', jenjang: 'MTS' },
      { id: 'mapel-03', nama: 'Akidah Akhlak', jenjang: 'MTS' },
      { id: 'mapel-04', nama: 'Matematika', jenjang: 'MA' },
      { id: 'mapel-05', nama: 'Bahasa Arab', jenjang: 'MA' },
    ];

    for (const m of sampleMapel) {
      await client.query(
        `INSERT INTO mapel (id, nama, jenjang, "isAktif", "createdAt", "updatedAt")
         VALUES ($1, $2, $3::"Jenjang", true, NOW(), NOW())`,
        [m.id, m.nama, m.jenjang]
      );
    }
    console.log('✅ Sample subjects (mapel) seeded.');

    // Seed Jadwal Mengajar & Jadwal Tingkat
    const jadwalId = 'jadwal-mts-01';
    await client.query(
      `INSERT INTO jadwal_mengajar (id, "guruId", "mapelId", jenjang, semester, hari, "jamMulai", "jamSelesai", "tahunAjaranId")
       VALUES ($1, 'guru-01', 'mapel-02', 'MTS'::"Jenjang", 'GANJIL'::"Semester", 1, '07:30', '09:00', 'ta-2026')`,
      [jadwalId]
    );

    await client.query(
      `INSERT INTO jadwal_tingkat (id, "jadwalMengajarId", tingkat)
       VALUES (gen_random_uuid(), $1, 'VII')`,
      [jadwalId]
    );
    console.log('✅ Sample teaching schedule seeded.');

    // Seed sample student attendance for testing rekap
    const todayStr = new Date().toISOString().split('T')[0];
    await client.query(
      `INSERT INTO absensi_siswa (id, "jadwalId", "siswaId", tanggal, status, "createdAt")
       VALUES (gen_random_uuid(), $1, 'mts-01', $2, 'HADIR'::"StatusAbsensiSiswa", NOW())`,
      [jadwalId, todayStr]
    );
    await client.query(
      `INSERT INTO absensi_siswa (id, "jadwalId", "siswaId", tanggal, status, "createdAt")
       VALUES (gen_random_uuid(), $1, 'mts-02', $2, 'SAKIT'::"StatusAbsensiSiswa", NOW())`,
      [jadwalId, todayStr]
    );
    await client.query(
      `INSERT INTO absensi_siswa (id, "jadwalId", "siswaId", tanggal, status, "createdAt")
       VALUES (gen_random_uuid(), $1, 'mts-03', $2, 'IZIN'::"StatusAbsensiSiswa", NOW())`,
      [jadwalId, todayStr]
    );
    console.log('✅ Sample student attendance records seeded.');

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
