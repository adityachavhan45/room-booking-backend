const express = require('express');
const { bookRoom, getBookings, getMyBookings, cancelBooking, updateBookingStatus } = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Admin routes
router.get('/admin/all', adminAuth, getBookings);
router.put('/:id/status', adminAuth, updateBookingStatus);

// Protected routes (require authentication)
router.post('/', auth, bookRoom);
router.get('/my-bookings', auth, getMyBookings);
router.put('/:id/cancel', auth, cancelBooking);

module.exports = router;
