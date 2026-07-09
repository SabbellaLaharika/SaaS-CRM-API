class DealRepository {
  constructor(db, organizationId) {
    this.db = db;
    this.orgId = organizationId;
  }

  async findAll() {
    const result = await this.db.query(
      'SELECT * FROM deals WHERE organization_id = $1 ORDER BY created_at DESC',
      [this.orgId]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM deals WHERE id = $1 AND organization_id = $2',
      [id, this.orgId]
    );
    return result.rows[0];
  }

  async create(dealData) {
    const { title, value, stage, contact_id, created_by } = dealData;
    const result = await this.db.query(
      'INSERT INTO deals (organization_id, title, value, stage, contact_id, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [this.orgId, title, value, stage, contact_id, created_by]
    );
    return result.rows[0];
  }

  async update(id, dealData) {
    const { title, value, stage, contact_id } = dealData;
    const result = await this.db.query(
      'UPDATE deals SET title = $1, value = $2, stage = $3, contact_id = $4 WHERE id = $5 AND organization_id = $6 RETURNING *',
      [title, value, stage, contact_id, id, this.orgId]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM deals WHERE id = $1 AND organization_id = $2 RETURNING *',
      [id, this.orgId]
    );
    return result.rows[0];
  }
}

module.exports = DealRepository;
