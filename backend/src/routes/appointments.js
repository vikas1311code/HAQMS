const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments
// FIX: Replaced N+1 queries with single query using Prisma include
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = parseInt(doctorId);
    if (status) where.status = status;

    // FIX: Single query with includes instead of N+1 loop
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            medicalHistory: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

// POST /api/appointments
// FIX: Proper duplicate booking check using a time window + DB transaction
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, scheduledAt, notes } = req.body;

    if (!patientId || !doctorId || !scheduledAt) {
      return res.status(400).json({ error: 'Patient, Doctor, and Appointment Date are required.' });
    }

    const appDate = new Date(scheduledAt);
    const doctorIdInt = parseInt(doctorId);
    const patientIdInt = parseInt(patientId);

    // FIX: Use transaction to prevent race conditions on double booking
    const appointment = await prisma.$transaction(async (tx) => {
      // Check for existing booking within 30 minute window
      const windowStart = new Date(appDate.getTime() - 30 * 60 * 1000);
      const windowEnd = new Date(appDate.getTime() + 30 * 60 * 1000);

      const existingBooking = await tx.appointment.findFirst({
        where: {
          doctorId: doctorIdInt,
          scheduledAt: {
            gte: windowStart,
            lte: windowEnd,
          },
          status: { not: 'cancelled' },
        },
      });

      if (existingBooking) {
        throw new Error('Doctor already has an appointment in this time window.');
      }

      return tx.appointment.create({
        data: {
          patientId: patientIdInt,
          doctorId: doctorIdInt,
          scheduledAt: appDate,
          notes: notes || '',
          status: 'pending',
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    if (error.message.includes('time window')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const id = parseInt(req.params.id);

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    res.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

module.exports = router;