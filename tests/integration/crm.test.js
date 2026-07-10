const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { pool, initDatabase } = require('../../src/models/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

describe('CRM Security and Functional Tests', () => {
  let tokens = {};
  let ids = {};

  // Helper to generate token
  function generateToken(userId, orgId, role) {
    return jwt.sign({ userId, organizationId: orgId, role }, JWT_SECRET, { expiresIn: '1h' });
  }

  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    // Clear database
    await pool.query('TRUNCATE TABLE organizations, users, contacts, deals, tasks CASCADE');

    // Create Organization A & B
    const orgARes = await pool.query("INSERT INTO organizations (name) VALUES ('Org A') RETURNING id");
    const orgBRes = await pool.query("INSERT INTO organizations (name) VALUES ('Org B') RETURNING id");

    ids.orgA = orgARes.rows[0].id;
    ids.orgB = orgBRes.rows[0].id;

    // Create Users for Org A
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const ownerARes = await pool.query(
      "INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, 'ownerA@org.com', $2, 'owner') RETURNING id",
      [ids.orgA, passwordHash]
    );
    const adminARes = await pool.query(
      "INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, 'adminA@org.com', $2, 'admin') RETURNING id",
      [ids.orgA, passwordHash]
    );
    const memberARes = await pool.query(
      "INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, 'memberA@org.com', $2, 'member') RETURNING id",
      [ids.orgA, passwordHash]
    );
    const viewerARes = await pool.query(
      "INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, 'viewerA@org.com', $2, 'viewer') RETURNING id",
      [ids.orgA, passwordHash]
    );

    ids.ownerA = ownerARes.rows[0].id;
    ids.adminA = adminARes.rows[0].id;
    ids.memberA = memberARes.rows[0].id;
    ids.viewerA = viewerARes.rows[0].id;

    // Generate tokens for Org A
    tokens.ownerA = generateToken(ids.ownerA, ids.orgA, 'owner');
    tokens.adminA = generateToken(ids.adminA, ids.orgA, 'admin');
    tokens.memberA = generateToken(ids.memberA, ids.orgA, 'member');
    tokens.viewerA = generateToken(ids.viewerA, ids.orgA, 'viewer');

    // Create Users for Org B
    const ownerBRes = await pool.query(
      "INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, 'ownerB@org.com', $2, 'owner') RETURNING id",
      [ids.orgB, passwordHash]
    );
    const memberBRes = await pool.query(
      "INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, 'memberB@org.com', $2, 'member') RETURNING id",
      [ids.orgB, passwordHash]
    );
    ids.ownerB = ownerBRes.rows[0].id;
    ids.memberB = memberBRes.rows[0].id;
    tokens.ownerB = generateToken(ids.ownerB, ids.orgB, 'owner');
    tokens.memberB = generateToken(ids.memberB, ids.orgB, 'member');

    // Seed Contact in Org A (created by Admin A)
    const contactARes = await pool.query(
      "INSERT INTO contacts (organization_id, name, email, phone, created_by) VALUES ($1, 'Contact A', 'contactA@gmail.com', '123456', $2) RETURNING id",
      [ids.orgA, ids.adminA]
    );
    ids.contactA = contactARes.rows[0].id;

    // Seed Contact in Org B (created by Owner B)
    const contactBRes = await pool.query(
      "INSERT INTO contacts (organization_id, name, email, phone, created_by) VALUES ($1, 'Contact B', 'contactB@gmail.com', '654321', $2) RETURNING id",
      [ids.orgB, ids.ownerB]
    );
    ids.contactB = contactBRes.rows[0].id;

    // Seed Deal in Org A (created by Owner A)
    const dealARes = await pool.query(
      "INSERT INTO deals (organization_id, title, value, stage, contact_id, created_by) VALUES ($1, 'Deal A', 50000.00, 'lead', $2, $3) RETURNING id",
      [ids.orgA, ids.contactA, ids.ownerA]
    );
    ids.dealA = dealARes.rows[0].id;

    // Seed Deal in Org B (created by Owner B)
    const dealBRes = await pool.query(
      "INSERT INTO deals (organization_id, title, value, stage, contact_id, created_by) VALUES ($1, 'Deal B', 80000.00, 'qualified', $2, $3) RETURNING id",
      [ids.orgB, ids.contactB, ids.ownerB]
    );
    ids.dealB = dealBRes.rows[0].id;

    // Seed Task in Org A (created by Owner A)
    const taskARes = await pool.query(
      "INSERT INTO tasks (organization_id, title, status, due_date, contact_id, deal_id, created_by) VALUES ($1, 'Task A', 'pending', $2, $3, $4, $5) RETURNING id",
      [ids.orgA, new Date(), ids.contactA, ids.dealA, ids.ownerA]
    );
    ids.taskA = taskARes.rows[0].id;
  });

  afterAll(async () => {
    await pool.end();
  });

  // --- CROSS-TENANT DATA ACCESS TESTS ---

  test('GET /api/contacts/:id - Attempting to get Org B contact as User A should return 404', async () => {
    await request(app)
      .get(`/api/contacts/${ids.contactB}`)
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .expect(404);
  });

  test('PUT /api/contacts/:id - Attempting to edit Org B contact as User A should return 404', async () => {
    await request(app)
      .put(`/api/contacts/${ids.contactB}`)
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .send({ name: 'Hacked Contact' })
      .expect(404);
  });

  test('DELETE /api/contacts/:id - Attempting to delete Org B contact as User A should return 404', async () => {
    await request(app)
      .delete(`/api/contacts/${ids.contactB}`)
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .expect(404);
  });

  test('GET /api/deals/:id - Attempting to get Org B deal as User A should return 404', async () => {
    await request(app)
      .get(`/api/deals/${ids.dealB}`)
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .expect(404);
  });

  // --- FOREIGN KEY HIJACKING TESTS ---

  test('POST /api/deals - Attempting to link a deal to Org B contact as User A should reject with 400', async () => {
    await request(app)
      .post('/api/deals')
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .send({
        title: 'Hijack Deal',
        value: 1000,
        stage: 'lead',
        contact_id: ids.contactB,
      })
      .expect(400);
  });

  test('POST /api/tasks - Attempting to link a task to Org B contact/deal as User A should reject with 400', async () => {
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .send({
        title: 'Hijack Task',
        status: 'pending',
        due_date: new Date().toISOString(),
        contact_id: ids.contactB,
      })
      .expect(400);
  });

  // --- RBAC BOUNDARY TESTS ---

  test('Viewer Role - Attempting POST/PUT/DELETE should return 403 Forbidden', async () => {
    // POST Contact
    await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${tokens.viewerA}`)
      .send({ name: 'Test Contact', email: 'v@gmail.com', phone: '123' })
      .expect(403);

    // PUT Contact
    await request(app)
      .put(`/api/contacts/${ids.contactA}`)
      .set('Authorization', `Bearer ${tokens.viewerA}`)
      .send({ name: 'Changed Name' })
      .expect(403);

    // DELETE Contact
    await request(app)
      .delete(`/api/contacts/${ids.contactA}`)
      .set('Authorization', `Bearer ${tokens.viewerA}`)
      .expect(403);

    // Invite User
    await request(app)
      .post('/api/organizations/invites')
      .set('Authorization', `Bearer ${tokens.viewerA}`)
      .send({ email: 'new_viewer@org.com', role: 'member' })
      .expect(403);
  });

  test('Member Role - Cannot invite users (403)', async () => {
    await request(app)
      .post('/api/organizations/invites')
      .set('Authorization', `Bearer ${tokens.memberA}`)
      .send({ email: 'new_member@org.com', role: 'member' })
      .expect(403);
  });

  test('Member Role - Can create a contact, and then edit/delete it', async () => {
    // Create Contact
    const createRes = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${tokens.memberA}`)
      .send({ name: 'Member Contact', email: 'mem@gmail.com', phone: '333' })
      .expect(201);

    const newContactId = createRes.body.id;

    // Update Contact (owned by member)
    await request(app)
      .put(`/api/contacts/${newContactId}`)
      .set('Authorization', `Bearer ${tokens.memberA}`)
      .send({ name: 'Member Contact Updated' })
      .expect(200);

    // Delete Contact (owned by member)
    await request(app)
      .delete(`/api/contacts/${newContactId}`)
      .set('Authorization', `Bearer ${tokens.memberA}`)
      .expect(200);
  });

  test('Member Role - Cannot update/delete contact created by another user (403)', async () => {
    // Contact A was created by Admin A. Member A tries to update.
    await request(app)
      .put(`/api/contacts/${ids.contactA}`)
      .set('Authorization', `Bearer ${tokens.memberA}`)
      .send({ name: 'Hacked Name' })
      .expect(403);

    // Member A tries to delete.
    await request(app)
      .delete(`/api/contacts/${ids.contactA}`)
      .set('Authorization', `Bearer ${tokens.memberA}`)
      .expect(403);
  });

  test('Admin Role - Can update/delete resources regardless of creator', async () => {
    // Contact A was created by Admin A.
    // Create a contact by Member A first
    const createRes = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${tokens.memberA}`)
      .send({ name: 'Mem Contact', email: 'm@gmail.com' })
      .expect(201);

    const memContactId = createRes.body.id;

    // Admin A updates member's contact
    await request(app)
      .put(`/api/contacts/${memContactId}`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .send({ name: 'Admin Overwrote Name' })
      .expect(200);

    // Admin A deletes member's contact
    await request(app)
      .delete(`/api/contacts/${memContactId}`)
      .set('Authorization', `Bearer ${tokens.adminA}`)
      .expect(200);
  });

  test('Owner Role - Can invite users and has full CRUD', async () => {
    // Invite User
    await request(app)
      .post('/api/organizations/invites')
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .send({ email: 'new_invite@org.com', role: 'viewer' })
      .expect(201);

    // Owner can delete task created by Owner A (their own)
    await request(app)
      .delete(`/api/tasks/${ids.taskA}`)
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .expect(200);
  });

  // --- DASHBOARD STATISTICS SCOPING TEST ---

  test('GET /api/dashboard - Returns aggregate statistics filtered by tenant organization_id', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokens.ownerA}`)
      .expect(200);

    expect(res.body.total_contacts).toBe(1); // Only Contact A
    expect(res.body.total_deals_value).toBe(50000.00); // Deal A value
    expect(res.body.deals_by_stage).toEqual({
      lead: 1,
      qualified: 0,
      won: 0,
      lost: 0,
    });
    expect(res.body.pending_tasks).toBe(1); // Task A
  });
});
