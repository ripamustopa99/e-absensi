/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database local...');

  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { kodeAkses: 'ADM001' },
    update: {
      password: hashedPassword,
      nama: 'Admin Sekolah',
      role: Role.ADMIN,
      isAktif: true,
      mustChangePass: false,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      kodeAkses: 'ADM001',
      password: hashedPassword,
      nama: 'Admin Sekolah',
      role: Role.ADMIN,
      jabatan: 'Administrator Sistem',
      isAktif: true,
      mustChangePass: false,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  });

  console.log('✅ Admin account seeded:', { kodeAkses: admin.kodeAkses, nama: admin.nama });

  const tahunAjaran = await prisma.tahunAjaran.upsert({
    where: { id: 'ta-2026' },
    update: { isAktif: true },
    create: {
      id: 'ta-2026',
      label: '2026/2027',
      isAktif: true,
      tanggalMulaiGanjil: new Date('2026-07-13'),
      tanggalSelesaiGanjil: new Date('2026-12-19'),
      tanggalMulaiGenap: new Date('2027-01-05'),
      tanggalSelesaiGenap: new Date('2027-06-20'),
    },
  });

  console.log('✅ Tahun Ajaran seeded:', tahunAjaran.label);
  console.log('🎉 Seeding selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
