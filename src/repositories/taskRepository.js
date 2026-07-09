class TaskRepository {
  constructor(db, organizationId) {
    this.db = db;
    this.orgId = organizationId;
  }

  async findAll() {
    const result = await this.db.query(
      'SELECT * FROM tasks WHERE organization_id = $1 ORDER BY created_at DESC',
      [this.orgId]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM tasks WHERE id = $1 AND organization_id = $2',
      [id, this.orgId]
    );
    return result.rows[0];
  }

  async create(taskData) {
    const { title, status, due_date, contact_id, deal_id, created_by } = taskData;
    const result = await this.db.query(
      `INSERT INTO tasks (organization_id, title, status, due_date, contact_id, deal_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [this.orgId, title, status, due_date, contact_id || null, deal_id || null, created_by]
    );
    return result.rows[0];
  }

  async update(id, taskData) {
    const { title, status, due_date, contact_id, deal_id } = taskData;
    const result = await this.db.query(
      `UPDATE tasks
       SET title = $1, status = $2, due_date = $3, contact_id = $4, deal_id = $5
       WHERE id = $6 AND organization_id = $7 RETURNING *`,
      [title, status, due_date, contact_id || null, deal_id || null, id, this.orgId]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM tasks WHERE id = $1 AND organization_id = $2 RETURNING *',
      [id, this.orgId]
    );
    return result.rows[0];
  }
}

module.exports = TaskRepository;
