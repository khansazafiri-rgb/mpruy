import fs from 'node:fs/promises';
import path from 'node:path';

export class StateStore {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'state.json');
    this.data = { telegramOffset: 0, announced: {}, approvals: {}, importPlans: {} };
  }

  async load() {
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8'));
      this.data = {
        telegramOffset: Number(parsed.telegramOffset || 0),
        announced: parsed.announced && typeof parsed.announced === 'object' ? parsed.announced : {},
        approvals: parsed.approvals && typeof parsed.approvals === 'object' ? parsed.approvals : {},
        importPlans: parsed.importPlans && typeof parsed.importPlans === 'object' ? parsed.importPlans : {},
      };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      await this.save();
    }
    return this.data;
  }

  async save() {
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    await fs.rename(tmp, this.file);
  }

  async setOffset(offset) {
    this.data.telegramOffset = Number(offset || 0);
    await this.save();
  }

  hasAnnounced(key) {
    return Boolean(this.data.announced[key]);
  }

  async markAnnounced(key) {
    this.data.announced[key] = new Date().toISOString();
    const entries = Object.entries(this.data.announced).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, 1000);
    this.data.announced = Object.fromEntries(entries);
    await this.save();
  }

  getApproval(id) {
    return this.data.approvals[id] || null;
  }

  async putApproval(id, value) {
    this.data.approvals[id] = { ...value, createdAt: new Date().toISOString() };
    await this.save();
  }

  async deleteApproval(id) {
    delete this.data.approvals[id];
    await this.save();
  }

  planKey(chatId, actorId) {
    return `${String(chatId)}:${String(actorId)}`;
  }

  getImportPlan(chatId, actorId) {
    return this.data.importPlans[this.planKey(chatId, actorId)] || null;
  }

  async putImportPlan(chatId, actorId, value) {
    const key = this.planKey(chatId, actorId);
    const previous = this.data.importPlans[key];
    const now = new Date().toISOString();
    this.data.importPlans[key] = {
      ...value,
      createdAt: previous?.createdAt || value.createdAt || now,
      updatedAt: now,
    };
    await this.save();
    return this.data.importPlans[key];
  }

  async deleteImportPlan(chatId, actorId) {
    delete this.data.importPlans[this.planKey(chatId, actorId)];
    await this.save();
  }
}
