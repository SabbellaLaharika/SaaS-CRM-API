const express = require('express');
const CrmService = require('../services/crmService');
const { requireAuthentication } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

const router = express.Router();
const crmService = new CrmService();

// Apply authentication middleware to all routes in this controller
router.use(requireAuthentication);

// Helpers for writing endpoints authorization
const allowedWriters = requireRole(['owner', 'admin', 'member']);

// --- CONTACTS ROUTES ---

// GET /api/contacts
router.get('/contacts', async (req, res, next) => {
  try {
    const contacts = await crmService.listContacts(req.user);
    return res.status(200).json(contacts);
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/:id
router.get('/contacts/:id', async (req, res, next) => {
  try {
    const contact = await crmService.getContact(req.params.id, req.user);
    return res.status(200).json(contact);
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts
router.post('/contacts', allowedWriters, async (req, res, next) => {
  try {
    const newContact = await crmService.createContact(req.body, req.user);
    return res.status(201).json(newContact);
  } catch (err) {
    next(err);
  }
});

// PUT /api/contacts/:id
router.put('/contacts/:id', allowedWriters, async (req, res, next) => {
  try {
    const updatedContact = await crmService.updateContact(req.params.id, req.body, req.user);
    return res.status(200).json(updatedContact);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contacts/:id
router.delete('/contacts/:id', allowedWriters, async (req, res, next) => {
  try {
    const deletedContact = await crmService.deleteContact(req.params.id, req.user);
    return res.status(200).json(deletedContact);
  } catch (err) {
    next(err);
  }
});

// --- DEALS ROUTES ---

// GET /api/deals
router.get('/deals', async (req, res, next) => {
  try {
    const deals = await crmService.listDeals(req.user);
    return res.status(200).json(deals);
  } catch (err) {
    next(err);
  }
});

// GET /api/deals/:id
router.get('/deals/:id', async (req, res, next) => {
  try {
    const deal = await crmService.getDeal(req.params.id, req.user);
    return res.status(200).json(deal);
  } catch (err) {
    next(err);
  }
});

// POST /api/deals
router.post('/deals', allowedWriters, async (req, res, next) => {
  try {
    const newDeal = await crmService.createDeal(req.body, req.user);
    return res.status(201).json(newDeal);
  } catch (err) {
    next(err);
  }
});

// PUT /api/deals/:id
router.put('/deals/:id', allowedWriters, async (req, res, next) => {
  try {
    const updatedDeal = await crmService.updateDeal(req.params.id, req.body, req.user);
    return res.status(200).json(updatedDeal);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/deals/:id
router.delete('/deals/:id', allowedWriters, async (req, res, next) => {
  try {
    const deletedDeal = await crmService.deleteDeal(req.params.id, req.user);
    return res.status(200).json(deletedDeal);
  } catch (err) {
    next(err);
  }
});

// --- TASKS ROUTES ---

// GET /api/tasks
router.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await crmService.listTasks(req.user);
    return res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/tasks/:id', async (req, res, next) => {
  try {
    const task = await crmService.getTask(req.params.id, req.user);
    return res.status(200).json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
router.post('/tasks', allowedWriters, async (req, res, next) => {
  try {
    const newTask = await crmService.createTask(req.body, req.user);
    return res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', allowedWriters, async (req, res, next) => {
  try {
    const updatedTask = await crmService.updateTask(req.params.id, req.body, req.user);
    return res.status(200).json(updatedTask);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', allowedWriters, async (req, res, next) => {
  try {
    const deletedTask = await crmService.deleteTask(req.params.id, req.user);
    return res.status(200).json(deletedTask);
  } catch (err) {
    next(err);
  }
});

// --- DASHBOARD ROUTE ---

// GET /api/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = await crmService.getDashboardStats(req.user);
    return res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
