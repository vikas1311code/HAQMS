const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// FIX: Replaced sequential loop queries with parallel Promise.all
// FIX: Removed artificial 80ms sleep delay
// FIX: Removed nested findMany for revenue — use count directly
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FIX: Fetch all doctors with user info in one query
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    // FIX: Run all doctor stat queries in PARALLEL instead of sequential loop
    const reportData = await Promise.all(
      doctors.map(async (doc) => {
        const [
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          todayQueueSize,
        ] = await Promise.all([
          prisma.appointment.count({
            where: { doctorId: doc.id },
          }),
          prisma.appointment.count({
            where: { doctorId: doc.id, status: 'completed' },
          }),
          prisma.appointment.count({
            where: { doctorId: doc.id, status: 'cancelled' },
          }),
          prisma.queueToken.count({
            where: {
              date: { gte: today },
            },
          }),
        ]);

        return {
          id: doc.id,
          name: doc.user?.name || 'Unknown',
          specialization: doc.specialization,
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          todayQueueSize,
        };
      })
    );

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      timeTakenMs: durationMs,
      data: reportData,
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;