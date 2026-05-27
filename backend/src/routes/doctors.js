const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors
// FIX: Replaced SQL injection vulnerable queryRawUnsafe with Prisma parameterized queries
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        {
          user: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          specialization: { contains: search, mode: 'insensitive' }
        },
      ];
    }

    if (specialization && specialization !== 'All') {
      where.specialization = specialization;
    }

    const doctors = await prisma.doctor.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
      },
      orderBy: { id: 'asc' },
    });

    res.json({ success: true, doctors });
  } catch (error) {
    console.error('Fetch doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// GET /api/doctors/stats
// FIX: Replaced sequential awaits with Promise.all for parallel execution
router.get('/stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    const [totalDoctors, averageFee] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.aggregate({
        _avg: { id: true },
      }),
    ]);

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      data: {
        total: totalDoctors,
      },
      debugInfo: {
        executionTimeMs: durationMs,
      },
    });
  } catch (error) {
    console.error('Doctor stats error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor stats' });
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json({ success: true, doctor });
  } catch (error) {
    console.error('Fetch doctor error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

module.exports = router;