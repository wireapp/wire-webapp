import 'fake-indexeddb/auto';

import {describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {DexieDatabase as DexieDatabaseClass} from 'Repositories/storage/DexieDatabase';
import {AiStorageRepository} from '../storage/AiStorageRepository';

describe('AiStorageRepository', () => {
  let db;
  let repo;

  beforeEach(async () => {
    db = new DexieDatabaseClass(`wire-test-${Date.now()}`);
    await db.open();
    repo = new AiStorageRepository(db);
  });

  afterEach(async () => {
    await db.close();
    await db.delete();
  });

  describe('report CRUD', () => {
    it('createReport / getReport / listReports round-trip', async () => {
      const seed1 = {
        status: 'scanning',
        finished_at: null,
        target_conversation_ids: [],
        final_pass_started_at: null,
        final_pass_finished_at: null,
        snapshot: {
          model: 'test',
          context_size: 4096,
          safety_margin_pct: 0.2,
          per_message_token_cap: 500,
          job_description: '',
        },
        error: null,
      };

      const report1 = await repo.createReport(seed1);

      expect(report1.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(report1.created_at).toBeTruthy();
      expect(new Date(report1.created_at).getTime()).toBeGreaterThan(0);

      const fetched1 = await repo.getReport(report1.id);
      expect(fetched1).toEqual(report1);

      await new Promise(r => setTimeout(r, 1));

      const report2 = await repo.createReport(seed1);

      const all = await repo.listReports();
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe(report2.id);
      expect(all[1].id).toBe(report1.id);
    });

    it('getReport returns undefined for unknown id', async () => {
      const result = await repo.getReport('nonexistent-uuid');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteReport', () => {
    it('deleteReport is a no-op for nonexistent report', async () => {
      await expect(repo.deleteReport('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('markRunningReportsInterrupted', () => {
    it('returns empty array and does not log when no scanning reports exist', async () => {
      const ids = await repo.markRunningReportsInterrupted();
      expect(ids).toEqual([]);
    });
  });

  describe('conversation settings', () => {
    it('upsertConversationSettings round-trip', async () => {
      await repo.upsertConversationSettings({
        conversation_id: 'conv-abc',
        ai_enabled: true,
        ai_description: 'Test description',
      });

      const settings1 = await repo.getConversationSettings('conv-abc');
      expect(settings1.ai_enabled).toBe(true);
      expect(settings1.ai_description).toBe('Test description');
      expect(settings1.updated_at).toBeTruthy();
      expect(new Date(settings1.updated_at).getTime()).toBeGreaterThan(0);

      await repo.upsertConversationSettings({
        conversation_id: 'conv-abc',
        ai_enabled: false,
        ai_description: 'Updated',
      });

      const settings2 = await repo.getConversationSettings('conv-abc');
      expect(settings2.ai_enabled).toBe(false);
      expect(settings2.ai_description).toBe('Updated');
    });

    it('getConversationSettings returns undefined for unknown conversation', async () => {
      const result = await repo.getConversationSettings('no-such-conv');
      expect(result).toBeUndefined();
    });
  });
});
