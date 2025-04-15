const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Get all available rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find({ available: true });
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching rooms' });
  }
});

// Get room by ID
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching room' });
  }
});

module.exports = router;
