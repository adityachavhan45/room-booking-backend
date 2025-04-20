const express = require('express');
const { getUserProfile } = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

// Protected route - requires authentication
router.get('/profile', auth, (req, res) => {
  // The auth middleware adds the user to the request
  // We can simply return the user data without the password
  const { _id, name, email } = req.user;
  res.json({ _id, name, email });
});

module.exports = router;
