const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const adminAuth = require('../middleware/adminAuth');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create initial admin (only for first time setup)
router.post('/setup', async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await Admin.findOne();
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Create new admin
    const admin = new Admin({
      username: 'admin',  // Default username
      password: 'admin123'  // Default password
    });

    await admin.save();
    res.status(201).json({ message: 'Admin account created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify admin token
router.get('/verify', adminAuth, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        username: req.admin.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all admin users
router.get('/all', adminAuth, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin users' });
  }
});

// Register new admin user
router.post('/register', adminAuth, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if admin already exists
    const adminExists = await Admin.findOne({ username });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin with this username already exists' });
    }

    // Create new admin
    const admin = new Admin({
      username,
      password
    });

    await admin.save();
    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

// Update admin user
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (username) {
      const existingAdmin = await Admin.findOne({ username, _id: { $ne: req.params.id } });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      admin.username = username;
    }

    if (password) {
      admin.password = password;
    }

    await admin.save();
    res.json({ message: 'Admin user updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating admin user' });
  }
});

module.exports = router;
