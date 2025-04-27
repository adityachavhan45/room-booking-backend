const User = require('../models/User');
const bcrypt = require('bcryptjs');

const sanitizeErrorMessage = (message) => {
  return message.replace(/[<>]/g, '');
};

// Get all admin users
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true }).select('-password');
    res.json({ success: true, data: admins }); // Return in a consistent format
  } catch (error) {
    console.error('Error in getAllAdmins:', error);
    res.status(500).json({ success: false, message: sanitizeErrorMessage('Server error') });
  }
};

// Add new admin user
const addAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: sanitizeErrorMessage('User already exists') });
    }
    user = new User({
      name,
      email,
      password,
      isAdmin: true
    });
    await user.save();
    res.status(201).json({ message: sanitizeErrorMessage('Admin user created successfully') });
  } catch (error) {
    res.status(500).json({ message: sanitizeErrorMessage('Server error') });
  }
};

// Update admin user
const updateAdmin = async (req, res) => {
  const { userId } = req.params;
  const { email, password } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: sanitizeErrorMessage('User not found') });
    }
    if (email) user.email = email;
    if (password) user.password = password;
    await user.save();
    res.json({ message: sanitizeErrorMessage('Admin user updated successfully') });
  } catch (error) {
    res.status(500).json({ message: sanitizeErrorMessage('Server error') });
  }
};

module.exports = { getAllAdmins, addAdmin, updateAdmin };
