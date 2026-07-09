const bcrypt = require('bcryptjs');
const { pool } = require('../models/db');
const UserRepository = require('../repositories/userRepository');

class OrgService {
  constructor() {
    this.userRepo = new UserRepository(pool);
  }

  async inviteUser(tenantInfo, inviteData) {
    const { email, role } = inviteData;
    const { organizationId } = tenantInfo;

    if (!email || !role) {
      const err = new Error('Email and role are required');
      err.status = 400;
      throw err;
    }

    const allowedRoles = ['admin', 'member', 'viewer'];
    if (!allowedRoles.includes(role)) {
      const err = new Error('Invalid role specified for invite');
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

    // Stub password for invitation state
    const stubbedPassword = Math.random().toString(36).substring(2, 15);
    const passwordHash = await bcrypt.hash(stubbedPassword, 10);

    const newUser = await this.userRepo.create({
      organization_id: organizationId,
      email,
      password_hash: passwordHash,
      role,
    });

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      organization_id: newUser.organization_id,
      created_at: newUser.created_at,
    };
  }
}

module.exports = OrgService;
