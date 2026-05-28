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
import type {JiraProblemRecord, JiraTicketRecord} from 'src/script/ai/storage/records';

/** CRUD access to jira_tickets and jira_problems Dexie tables. */
export class JiraStorageRepository {
  constructor(private readonly db: DexieDatabase) {}

  // ── Tickets ───────────────────────────────────────────────────────────────

  async upsertTicket(ticket: JiraTicketRecord): Promise<void> {
    await this.db.jira_tickets.put(ticket);
  }

  async upsertTickets(tickets: JiraTicketRecord[]): Promise<void> {
    await this.db.jira_tickets.bulkPut(tickets);
  }

  async getAllTickets(): Promise<JiraTicketRecord[]> {
    return this.db.jira_tickets.toArray();
  }

  async getTicket(key: string): Promise<JiraTicketRecord | undefined> {
    return this.db.jira_tickets.get(key);
  }

  async getStoredKeys(): Promise<Set<string>> {
    const keys = await this.db.jira_tickets.toCollection().primaryKeys();
    return new Set(keys as string[]);
  }

  // ── Problems ──────────────────────────────────────────────────────────────

  /** Upsert a problem by (ticket_key, rule_id). Returns existing record id if already known. */
  async recordProblem(ticketKey: string, ruleId: string, message: string): Promise<void> {
    const existing = await this.db.jira_problems
      .where('[ticket_key+rule_id]')
      .equals([ticketKey, ruleId])
      .first();

    if (existing) {
      // Already tracked — keep detected_at, just ensure it's marked active
      if (existing.status !== 'active') {
        await this.db.jira_problems.update(existing.id!, {status: 'active', resolved_at: null, message});
      }
    } else {
      const record: JiraProblemRecord = {
        ticket_key: ticketKey,
        rule_id: ruleId,
        message,
        status: 'active',
        detected_at: new Date().toISOString(),
        resolved_at: null,
      };
      await this.db.jira_problems.add(record);
    }
  }

  async resolveProblem(ticketKey: string, ruleId: string): Promise<void> {
    const existing = await this.db.jira_problems
      .where('[ticket_key+rule_id]')
      .equals([ticketKey, ruleId])
      .first();

    if (existing?.status === 'active') {
      await this.db.jira_problems.update(existing.id!, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      });
    }
  }

  async getProblemsForTicket(ticketKey: string): Promise<JiraProblemRecord[]> {
    return this.db.jira_problems.where('ticket_key').equals(ticketKey).toArray();
  }

  async getAllProblems(): Promise<JiraProblemRecord[]> {
    return this.db.jira_problems.toArray();
  }
}
