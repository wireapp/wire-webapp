/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import 'fake-indexeddb/auto';

import {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {AiStorageRepository} from '../storage/AiStorageRepository';

// Helper to create a fresh DB + repo with a unique name so tests don't contaminate each other
const makeRepo = (): {db: DexieDatabase; repo: AiStorageRepository} => {
  const db = new DexieDatabase(`test-${Date.now()}-${Math.random()}`);
  const repo = new AiStorageRepository(db);
  return {db, repo};
};

// Minimal seed for creating a report (omits id and created_at which the repo generates)
const makeReportSeed = () => ({
  finished_at: null as string | null,
  status: 'scanning' as const,
  target_conversation_ids: ['conv-1', 'conv-2'],
  final_pass_started_at: null as string | null,
  final_pass_finished_at: null as string | null,
  snapshot: {
    model: 'qwen3:14b',
    context_size: 8192,
    safety_margin_pct: 0.2,
    per_message_token_cap: 500,
    job_description: 'Summarise meetings',
  },
  error: null as string | null,
});

describe('AiStorageRepository', () => {
  describe('createReport', () => {
    it('creates a record with an auto-generated id and created_at', async () => {
      const {repo} = makeRepo();
      const record = await repo.createReport(makeReportSeed());

      expect(record.id).toBeTruthy();
      expect(typeof record.id).toBe('string');
      expect(record.created_at).toBeTruthy();
      expect(record.status).toBe('scanning');
    });
  });

  describe('listReports', () => {
    it('returns reports sorted by created_at descending', async () => {
      const {repo} = makeRepo();

      // Create two reports in sequence — the second will have a later timestamp
      const first = await repo.createReport(makeReportSeed());
      // Small delay to guarantee different created_at values
      await new Promise(resolve => setTimeout(resolve, 5));
      const second = await repo.createReport(makeReportSeed());

      const list = await repo.listReports();

      expect(list).toHaveLength(2);
      // Most recently created should come first
      expect(list[0].id).toBe(second.id);
      expect(list[1].id).toBe(first.id);
    });
  });

  describe('updateReport', () => {
    it('patches the status field of an existing report', async () => {
      const {repo} = makeRepo();
      const record = await repo.createReport(makeReportSeed());

      await repo.updateReport(record.id, {status: 'interrupted'});

      const updated = await repo.getReport(record.id);
      expect(updated?.status).toBe('interrupted');
    });
  });

  describe('deleteReport', () => {
    it('removes the report and cascade-deletes its sub-reports and final entries', async () => {
      const {repo} = makeRepo();
      const report = await repo.createReport(makeReportSeed());

      // Create a sub-report belonging to this report
      await repo.createSubReport({
        id: 'sub-1',
        report_id: report.id,
        conversation_id: 'conv-1',
        conversation_domain: null,
        conversation_name_snapshot: 'Test conv',
        ai_description_snapshot: '',
        status: 'pending',
        error: null,
        entries: [],
        stats: {
          raw_token_estimate: 0,
          truncated_token_estimate: 0,
          message_count_before_truncation: 0,
          message_count_after_truncation: 0,
          started_at: null,
          finished_at: null,
        },
        created_at: new Date().toISOString(),
      });

      await repo.deleteReport(report.id);

      const deletedReport = await repo.getReport(report.id);
      const remainingSubs = await repo.listSubReports(report.id);

      expect(deletedReport).toBeUndefined();
      expect(remainingSubs).toHaveLength(0);
    });
  });

  describe('markRunningReportsInterrupted', () => {
    it('changes status from scanning to interrupted and returns affected ids', async () => {
      const {repo} = makeRepo();

      const scanning1 = await repo.createReport(makeReportSeed());
      const scanning2 = await repo.createReport(makeReportSeed());
      // Create a finished report that should NOT be affected
      const finished = await repo.createReport({...makeReportSeed(), status: 'finished'});

      const affectedIds = await repo.markRunningReportsInterrupted();

      expect(affectedIds).toContain(scanning1.id);
      expect(affectedIds).toContain(scanning2.id);
      expect(affectedIds).not.toContain(finished.id);

      const r1 = await repo.getReport(scanning1.id);
      const r2 = await repo.getReport(scanning2.id);
      const rf = await repo.getReport(finished.id);

      expect(r1?.status).toBe('interrupted');
      expect(r2?.status).toBe('interrupted');
      // The finished report should remain unchanged
      expect(rf?.status).toBe('finished');
    });

    it('returns an empty array when no reports are scanning', async () => {
      const {repo} = makeRepo();
      const ids = await repo.markRunningReportsInterrupted();
      expect(ids).toEqual([]);
    });
  });

  describe('createSubReport and getSubReportForConversation', () => {
    it('stores a sub-report and retrieves it by report_id + conversation_id', async () => {
      const {repo} = makeRepo();
      const report = await repo.createReport(makeReportSeed());

      await repo.createSubReport({
        id: 'sub-abc',
        report_id: report.id,
        conversation_id: 'conv-42',
        conversation_domain: 'wire.com',
        conversation_name_snapshot: 'Engineering sync',
        ai_description_snapshot: 'Weekly engineering standup',
        status: 'pending',
        error: null,
        entries: [],
        stats: {
          raw_token_estimate: 0,
          truncated_token_estimate: 0,
          message_count_before_truncation: 0,
          message_count_after_truncation: 0,
          started_at: null,
          finished_at: null,
        },
        created_at: new Date().toISOString(),
      });

      const found = await repo.getSubReportForConversation(report.id, 'conv-42');

      expect(found).toBeDefined();
      expect(found?.id).toBe('sub-abc');
      expect(found?.conversation_name_snapshot).toBe('Engineering sync');
    });
  });

  describe('upsertConversationSettings', () => {
    it('creates a new settings record with updated_at populated', async () => {
      const {repo} = makeRepo();

      await repo.upsertConversationSettings({
        conversation_id: 'conv-x',
        ai_enabled: true,
        ai_description: 'Project alpha channel',
      });

      const found = await repo.getConversationSettings('conv-x');
      expect(found).toBeDefined();
      expect(found?.ai_enabled).toBe(true);
      expect(found?.ai_description).toBe('Project alpha channel');
      expect(found?.updated_at).toBeTruthy();
    });

    it('updates an existing settings record when called again', async () => {
      const {repo} = makeRepo();

      await repo.upsertConversationSettings({
        conversation_id: 'conv-y',
        ai_enabled: true,
        ai_description: 'Original description',
      });

      await repo.upsertConversationSettings({
        conversation_id: 'conv-y',
        ai_enabled: false,
        ai_description: 'Updated description',
      });

      const found = await repo.getConversationSettings('conv-y');
      expect(found?.ai_enabled).toBe(false);
      expect(found?.ai_description).toBe('Updated description');
    });
  });
});
