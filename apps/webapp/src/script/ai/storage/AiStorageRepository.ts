/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

/**
 * AiStorageRepository is the **single gateway** to all AI-specific Dexie tables.
 *
 * This class owns and controls exclusive access to six tables:
 * - ai_reports
 * - ai_conversation_sub_reports
 * - ai_final_report_entries
 * - ai_conversation_settings
 * - ai_settings (via AiSettingsService in Chapter 6.2)
 * - ai_prompt_templates (via PromptService in Chapter 6.3)
 *
 * No other file in the codebase is permitted to call db.ai_* directly.
 * All reads and writes flow through this class, ensuring a single audit point
 * for cascading deletes, transaction boundaries, and index usage.
 */

import type {DexieDatabase} from 'Repositories/storage/DexieDatabase';
import {getLogger} from 'Util/logger';

import type {
  AiReportRecord,
  AiConversationSubReportRecord,
  AiFinalReportEntryRecord,
  AiConversationSettingsRecord,
} from './records';

const log = getLogger('AI/Storage');

export class AiStorageRepository {
  constructor(private readonly db: DexieDatabase) {}

  // Reports

  /**
   * Creates a new AI scan report, generating a UUID and ISO timestamp automatically.
   * @param seed All required fields of AiReportRecord except id and created_at
   * @returns The persisted record including the generated id and created_at
   */
  async createReport(seed: Omit<AiReportRecord, 'id' | 'created_at'>): Promise<AiReportRecord> {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const record: AiReportRecord = {...seed, id, created_at};
    await this.db.ai_reports.put(record);
    return record;
  }

  /**
   * Retrieves a report by its UUID primary key. Returns undefined if not found.
   * @param id The report's UUID
   * @returns The report record, or undefined if not found
   */
  async getReport(id: string): Promise<AiReportRecord | undefined> {
    return this.db.ai_reports.get(id);
  }

