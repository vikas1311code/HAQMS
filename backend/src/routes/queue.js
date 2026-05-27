const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, tokens });
  } catch (error) {
    console.error('Fetch queue error:', error);
    res.status(500).json({ error: 'Failed to retrieve queue' });
  }
});

// POST /api/queue/checkin
// FIX: Replaced race-condition prone aggregate+insert with a DB transaction
// FIX: Removed artificial 350ms sleep delay
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, appointmentId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required for check-in.' });
    }

    const patientIdInt = parseInt(patientId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FIX: Use transaction to prevent duplicate token numbers under concurrent requests
    const newToken = await prisma.$transaction(async (tx) => {
      const maxTokenResult = await tx.queueToken.aggregate({
        where: {
          date: { gte: today },
        },
        _max: {
          tokenNumber: true,
        },
      });

      const nextTokenNumber = (maxTokenResult._max.tokenNumber || 0) + 1;

      return tx.queueToken.create({
        data: {
          tokenNumber: nextTokenNumber,
          patientId: patientIdInt,
          appointmentId: appointmentId ? parseInt(appointmentId) : null,
          status: 'waiting',
        },
        include: {
          patient: true,
        },
      });
    });

    res.status(201).json({
      success: true,
      message: 'Checked in successfully. Token generated.',
      token: newToken,
    });
  } catch (error) {
    console.error('Queue check-in error:', error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

// PATCH /api/queue/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const id = parseInt(req.params.id);

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id },
      data: { status },
      include: {
        patient: true,
      },
    });

    res.json({ success: true, token: updatedToken });
  } catch (error) {
    console.error('Update queue error:', error);
    res.status(500).json({ error: 'Failed to update queue token' });
  }
});

module.exports = router;