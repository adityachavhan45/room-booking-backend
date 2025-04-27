require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function createDefaultAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('Default admin already exists');
      process.exit(0);
    }

    // Create default admin
    const admin = new Admin({
      username: 'admin',
      password: 'admin123'
    });

    await admin.save();
    console.log('Default admin created successfully');
  } catch (error) {
    console.error('Error creating default admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createDefaultAdmin();
