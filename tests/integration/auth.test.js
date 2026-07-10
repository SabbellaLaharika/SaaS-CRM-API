const request = require('supertest');
const app = require('../../src/app');
const { pool, initDatabase } = require('../../src/models/db');

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Initialize schema and make sure database is ready
    await initDatabase();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await pool.query('TRUNCATE TABLE organizations, users, contacts, deals, tasks CASCADE');
  });

  afterAll(async () => {
    // Close the pool
    await pool.end();
  });

  test('POST /api/auth/register - Should register organization and owner user in a transaction', async () => {
    const payload = {
      email: 'owner@example.com',
      password: 'secure_password',
      organization_name: 'Acme Corp',
      user_name: 'Jane Doe',
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(payload.email);
    expect(res.body.user.role).toBe('owner');
    expect(res.body.user.organizationId).toBeDefined();

    // Verify in DB that organization and user are created
    const orgs = await pool.query('SELECT * FROM organizations WHERE id = $1', [res.body.user.organizationId]);
    expect(orgs.rows.length).toBe(1);
    expect(orgs.rows[0].name).toBe(payload.organization_name);

    const users = await pool.query('SELECT * FROM users WHERE id = $1', [res.body.user.id]);
    expect(users.rows.length).toBe(1);
    expect(users.rows[0].role).toBe('owner');
  });

  test('POST /api/auth/register - Should fail if email already exists', async () => {
    const payload = {
      email: 'owner@example.com',
      password: 'secure_password',
      organization_name: 'Acme Corp',
      user_name: 'Jane Doe',
    };

    await request(app).post('/api/auth/register').send(payload).expect(201);
    
    // Duplicate email
    const res = await request(app)
      .post('/api/auth/register')
      .send(payload)
      .expect(409);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('already exists');
  });

  test('POST /api/auth/login - Should authenticate existing user and issue a JWT', async () => {
    const registerPayload = {
      email: 'owner@example.com',
      password: 'secure_password',
      organization_name: 'Acme Corp',
      user_name: 'Jane Doe',
    };

    await request(app).post('/api/auth/register').send(registerPayload).expect(201);

    const loginPayload = {
      email: 'owner@example.com',
      password: 'secure_password',
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send(loginPayload)
      .expect(200);

    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/auth/login - Should fail with invalid credentials', async () => {
    const loginPayload = {
      email: 'owner@example.com',
      password: 'wrong_password',
    };

    const res = await request(app)
      .post('/api/auth/login')
      .send(loginPayload)
      .expect(401);

    expect(res.body).toHaveProperty('error');
  });

  test('GET /api/auth/me - Should return the profile and organization details of the authenticated user', async () => {
    const registerPayload = {
      email: 'owner@example.com',
      password: 'secure_password',
      organization_name: 'Acme Corp',
      user_name: 'Jane Doe',
    };

    const regRes = await request(app).post('/api/auth/register').send(registerPayload).expect(201);
    const token = regRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(regRes.body.user.id);
    expect(res.body.email).toBe(regRes.body.user.email);
    expect(res.body.role).toBe('owner');
    expect(res.body.organization.id).toBe(regRes.body.user.organizationId);
    expect(res.body.organization.name).toBe(registerPayload.organization_name);
  });
});
