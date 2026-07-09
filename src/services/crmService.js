const { pool } = require('../models/db');
const ContactRepository = require('../repositories/contactRepository');
const DealRepository = require('../repositories/dealRepository');
const TaskRepository = require('../repositories/taskRepository');

class CrmService {
  // Helper to get repos scoped to organization
  getRepos(orgId) {
    return {
      contactRepo: new ContactRepository(pool, orgId),
      dealRepo: new DealRepository(pool, orgId),
      taskRepo: new TaskRepository(pool, orgId),
    };
  }

  // Generic authorization checker for update/delete
  checkMutationPermission(resource, user) {
    if (!resource) {
      const err = new Error('Resource not found');
      err.status = 404;
      throw err;
    }

    // Role-based mutations restrictions:
    // - owner and admin can mutate any resource in organization.
    // - member can only mutate resource they created.
    if (user.role === 'member' && resource.created_by !== user.id) {
      const err = new Error('Forbidden: Insufficient permissions to modify this resource');
      err.status = 403;
      throw err;
    }
  }

  // --- CONTACTS ---
  async listContacts(user) {
    const { contactRepo } = this.getRepos(user.organizationId);
    return await contactRepo.findAll();
  }

  async getContact(id, user) {
    const { contactRepo } = this.getRepos(user.organizationId);
    const contact = await contactRepo.findById(id);
    if (!contact) {
      const err = new Error('Contact not found');
      err.status = 404;
      throw err;
    }
    return contact;
  }

  async createContact(contactData, user) {
    const { contactRepo } = this.getRepos(user.organizationId);
    return await contactRepo.create({
      ...contactData,
      created_by: user.id,
    });
  }

  async updateContact(id, contactData, user) {
    const { contactRepo } = this.getRepos(user.organizationId);
    const contact = await contactRepo.findById(id);
    this.checkMutationPermission(contact, user);

    return await contactRepo.update(id, contactData);
  }

  async deleteContact(id, user) {
    const { contactRepo } = this.getRepos(user.organizationId);
    const contact = await contactRepo.findById(id);
    this.checkMutationPermission(contact, user);

    return await contactRepo.delete(id);
  }

  // --- DEALS ---
  async listDeals(user) {
    const { dealRepo } = this.getRepos(user.organizationId);
    return await dealRepo.findAll();
  }

  async getDeal(id, user) {
    const { dealRepo } = this.getRepos(user.organizationId);
    const deal = await dealRepo.findById(id);
    if (!deal) {
      const err = new Error('Deal not found');
      err.status = 404;
      throw err;
    }
    return deal;
  }

  async createDeal(dealData, user) {
    const { dealRepo, contactRepo } = this.getRepos(user.organizationId);

    // Validate that contact_id belongs to current tenant
    const contact = await contactRepo.findById(dealData.contact_id);
    if (!contact) {
      const err = new Error('Invalid contact_id: Contact not found in this organization');
      err.status = 400;
      throw err;
    }

    const validStages = ['lead', 'qualified', 'won', 'lost'];
    if (!validStages.includes(dealData.stage)) {
      const err = new Error('Invalid stage: Must be one of lead, qualified, won, lost');
      err.status = 400;
      throw err;
    }

    return await dealRepo.create({
      ...dealData,
      created_by: user.id,
    });
  }

  async updateDeal(id, dealData, user) {
    const { dealRepo, contactRepo } = this.getRepos(user.organizationId);
    const deal = await dealRepo.findById(id);
    this.checkMutationPermission(deal, user);

    // Validate that contact_id belongs to current tenant
    if (dealData.contact_id) {
      const contact = await contactRepo.findById(dealData.contact_id);
      if (!contact) {
        const err = new Error('Invalid contact_id: Contact not found in this organization');
        err.status = 400;
        throw err;
      }
    }

    if (dealData.stage) {
      const validStages = ['lead', 'qualified', 'won', 'lost'];
      if (!validStages.includes(dealData.stage)) {
        const err = new Error('Invalid stage: Must be one of lead, qualified, won, lost');
        err.status = 400;
        throw err;
      }
    }

    // Merge old and new data to perform update
    const updatedPayload = {
      title: dealData.title !== undefined ? dealData.title : deal.title,
      value: dealData.value !== undefined ? dealData.value : deal.value,
      stage: dealData.stage !== undefined ? dealData.stage : deal.stage,
      contact_id: dealData.contact_id !== undefined ? dealData.contact_id : deal.contact_id,
    };

    return await dealRepo.update(id, updatedPayload);
  }

  async deleteDeal(id, user) {
    const { dealRepo } = this.getRepos(user.organizationId);
    const deal = await dealRepo.findById(id);
    this.checkMutationPermission(deal, user);

    return await dealRepo.delete(id);
  }

