const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// @route   GET /api/vehicles/categories
// @desc    Get all vehicle categories and rates
router.get('/categories', async (req, res, next) => {
  try {
    const [categories] = await db.query('SELECT * FROM vehicle_categories ORDER BY base_rate_per_km ASC');
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/vehicles
// @desc    Get fleet list (filterable)
router.get('/', async (req, res, next) => {
  try {
    const { category, status } = req.query;
    let query = `
      SELECT v.*, vc.name as category_name, vc.base_rate_per_km 
      FROM vehicles v
      JOIN vehicle_categories vc ON v.category_id = vc.id
    `;
    let filters = [];
    let params = [];

    if (category) {
      filters.push('vc.name = ?');
      params.push(category);
    }
    if (status) {
      filters.push('v.status = ?');
      params.push(status);
    }

    if (filters.length > 0) {
      query += ' WHERE ' + filters.join(' AND ');
    }

    const [vehicles] = await db.query(query, params);
    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/vehicles
// @desc    Add new vehicle (Admin only)
router.post('/', protect, restrictTo('administrator'), async (req, res, next) => {
  try {
    const { category_id, make, model, license_plate, seating_capacity, luggage_capacity, fuel_type, image_url } = req.body;

    if (!category_id || !make || !model || !license_plate || !seating_capacity || !luggage_capacity || !fuel_type) {
      return res.status(400).json({ success: false, message: 'Please provide all required vehicle details' });
    }

    const [existing] = await db.query('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Vehicle with this registration plate already exists' });
    }

    const [result] = await db.query(
      `INSERT INTO vehicles 
       (category_id, make, model, license_plate, seating_capacity, luggage_capacity, fuel_type, status, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?)`,
      [category_id, make, model, license_plate, seating_capacity, luggage_capacity, fuel_type, image_url || null]
    );

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: {
        id: result.insertId,
        make,
        model,
        license_plate
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
