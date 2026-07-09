class UserRepository {
  constructor(db, organizationId = null) {
    this.db = db;
    this.orgId = organizationId;
  }

  async create(userData, client = null) {
    const dbClient = client || this.db;
    const { organization_id, email, password_hash, role } = userData;
    const result = await dbClient.query(
      'INSERT INTO users (organization_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [organization_id, email, password_hash, role]
    );
    return result.rows[0];
  }

  async findByEmail(email) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async findProfileById(id) {
    const result = await this.db.query(
      `SELECT u.id, u.email, u.role, u.organization_id, o.name AS organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = UserRepository;
