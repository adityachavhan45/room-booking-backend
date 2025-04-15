const express = require('express');
const { bookRoom, getBookings, getMyBookings, cancelBooking } = require('../controllers/bookingController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/bookings', getBookings);

// Protected routes (require authentication)
router.post('/book-room', auth, bookRoom);
router.get('/my-bookings', auth, getMyBookings);
router.put('/:id/cancel', auth, cancelBooking);

module.exports = router;
