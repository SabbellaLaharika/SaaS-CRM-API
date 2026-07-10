const express = require('express');
const OrgService = require('../services/orgService');
const { requireAuthentication } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

const router = express.Router();
const orgService = new OrgService();

// POST /api/organizations/invites
router.post('/invites', requireAuthentication, requireRole(['owner', 'admin']), async (req, res, next) => {
  try {
    const result = await orgService.inviteUser(req.user, req.body);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