  /**
   * Returns all reports sorted by created_at descending (newest first).
   * @returns Array of report records sorted by created_at DESC
   */
  async listReports(): Promise<AiReportRecord[]> {
    const all = await this.db.ai_reports.toArray();
    return all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  /**
   * Merges patch into the existing report identified by id. No-op if the report does not exist.
   * @param id The report's UUID
   * @param patch Partial fields to update
   * @returns Promise<void>
   */
  async updateReport(id: string, patch: Partial<AiReportRecord>): Promise<void> {
    await this.db.ai_reports.update(id, patch);
  }

  /**
   * Deletes the report and all associated sub-reports and final entries atomically inside a Dexie transaction.
   * @param id The report's UUID
   * @returns Promise<void>
   * @throws {Error} If the transaction is aborted by a Dexie constraint error (rare in normal operation)
   */
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

  /**
   * Sweeps all reports in scanning status to interrupted. Called once at app start to recover from mid-scan page reloads or crashes. Returns the IDs of the patched records.
   * @returns Array of report IDs that were marked as interrupted
   */
  async markRunningReportsInterrupted(): Promise<string[]> {
    // The status field is indexed in ai_reports schema ('id, created_at, status'), so this query is efficient.
    const scanning = await this.db.ai_reports.where('status').equals('scanning').toArray();
    const ids = scanning.map(r => r.id);
    if (ids.length === 0) {
      return ids;
    }
    await this.db.ai_reports.where('id').anyOf(ids).modify({status: 'interrupted', error: 'App restart during scan'});
    log.info(`Marked ${ids.length} interrupted reports on app start`);
    return ids;
  }

  // Sub-reports

  /**
   * Inserts a new sub-report record. The primary_key auto-increment field must be omitted from the input — Dexie assigns it on insert.
   * @param record Sub-report data without primary_key
   * @returns Promise<void>
   */
  async createSubReport(record: Omit<AiConversationSubReportRecord, 'primary_key'>): Promise<void> {
    await this.db.ai_conversation_sub_reports.put(record);
  }

  /**
   * Updates the sub-report identified by UUID id. Looks up the internal primary_key first, then applies patch. No-op if not found.
   * @param id The sub-report's UUID
   * @param patch Partial fields to update
   * @returns Promise<void>
   */
  async updateSubReport(id: string, patch: Partial<AiConversationSubReportRecord>): Promise<void> {
    const existing = await this.db.ai_conversation_sub_reports.where('id').equals(id).first();
    if (!existing?.primary_key) {
      return;
    }
    await this.db.ai_conversation_sub_reports.update(existing.primary_key, patch);
  }

  /**
   * Retrieves a sub-report by its UUID id. Returns undefined if not found.
   * @param id The sub-report's UUID
   * @returns The sub-report record, or undefined if not found
   */
  async getSubReport(id: string): Promise<AiConversationSubReportRecord | undefined> {
    return this.db.ai_conversation_sub_reports.where('id').equals(id).first();
  }

  /**
   * Returns the sub-report for a specific conversation within a scan report, using the compound index [report_id+conversation_id]. Returns undefined if not found.
   * @param reportId The parent report's UUID
   * @param conversationId The conversation ID
   * @returns The sub-report record, or undefined if not found
   */
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
   * Returns all sub-reports belonging to the given report, in Dexie's natural storage order.
   * @param reportId The parent report's UUID
   * @returns Array of sub-report records
   */
  async listSubReports(reportId: string): Promise<AiConversationSubReportRecord[]> {
    return this.db.ai_conversation_sub_reports.where('report_id').equals(reportId).toArray();
  }

  // Final entries

  /**
   * Upserts all entries for reportId in a single atomic transaction. **Does NOT delete existing entries first.** If Replace semantics are required (e.g., re-running the final pass), the caller must call deleteFinalEntries(reportId) before calling this method.
   * @param reportId The parent report's UUID (for documentation; entries carry report_id internally)
   * @param entries Array of final entry records to upsert
   * @returns Promise<void>
   * @throws {Error} If the transaction is aborted by a Dexie constraint error (rare in normal operation)
   */
  async putFinalEntries(_reportId: string, entries: AiFinalReportEntryRecord[]): Promise<void> {
    await this.db.transaction('rw', this.db.ai_final_report_entries, async () => {
      await this.db.ai_final_report_entries.bulkPut(entries);
    });
  }

  /**
   * Returns all final report entries for the given report, in Dexie's natural storage order.
   * @param reportId The parent report's UUID
   * @returns Array of final entry records
   */
  async listFinalEntries(reportId: string): Promise<AiFinalReportEntryRecord[]> {
    return this.db.ai_final_report_entries.where('report_id').equals(reportId).toArray();
  }

  /**
   * Shallowly merges patch into the mutable_state of the final entry identified by UUID id. Keys present in patch overwrite the corresponding existing keys; absent keys are preserved. No-op if the entry does not exist.
   * @param id The final entry's UUID
   * @param patch Partial mutable_state fields to merge (checked, title, description, notes)
   * @returns Promise<void>
   */
  async updateFinalEntryMutable(id: string, patch: Partial<AiFinalReportEntryRecord['mutable_state']>): Promise<void> {
    const existing = await this.db.ai_final_report_entries.where('id').equals(id).first();
    if (!existing?.primary_key) {
      return;
    }
    const next = {...existing.mutable_state, ...patch};
    await this.db.ai_final_report_entries.update(existing.primary_key, {mutable_state: next});
  }

  /**
   * Deletes all final report entries for the given report. Called before putFinalEntries when Replace semantics are needed.
   * @param reportId The parent report's UUID
   * @returns Promise<void>
   */
  async deleteFinalEntries(reportId: string): Promise<void> {
    await this.db.ai_final_report_entries.where('report_id').equals(reportId).delete();
  }

  // Conversation settings

  /**
   * Returns the AI settings for a specific conversation, or undefined if no settings have been saved yet. Callers should treat undefined as equivalent to the default (AI enabled for human conversations).
   * @param conversationId The conversation's ID
   * @returns The settings record, or undefined if not found
   */
  async getConversationSettings(conversationId: string): Promise<AiConversationSettingsRecord | undefined> {
    return this.db.ai_conversation_settings.get(conversationId);
  }

  /**
   * Creates or replaces the AI settings for a conversation. Always overwrites updated_at with the current ISO timestamp.
   * @param record Conversation settings data without updated_at
   * @returns Promise<void>
   */
  async upsertConversationSettings(record: Omit<AiConversationSettingsRecord, 'updated_at'>): Promise<void> {
    const updated_at = new Date().toISOString();
    await this.db.ai_conversation_settings.put({...record, updated_at});
  }
}
