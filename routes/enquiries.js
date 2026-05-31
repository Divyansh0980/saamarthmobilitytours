const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// @route   POST /api/enquiries/whatsapp
// @desc    Log a new WhatsApp click lead
router.post('/whatsapp', async (req, res, next) => {
  try {
    const { customer_name, customer_phone, trip_type, details } = req.body;

    if (!customer_name || !customer_phone || !trip_type) {
      return res.status(400).json({ success: false, message: 'Please provide name, phone, and trip type' });
    }

    const [result] = await db.query(
      `INSERT INTO whatsapp_enquiries (customer_name, customer_phone, trip_type, details, status) 
       VALUES (?, ?, ?, ?, 'new')`,
      [customer_name, customer_phone, trip_type, JSON.stringify(details || {})]
    );

    res.status(201).json({
      success: true,
      message: 'WhatsApp lead logged successfully',
      data: {
        id: result.insertId,
        customer_name,
        trip_type
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/enquiries/whatsapp
// @desc    List all logged enquiries (Admin/Dispatcher only)
router.get('/whatsapp', protect, restrictTo('administrator', 'dispatcher'), async (req, res, next) => {
  try {
    const [enquiries] = await db.query('SELECT * FROM whatsapp_enquiries ORDER BY created_at DESC');
    res.json({ success: true, count: enquiries.length, data: enquiries });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
