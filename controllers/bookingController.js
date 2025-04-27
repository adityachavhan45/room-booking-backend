const Booking = require('../models/Booking');
const Room = require('../models/Room');

// @desc    Create a new booking
// @route   POST /api/bookings/book-room
// @access  Private
const bookRoom = async (req, res) => {
    try {
        const { roomId, roomName, checkIn, checkOut, adults, children, totalAmount, paymentMethod } = req.body;

        if (!roomId || !roomName || !checkIn || !checkOut || !adults || !totalAmount || !paymentMethod) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        // Validate payment method
        if (paymentMethod !== 'cash' && paymentMethod !== 'online') {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }

        // Get user info from auth middleware
        const userId = req.user._id;
        const userName = req.user.name;

        // Set initial status based on payment method
        const status = paymentMethod === 'cash' ? 'pending' : 'confirmed';

        const newBooking = new Booking({
            userId,
            userName,
            roomId,
            roomName,
            checkIn,
            checkOut,
            adults,
            children,
            totalAmount,
            paymentMethod,
            status
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
// @route   GET /api/bookings/admin/all
// @access  Admin only
const getBookings = async (req, res) => {
    try {
        // Get all bookings and populate user details
        const bookings = await Booking.find()
            .populate({
                path: 'userId',
                select: 'name email'
            })
            .sort({ createdAt: -1 });

        // Transform bookings to include userName directly
        const formattedBookings = bookings.map(booking => {
            const bookingObj = booking.toObject();
            return {
                ...bookingObj,
                userName: bookingObj.userId ? bookingObj.userId.name : 'Guest',
                userEmail: bookingObj.userId ? bookingObj.userId.email : ''
            };
        });

        res.json({ 
            success: true, 
            count: formattedBookings.length,
            data: formattedBookings 
        });
    } catch (error) {
        console.error('Error in getBookings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error', 
            error: error.message 
        });
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

// @desc    Update booking status (admin only)
// @route   PUT /api/bookings/:id/status
// @access  Admin only
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status || !['confirmed', 'rejected', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // For cash payments in pending state
        if (booking.paymentMethod === 'cash' && booking.status === 'pending') {
            if (!['confirmed', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Pending cash bookings can only be confirmed or rejected' });
            }
        }

        booking.status = status;
        await booking.save();

        // Make room available if booking is rejected, cancelled, or completed
        if (['rejected', 'cancelled', 'completed'].includes(status)) {
            await Room.findByIdAndUpdate(booking.roomId, { isBooked: false });
        }

        res.json({ success: true, message: `Booking ${status} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

module.exports = { bookRoom, getBookings, getMyBookings, cancelBooking, updateBookingStatus };