  // --- TASKS ---
  async listTasks(user) {
    const { taskRepo } = this.getRepos(user.organizationId);
    return await taskRepo.findAll();
  }

  async getTask(id, user) {
    const { taskRepo } = this.getRepos(user.organizationId);
    const task = await taskRepo.findById(id);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      throw err;
    }
    return task;
  }

  async createTask(taskData, user) {
    const { taskRepo, contactRepo, dealRepo } = this.getRepos(user.organizationId);

    // Validate foreign keys if provided
    if (taskData.contact_id) {
      const contact = await contactRepo.findById(taskData.contact_id);
      if (!contact) {
        const err = new Error('Invalid contact_id: Contact not found in this organization');
        err.status = 400;
        throw err;
      }
    }

    if (taskData.deal_id) {
      const deal = await dealRepo.findById(taskData.deal_id);
      if (!deal) {
        const err = new Error('Invalid deal_id: Deal not found in this organization');
        err.status = 400;
        throw err;
      }
    }

    const validStatuses = ['pending', 'completed'];
    if (!validStatuses.includes(taskData.status)) {
      const err = new Error('Invalid status: Must be pending or completed');
      err.status = 400;
      throw err;
    }

    return await taskRepo.create({
      ...taskData,
      created_by: user.id,
    });
  }

  async updateTask(id, taskData, user) {
    const { taskRepo, contactRepo, dealRepo } = this.getRepos(user.organizationId);
    const task = await taskRepo.findById(id);
    this.checkMutationPermission(task, user);

    // Validate foreign keys if provided
    if (taskData.contact_id) {
      const contact = await contactRepo.findById(taskData.contact_id);
      if (!contact) {
        const err = new Error('Invalid contact_id: Contact not found in this organization');
        err.status = 400;
        throw err;
      }
    }

    if (taskData.deal_id) {
      const deal = await dealRepo.findById(taskData.deal_id);
      if (!deal) {
        const err = new Error('Invalid deal_id: Deal not found in this organization');
        err.status = 400;
        throw err;
      }
    }

    if (taskData.status) {
      const validStatuses = ['pending', 'completed'];
      if (!validStatuses.includes(taskData.status)) {
        const err = new Error('Invalid status: Must be pending or completed');
        err.status = 400;
        throw err;
      }
    }

    const updatedPayload = {
      title: taskData.title !== undefined ? taskData.title : task.title,
      status: taskData.status !== undefined ? taskData.status : task.status,
      due_date: taskData.due_date !== undefined ? taskData.due_date : task.due_date,
      contact_id: taskData.contact_id !== undefined ? taskData.contact_id : task.contact_id,
      deal_id: taskData.deal_id !== undefined ? taskData.deal_id : task.deal_id,
    };

    return await taskRepo.update(id, updatedPayload);
  }

  async deleteTask(id, user) {
    const { taskRepo } = this.getRepos(user.organizationId);
    const task = await taskRepo.findById(id);
    this.checkMutationPermission(task, user);

    return await taskRepo.delete(id);
  }

  // --- DASHBOARD ---
  async getDashboardStats(user) {
    const orgId = user.organizationId;

    const contactsCountRes = await pool.query(
      'SELECT COUNT(*)::int AS total FROM contacts WHERE organization_id = $1',
      [orgId]
    );
    const totalContacts = contactsCountRes.rows[0]?.total || 0;

    const dealsValRes = await pool.query(
      'SELECT COALESCE(SUM(value), 0.00)::float AS total FROM deals WHERE organization_id = $1',
      [orgId]
    );
    const totalDealsValue = dealsValRes.rows[0]?.total || 0.00;

    const dealsStageRes = await pool.query(
      'SELECT stage, COUNT(*)::int AS count FROM deals WHERE organization_id = $1 GROUP BY stage',
      [orgId]
    );

    const dealsByStage = {
      lead: 0,
      qualified: 0,
      won: 0,
      lost: 0,
    };

    if (dealsStageRes.rows) {
      dealsStageRes.rows.forEach((row) => {
        if (dealsByStage[row.stage] !== undefined) {
          dealsByStage[row.stage] = row.count;
        }
      });
    }

    const tasksPendingRes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM tasks WHERE organization_id = $1 AND status = 'pending'",
      [orgId]
    );
    const pendingTasks = tasksPendingRes.rows[0]?.total || 0;

    return {
      total_contacts: totalContacts,
      total_deals_value: totalDealsValue,
      deals_by_stage: dealsByStage,
      pending_tasks: pendingTasks,
    };
  }
}

module.exports = CrmService;
