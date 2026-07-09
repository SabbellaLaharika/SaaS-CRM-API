class ContactRepository {
  constructor(db, organizationId) {
    this.db = db;
    this.orgId = organizationId;
  }

  async findAll() {
    const result = await this.db.query(
      'SELECT * FROM contacts WHERE organization_id = $1 ORDER BY created_at DESC',
      [this.orgId]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM contacts WHERE id = $1 AND organization_id = $2',
      [id, this.orgId]
    );
    return result.rows[0];
  }

  async create(contactData) {
    const { name, email, phone, created_by } = contactData;
    const result = await this.db.query(
      'INSERT INTO contacts (organization_id, name, email, phone, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [this.orgId, name, email, phone, created_by]
    );
    return result.rows[0];
  }

  async update(id, contactData) {
    const { name, email, phone } = contactData;
    const result = await this.db.query(
      'UPDATE contacts SET name = $1, email = $2, phone = $3 WHERE id = $4 AND organization_id = $5 RETURNING *',
      [name, email, phone, id, this.orgId]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM contacts WHERE id = $1 AND organization_id = $2 RETURNING *',
      [id, this.orgId]
    );
    return result.rows[0];
  }
}

module.exports = ContactRepository;
