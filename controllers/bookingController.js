const Booking = require('../models/Booking');
const Room = require('../models/Room');

// @desc    Create a new booking
// @route   POST /api/bookings/book-room
// @access  Private
const bookRoom = async (req, res) => {
    try {
        const { roomId, roomName, checkIn, checkOut, adults, children, totalAmount } = req.body;

        if (!roomId || !roomName || !checkIn || !checkOut || !adults || !totalAmount) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Get user info from auth middleware
        const userId = req.user._id;
        const userName = req.user.name;

        const newBooking = new Booking({
            userId,
            userName,
            roomId,
            roomName,
            checkIn,
            checkOut,
            adults,
            children,
            totalAmount
        });

        await newBooking.save();

        // Update room availability if needed
        await Room.findByIdAndUpdate(roomId, { isBooked: true });

        res.status(201).json({ success: true, message: 'Booking successful!', booking: newBooking });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get all bookings (for admin)
// @route   GET /api/bookings
// @access  Public
const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get user's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Check if the booking belongs to the user
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        booking.status = 'cancelled';
        await booking.save();

        // Update room availability
        await Room.findByIdAndUpdate(booking.roomId, { isBooked: false });

        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = { bookRoom, getBookings, getMyBookings, cancelBooking };
