const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@haqms.com' },
    update: {},
    create: {
      email: 'admin@haqms.com',
      password: hashedPassword,
      role: 'admin',
      name: 'System Admin',
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: 'reception1@haqms.com' },
    update: {},
    create: {
      email: 'reception1@haqms.com',
      password: hashedPassword,
      role: 'receptionist',
      name: 'Reception One',
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor1@haqms.com' },
    update: {},
    create: {
      email: 'doctor1@haqms.com',
      password: hashedPassword,
      role: 'doctor',
      name: 'Dr. John Smith',
    },
  });

  // Create Doctor profile
  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      specialization: 'General Medicine',
    },
  });

  // Create Patients
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { email: 'clark.kent@example.com' },
      update: {},
      create: {
        name: 'Clark Kent',
        email: 'clark.kent@example.com',
        phone: '9876543210',
        medicalHistory: null,
      },
    }),
    prisma.patient.upsert({
      where: { email: 'bruce.wayne@example.com' },
      update: {},
      create: {
        name: 'Bruce Wayne',
        email: 'bruce.wayne@example.com',
        phone: '9876543211',
        medicalHistory: null,
      },
    }),
    prisma.patient.upsert({
      where: { email: 'tony.stark@example.com' },
      update: {},
      create: {
        name: 'Tony Stark',
        email: 'tony.stark@example.com',
        phone: '9876543212',
        medicalHistory: 'Heart condition, Arc reactor implant',
      },
    }),
    prisma.patient.upsert({
      where: { email: 'peter.parker@example.com' },
      update: {},
      create: {
        name: 'Peter Parker',
        email: 'peter.parker@example.com',
        phone: '9876543213',
        medicalHistory: 'Spider bite, Enhanced reflexes',
      },
    }),
  ]);

  // Create Doctor Slots
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  for (let i = 0; i < 5; i++) {
    const start = new Date(tomorrow);
    start.setHours(9 + i, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10 + i, 0, 0, 0);

    await prisma.doctorSlot.upsert({
      where: { doctorId_startTime: { doctorId: doctor.id, startTime: start } },
      update: {},
      create: {
        doctorId: doctor.id,
        startTime: start,
        endTime: end,
        isBooked: false,
      },
    });
  }

  // Create Queue Tokens
  for (let i = 0; i < patients.length; i++) {
    await prisma.queueToken.create({
      data: {
        patientId: patients[i].id,
        tokenNumber: i + 1,
        status: i === 0 ? 'called' : 'waiting',
      },
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });