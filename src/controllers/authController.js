const express = require('express');
const AuthService = require('../services/authService');
const { requireAuthentication } = require('../middlewares/auth');

const router = express.Router();
const authService = new AuthService();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuthentication, async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    return res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
