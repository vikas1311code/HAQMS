const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdminOnly } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/patients
// FIX: Replaced in-memory pagination with proper SQL pagination using take/skip
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // FIX: Build where clause for DB-level filtering instead of in-memory
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // FIX: Run count and data fetch in parallel (was sequential before)
    const [totalPatients, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(totalPatients / limitNum);

    res.json({
      success: true,
      patients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPatients,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Fetch patients error:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// GET /api/patients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            doctor: {
              include: { user: true }
            }
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('Fetch patient error:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// POST /api/patients
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phone, medicalHistory } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    // FIX: Email format validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
      }
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        medicalHistory: medicalHistory || null,
      },
    });

    res.status(201).json({ success: true, patient });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Failed to register patient' });
  }
});

// DELETE /api/patients/:id
// FIX: Now uses authorizeAdminOnly instead of broken authorizeAdminOnlyLegacy
router.delete('/:id', authenticate, authorizeAdminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await prisma.patient.delete({ where: { id } });

    res.json({ success: true, message: `Successfully deleted patient ${patient.name}` });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router;