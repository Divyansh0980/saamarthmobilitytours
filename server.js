const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const vehicleRoutes = require('./routes/vehicles');
const enquiryRoutes = require('./routes/enquiries');
const { errorHandler } = require('./middleware/errorMiddleware');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from root
app.use(express.static(__dirname));

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/enquiries', enquiryRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, message: 'Server is healthy and connected to MySQL database.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server is running, but database connection failed.', error: error.message });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
