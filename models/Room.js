const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  image: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop' 
  },
  capacity: {
    adults: { type: Number, default: 2 },
    children: { type: Number, default: 0 }
  },
  size: { type: String, default: '20 m²' },
  bed: { type: String, default: 'Single Bed' },
  amenities: [{ type: String }],
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
