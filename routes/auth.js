const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
require('dotenv').config();

const generateToken = (id, email, roles) => {
  return jwt.sign({ id, email, roles }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user (customer)
router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ? OR phone = ?', [email, phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email or phone number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, email, phone, password_hash]
    );

    const userId = result.insertId;

    const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', ['customer']);
    let roleId = roles[0]?.id;

    if (!roleId) {
      const [newRole] = await db.query('INSERT INTO roles (name, description) VALUES (?, ?)', ['customer', 'Customer role']);
      roleId = newRole.insertId;
    }

    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);

    const token = generateToken(userId, email, ['customer']);

    res.status(201).json({
      success: true,
      data: {
        id: userId,
        first_name,
        last_name,
        email,
        phone,
        roles: ['customer'],
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res, next) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email/phone and password' });
    }

    const [users] = await db.query(
      `SELECT u.*, GROUP_CONCAT(r.name) as roles 
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = ? OR u.phone = ?
       GROUP BY u.id`,
      [emailOrPhone, emailOrPhone]
    );

    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended' });
    }

    const rolesArr = user.roles ? user.roles.split(',') : [];
    const token = generateToken(user.id, user.email, rolesArr);

    res.json({
      success: true,
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        roles: rolesArr,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
router.get('/profile', protect, async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, first_name, last_name, email, phone, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = users[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        ...user,
        roles: req.user.roles
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
