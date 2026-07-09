const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../models/db');
const OrgRepository = require('../repositories/orgRepository');
const UserRepository = require('../repositories/userRepository');
require('dotenv').config();

class AuthService {
  constructor() {
    this.orgRepo = new OrgRepository(pool);
    this.userRepo = new UserRepository(pool);
  }

  async register(data) {
    const { email, password, organization_name, user_name } = data;
    if (!email || !password || !organization_name || !user_name) {
      const err = new Error('All fields (email, password, organization_name, user_name) are required');
      err.status = 400;
      throw err;
    }

    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      const err = new Error('User with this email already exists');
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create Organization
      const org = await this.orgRepo.create(organization_name, client);

      // Create User with role owner
      const user = await this.userRepo.create(
        {
          organization_id: org.id,
          email,
          password_hash: passwordHash,
          role: 'owner',
        },
        client
      );

      await client.query('COMMIT');

      // Generate JWT token
      const payload = {
        userId: user.id,
        organizationId: org.id,
        role: user.role,
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your_jwt_secret_key_here',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return { token, user: { id: user.id, email: user.email, role: user.role, organizationId: org.id } };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(data) {
    const { email, password } = data;
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      throw err;
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const payload = {
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return { token };
  }

  async getProfile(userId) {
    const profile = await this.userRepo.findProfileById(userId);
    if (!profile) {
      const err = new Error('User profile not found');
      err.status = 404;
      throw err;
    }
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      organization: {
        id: profile.organization_id,
        name: profile.organization_name,
      },
    };
  }
}

module.exports = AuthService;
