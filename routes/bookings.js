const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// @route   POST /api/bookings
// @desc    Create a new booking request
router.post('/', protect, async (req, res, next) => {
  try {
    const {
      trip_type,
      pickup_address,
      drop_address,
      pickup_datetime,
      return_datetime,
      selected_package,
      flight_number,
      base_amount,
      customer_notes
    } = req.body;

    if (!trip_type || !pickup_address || !pickup_datetime || !base_amount) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const [result] = await db.query(
      `INSERT INTO bookings (
        customer_id, trip_type, pickup_address, drop_address, 
        pickup_datetime, return_datetime, selected_package, 
        flight_number, base_amount, status, customer_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        req.user.id,
        trip_type,
        pickup_address,
        drop_address || null,
        pickup_datetime,
        return_datetime || null,
        selected_package || null,
        flight_number || null,
        base_amount,
        customer_notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        id: result.insertId,
        customer_id: req.user.id,
        trip_type,
        pickup_address,
        pickup_datetime,
        status: 'pending'
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/bookings
// @desc    Get bookings for user (or all if admin)
router.get('/', protect, async (req, res, next) => {
  try {
    let query = `
      SELECT b.*, 
             CONCAT(u.first_name, ' ', u.last_name) as customer_name,
             u.phone as customer_phone,
             v.model as vehicle_model,
             v.license_plate as vehicle_plate,
             CONCAT(du.first_name, ' ', du.last_name) as driver_name,
             du.phone as driver_phone
      FROM bookings b
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
    `;
    let params = [];

    const isAdmin = req.user.roles.includes('administrator') || req.user.roles.includes('dispatcher');
    if (!isAdmin) {
      query += ' WHERE b.customer_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY b.pickup_datetime DESC';

    const [bookings] = await db.query(query, params);

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking details by ID
router.get('/:id', protect, async (req, res, next) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.*, 
              CONCAT(u.first_name, ' ', u.last_name) as customer_name,
              u.phone as customer_phone,
              v.model as vehicle_model,
              v.license_plate as vehicle_plate,
              CONCAT(du.first_name, ' ', du.last_name) as driver_name,
              du.phone as driver_phone
       FROM bookings b
       JOIN users u ON b.customer_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN drivers d ON b.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    const booking = bookings[0];

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isAdmin = req.user.roles.includes('administrator') || req.user.roles.includes('dispatcher');
    if (!isAdmin && booking.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden access' });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/bookings/:id/dispatch
// @desc    Assign driver and vehicle to booking
router.put('/:id/dispatch', protect, restrictTo('administrator', 'dispatcher'), async (req, res, next) => {
  try {
    const { vehicle_id, driver_id, status, admin_notes } = req.body;

    const [bookings] = await db.query('SELECT status FROM bookings WHERE id = ?', [req.params.id]);
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    let updateFields = [];
    let params = [];

    if (vehicle_id !== undefined) {
      updateFields.push('vehicle_id = ?');
      params.push(vehicle_id);
    }
    if (driver_id !== undefined) {
      updateFields.push('driver_id = ?');
      params.push(driver_id);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      params.push(status);
    }
    if (admin_notes !== undefined) {
      updateFields.push('admin_notes = ?');
      params.push(admin_notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    params.push(req.params.id);

    await db.query(
      `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    if (status === 'allocated' || status === 'ongoing') {
      if (vehicle_id) {
        await db.query("UPDATE vehicles SET status = 'on_trip' WHERE id = ?", [vehicle_id]);
      }
      if (driver_id) {
        await db.query("UPDATE drivers SET availability_status = 'on_trip' WHERE id = ?", [driver_id]);
      }
    } else if (status === 'completed' || status === 'cancelled') {
      if (vehicle_id) {
        await db.query("UPDATE vehicles SET status = 'available' WHERE id = ?", [vehicle_id]);
      }
      if (driver_id) {
        await db.query("UPDATE drivers SET availability_status = 'available' WHERE id = ?", [driver_id]);
      }
    }

    res.json({
      success: true,
      message: 'Booking dispatch updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
