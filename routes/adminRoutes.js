const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');



// Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    res.json({
      totalUsers,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get all rooms (including unavailable)
router.get('/rooms', adminAuth, async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching rooms' });
  }
});

// Add new room
router.post('/rooms', adminAuth, async (req, res) => {
  try {
    const { 
      name, 
      type, 
      price, 
      description,
      image,
      capacity,
      size,
      bed,
      amenities,
      available 
    } = req.body;

    const room = new Room({
      name,
      type,
      price,
      description,
      image,
      capacity,
      size,
      bed,
      amenities,
      available
    });

    await room.save();
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    console.error('Error adding room:', error);
    res.status(500).json({ success: false, message: 'Error adding room', error: error.message });
  }
});

// Update room
router.put('/rooms/:id', adminAuth, async (req, res) => {
  try {
    const { 
      name, 
      type, 
      price, 
      description,
      capacity,
      size,
      bed,
      amenities,
      available 
    } = req.body;

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Update image URL if provided
    if (req.body.image) {
      room.image = req.body.image;
    }

    // Update room details
    room.name = name || room.name;
    room.type = type || room.type;
    room.price = Number(price) || room.price;
    room.description = description || room.description;
    room.capacity = capacity ? {
      adults: Number(capacity.adults) || 2,
      children: Number(capacity.children) || 0
    } : room.capacity;
    room.size = size || room.size;
    room.bed = bed || room.bed;
    room.amenities = amenities || room.amenities;
    room.available = available !== undefined ? available : room.available;

    await room.save();
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: 'Error updating room', error: error.message });
  }
});

// Delete room
router.delete('/rooms/:id', adminAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Delete room image if exists
    if (room.image) {
      const imagePath = path.join(__dirname, '..', 'public', room.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await room.deleteOne();
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ success: false, message: 'Error deleting room', error: error.message });
  }
});

// Get all bookings
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching bookings' });
  }
});

// Update booking status
router.patch('/bookings/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Use findByIdAndUpdate instead of find + save to avoid validation issues
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true, runValidators: false }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // If booking is cancelled, make the room available again
    if (status === 'cancelled') {
      await Room.findByIdAndUpdate(booking.roomId, { isBooked: false });
    }

    res.json({ success: true, message: 'Booking status updated successfully' });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Error updating booking status' });
  }
});

// Serve uploaded files
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

module.exports = router;
