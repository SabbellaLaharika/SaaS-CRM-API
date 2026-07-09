class OrgRepository {
  constructor(db) {
    this.db = db;
  }

  async create(name, client = null) {
    const dbClient = client || this.db;
    const result = await dbClient.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING *',
      [name]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = OrgRepository;
