const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admin = require('../models/Admin');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');

// Get all admin users
router.get('/admins', adminAuth, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: 'Error fetching admin users' });
  }
});

// Create new admin user
router.post('/admins', adminAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin with this username already exists' });
    }

    // Create new admin
    const admin = new Admin({
      username,
      password
    });

    await admin.save();
    res.status(201).json({ success: true, message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, message: 'Error creating admin user' });
  }
});

// Update admin user
router.put('/admins/:id', adminAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    if (username) {
      const existingAdmin = await Admin.findOne({ username, _id: { $ne: req.params.id } });
      if (existingAdmin) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
      admin.username = username;
    }

    if (password) {
      admin.password = password;
    }

    await admin.save();
    res.json({ success: true, message: 'Admin user updated successfully' });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ success: false, message: 'Error updating admin user' });
  }
});

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

// Get all users (non-admin)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Update user
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (password) user.password = password;

    await user.save();
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
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
      price: Number(price),
      description,
      image: image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop',
      capacity,
      size,
      bed,
      amenities,
      available: available === true
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
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const updates = req.body;
    
    // Convert numeric fields
    if (updates.price) updates.price = Number(updates.price);
    if (updates.capacity) {
      updates.capacity.adults = Number(updates.capacity.adults);
      updates.capacity.children = Number(updates.capacity.children);
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      room[key] = updates[key];
    });

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
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // If booking is cancelled, make the room available again
    if (status === 'cancelled') {
      await Room.findByIdAndUpdate(booking.roomId, { available: true });
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
