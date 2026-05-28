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

import type {DexieDatabase} from 'Repositories/storage/DexieDatabase';
import type {EventRecord} from 'Repositories/storage/record/EventRecord';
import {getLogger} from 'Util/logger';

import type {EntryLifecycleStatus} from '../domain/EntryTypes';
import type {AiConversationSettingsRecord} from './records/AiConversationSettingsRecord';
import type {AiConversationSubReportRecord} from './records/AiConversationSubReportRecord';
import type {AiFinalReportEntryRecord} from './records/AiFinalReportEntryRecord';
import type {AiReportRecord} from './records/AiReportRecord';
import type {ExportRecord} from './records/ExportRecord';
import type {AiEntryNoteRecord} from './records/AiEntryNoteRecord';

const log = getLogger('AI/Storage');

/** The only module allowed to read from or write to the six AI Dexie tables. */
export class AiStorageRepository {
  constructor(private readonly db: DexieDatabase) {}

  // --- Reports ---

  /** Creates a new report row. Generates id and created_at automatically. */
  async createReport(seed: Omit<AiReportRecord, 'id' | 'created_at'>): Promise<AiReportRecord> {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const record: AiReportRecord = {...seed, id, created_at};
    await this.db.ai_reports.put(record);
    return record;
  }

  async getReport(id: string): Promise<AiReportRecord | undefined> {
    return this.db.ai_reports.get(id);
  }

  /** Returns all reports sorted by created_at DESC. */
  async listReports(): Promise<AiReportRecord[]> {
    const all = await this.db.ai_reports.toArray();
    return all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  async updateReport(id: string, patch: Partial<AiReportRecord>): Promise<void> {
    await this.db.ai_reports.update(id, patch);
  }

  /** Cascade-deletes sub-reports and final entries belonging to this report. */
  async deleteReport(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.ai_reports,
      this.db.ai_conversation_sub_reports,
      this.db.ai_final_report_entries,
      async () => {
        await this.db.ai_reports.delete(id);
        await this.db.ai_conversation_sub_reports.where('report_id').equals(id).delete();
        await this.db.ai_final_report_entries.where('report_id').equals(id).delete();
      },
    );
  }

  /** At app start: marks any report still in 'scanning' state as 'interrupted'. Returns affected ids. */
  async markRunningReportsInterrupted(): Promise<string[]> {
    const scanning = await this.db.ai_reports.where('status').equals('scanning').toArray();
    const ids = scanning.map(r => r.id);
    if (ids.length === 0) {
      return ids;
    }
    await this.db.ai_reports.where('id').anyOf(ids).modify({status: 'interrupted', error: 'App restart during scan'});
    log.info(`Marked ${ids.length} report(s) interrupted on app start`);
    return ids;
  }

  // --- Sub-reports ---

  async createSubReport(record: Omit<AiConversationSubReportRecord, 'primary_key'>): Promise<void> {
    await this.db.ai_conversation_sub_reports.put(record);
  }

  async updateSubReport(id: string, patch: Partial<AiConversationSubReportRecord>): Promise<void> {
    const existing = await this.db.ai_conversation_sub_reports.where('id').equals(id).first();
    if (!existing?.primary_key) {
      return;
    }
    await this.db.ai_conversation_sub_reports.update(existing.primary_key, patch);
  }

  async getSubReport(id: string): Promise<AiConversationSubReportRecord | undefined> {
    return this.db.ai_conversation_sub_reports.where('id').equals(id).first();
  }

  /**
   * Follows the reused_from_sub_report_id chain to the original (root) sub-report.
   * entry_statuses always lives on the root so that hide/accept decisions are shared
   * across every report that reuses the same conversation data.
   */
  private async resolveToRoot(subReportId: string): Promise<AiConversationSubReportRecord | undefined> {
    let current = await this.db.ai_conversation_sub_reports.where('id').equals(subReportId).first();
    while (current?.reused_from_sub_report_id) {
      const parent = await this.db.ai_conversation_sub_reports
        .where('id')
        .equals(current.reused_from_sub_report_id)
        .first();
      if (!parent) {
        break;
      }
      current = parent;
    }
    return current;
  }

  /**
   * Lists sub-reports for a report, overlaying entry_statuses from the root of each
   * reuse chain so that curation (hide/accept) is shared across reports.
   */
  async listSubReports(reportId: string): Promise<AiConversationSubReportRecord[]> {
    const subs = await this.db.ai_conversation_sub_reports.where('report_id').equals(reportId).toArray();
    return Promise.all(
      subs.map(async sub => {
        if (!sub.reused_from_sub_report_id) {
          return sub;
        }
        const root = await this.resolveToRoot(sub.reused_from_sub_report_id);
        return {...sub, entry_statuses: root?.entry_statuses};
      }),
    );
  }

  async getSubReportForConversation(
    reportId: string,
    conversationId: string,
  ): Promise<AiConversationSubReportRecord | undefined> {
    return this.db.ai_conversation_sub_reports
      .where('[report_id+conversation_id]')
      .equals([reportId, conversationId])
      .first();
  }

