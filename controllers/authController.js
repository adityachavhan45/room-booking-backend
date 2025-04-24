const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');  // 

const sanitizeErrorMessage = (message) => {
  return message.replace(/[<>]/g, ''); // Remove < and > characters
};

const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: sanitizeErrorMessage('User already exists') });
    }
    user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: sanitizeErrorMessage('User registered successfully') });
  } catch (error) {
    res.status(500).json({ message: sanitizeErrorMessage('Server error') });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: sanitizeErrorMessage('Invalid credentials') });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: sanitizeErrorMessage('Invalid credentials') });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '20d' });
    res.json({ token, name: sanitizeErrorMessage(user.name) });
  } catch (error) {
    res.status(500).json({ message: sanitizeErrorMessage('Server error') });
  }
};

module.exports = { register, login };