  /**
   * Returns the most recent finished sub-report for a conversation across all reports.
   * Used during scan start to detect conversations with no new messages since the last scan.
   */
  async findLatestDoneSubReportForConversation(
    conversationId: string,
  ): Promise<AiConversationSubReportRecord | undefined> {
    const candidates = await this.db.ai_conversation_sub_reports
      .where('conversation_id')
      .equals(conversationId)
      .filter(s => s.status === 'done' && s.stats.finished_at !== null)
      .toArray();

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates.reduce((best, s) => (s.stats.finished_at! > best.stats.finished_at! ? s : best));
  }

  // --- Final entries ---

  async putFinalEntries(reportId: string, entries: AiFinalReportEntryRecord[]): Promise<void> {
    await this.db.transaction('rw', this.db.ai_final_report_entries, async () => {
      await this.db.ai_final_report_entries.bulkPut(entries);
    });
    log.debug(`Stored ${entries.length} final entries for report ${reportId}`);
  }

  async listFinalEntries(reportId: string): Promise<AiFinalReportEntryRecord[]> {
    return this.db.ai_final_report_entries.where('report_id').equals(reportId).toArray();
  }

  async updateFinalEntryMutable(id: string, patch: Partial<AiFinalReportEntryRecord['mutable_state']>): Promise<void> {
    const existing = await this.db.ai_final_report_entries.where('id').equals(id).first();
    if (!existing?.primary_key) {
      return;
    }
    const next = {...existing.mutable_state, ...patch};
    await this.db.ai_final_report_entries.update(existing.primary_key, {mutable_state: next});
  }

  async updateFinalEntryStatus(id: string, status: EntryLifecycleStatus): Promise<void> {
    const existing = await this.db.ai_final_report_entries.where('id').equals(id).first();
    if (!existing?.primary_key) {
      return;
    }
    await this.db.ai_final_report_entries.update(existing.primary_key, {status});
  }

  /**
   * Updates the lifecycle status for a single entry within a sub-report's entries[] array.
   * Keyed by the entry's stable id (StoredEntry.id), not its array index.
   * Always writes to the root of the reuse chain so the change is visible across every
   * report that shares this conversation's sub-report data.
   */
  async updateSubReportEntryStatus(
    subReportId: string,
    entryId: string,
    status: EntryLifecycleStatus,
  ): Promise<void> {
    const sub = await this.db.ai_conversation_sub_reports.where('id').equals(subReportId).first();
    const root = sub?.reused_from_sub_report_id ? await this.resolveToRoot(sub.reused_from_sub_report_id) : sub;
    if (!root?.primary_key) {
      return;
    }
    const entry_statuses = {...(root.entry_statuses ?? {}), [entryId]: status};
    await this.db.ai_conversation_sub_reports.update(root.primary_key, {entry_statuses});
  }

  async deleteFinalEntries(reportId: string): Promise<void> {
    await this.db.ai_final_report_entries.where('report_id').equals(reportId).delete();
  }

  // --- Conversation settings ---

  async getConversationSettings(conversationId: string): Promise<AiConversationSettingsRecord | undefined> {
    return this.db.ai_conversation_settings.get(conversationId);
  }

  async listAllConversationSettings(): Promise<AiConversationSettingsRecord[]> {
    return this.db.ai_conversation_settings.toArray();
  }

  async upsertConversationSettings(record: Omit<AiConversationSettingsRecord, 'updated_at'>): Promise<void> {
    const updated_at = new Date().toISOString();
    await this.db.ai_conversation_settings.put({...record, updated_at});
  }

  // --- Exports ---

  async createExport(seed: Omit<ExportRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ExportRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: ExportRecord = {...seed, id, created_at: now, updated_at: now};
    await this.db.ai_exports.put(record);
    return record;
  }

  async getExport(id: string): Promise<ExportRecord | undefined> {
    return this.db.ai_exports.get(id);
  }

  /** Returns all exports sorted by created_at DESC. */
  async listExports(): Promise<ExportRecord[]> {
    const all = await this.db.ai_exports.toArray();
    return all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  async updateExport(id: string, patch: Partial<Omit<ExportRecord, 'id' | 'created_at'>>): Promise<void> {
    const updated_at = new Date().toISOString();
    await this.db.ai_exports.update(id, {...patch, updated_at});
  }

  async deleteExport(id: string): Promise<void> {
    await this.db.ai_exports.delete(id);
  }

  // --- Entry notes ---

  async getNote(entry_id: string): Promise<AiEntryNoteRecord | undefined> {
    return this.db.ai_entry_notes.get(entry_id);
  }

  /** Creates or replaces the note for an entry. Deletes the record if text is empty. */
  async upsertNote(entry_id: string, text: string): Promise<void> {
    if (text.trim() === '') {
      await this.db.ai_entry_notes.delete(entry_id);
      return;
    }
    const updated_at = new Date().toISOString();
    await this.db.ai_entry_notes.put({entry_id, text: text.trim(), updated_at});
  }

  async deleteNote(entry_id: string): Promise<void> {
    await this.db.ai_entry_notes.delete(entry_id);
  }

  /** Returns notes for a specific set of entry IDs (used during export). */
  async listNotesForEntries(entry_ids: string[]): Promise<AiEntryNoteRecord[]> {
    return this.db.ai_entry_notes.where('entry_id').anyOf(entry_ids).toArray();
  }

  // --- Events (read-only, for export transcript building) ---

  /** Returns all events for a conversation sorted by time ascending. */
  async getEventsForConversation(conversation_id: string): Promise<EventRecord[]> {
    return this.db.events.where('conversation').equals(conversation_id).sortBy('time');
  }
}
