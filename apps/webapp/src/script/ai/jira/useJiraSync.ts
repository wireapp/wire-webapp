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

import {useCallback, useEffect, useRef, useState} from 'react';

import {useAi} from 'src/script/ai';
import type {JiraProblemRecord, JiraTicketRecord} from 'src/script/ai/storage/records';
import {getLogger} from 'Util/logger';

import {ALL_RULE_IDS, evaluateTicket} from './jiraRules';

const log = getLogger('AI/JiraSync');

const SYNC_INTERVAL_MS    = 10 * 60 * 1000; // 10 minutes
const RECHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ─── Jira API shapes (minimal) ───────────────────────────────────────────────

interface JiraApiIssue {
  key: string;
  fields: {
    summary: string;
    status: {name: string; statusCategory: {colorName: string}};
    priority: {name: string} | null;
    assignee: {accountId: string; displayName: string} | null;
    customfield_10004: number | null;
    labels: string[];
    issuetype: {name: string};
    updated: string;
    comment?: {comments: JiraApiComment[]};
  };
}

interface JiraApiComment {
  id: string;
  author: {accountId: string; displayName: string};
  created: string;
}

// ─── Export types ─────────────────────────────────────────────────────────────

export interface TicketWithProblems extends JiraTicketRecord {
  problems: JiraProblemRecord[];
}

export interface UseJiraSyncResult {
  tickets: TicketWithProblems[];
  loading: boolean;
  error: string | null;
  isConfigured: boolean | null;
  refresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useJiraSync = (): UseJiraSyncResult => {
  const {aiSettings, jiraStorage} = useAi();
  const [tickets, setTickets]           = useState<TicketWithProblems[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const currentAccountIdRef             = useRef<string>('');

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const authHeaders = useCallback(
    async (): Promise<Record<string, string> | null> => {
      const [email, pat] = await Promise.all([aiSettings.getJiraEmail(), aiSettings.getJiraPat()]);
      if (!email || !pat) return null;
      return {'X-Jira-Email': email, 'X-Jira-Token': pat, Accept: 'application/json'};
    },
    [aiSettings],
  );

  const fetchJson = useCallback(async <T>(path: string, headers: Record<string, string>): Promise<T> => {
    const res = await fetch(`/proxy/jira${path}`, {headers});
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira ${res.status}: ${text.slice(0, 120)}`);
    }
    return res.json() as Promise<T>;
  }, []);

  // ─── Refresh tickets from DB into state ───────────────────────────────────

  const loadFromDb = useCallback(async () => {
    const [storedTickets, allProblems] = await Promise.all([
      jiraStorage.getAllTickets(),
      jiraStorage.getAllProblems(),
    ]);

    const problemsByKey = new Map<string, JiraProblemRecord[]>();
    for (const p of allProblems) {
      const arr = problemsByKey.get(p.ticket_key) ?? [];
      arr.push(p);
      problemsByKey.set(p.ticket_key, arr);
    }

    const merged = storedTickets
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .map(t => ({...t, problems: problemsByKey.get(t.key) ?? []}));

    setTickets(merged);
  }, [jiraStorage]);

  // ─── Evaluate rules and persist problems ──────────────────────────────────

  const evaluateAndPersist = useCallback(
    async (ticket: JiraTicketRecord) => {
      const violations = evaluateTicket(ticket, currentAccountIdRef.current);
      const violatedIds = new Set(violations.map(v => v.ruleId));

      // Record new violations
      for (const v of violations) {
        await jiraStorage.recordProblem(ticket.key, v.ruleId, v.message);
      }

      // Resolve rules that are no longer violated
      for (const ruleId of ALL_RULE_IDS) {
        if (!violatedIds.has(ruleId)) {
          await jiraStorage.resolveProblem(ticket.key, ruleId);
        }
      }
    },
    [jiraStorage],
  );

  // ─── Full sync from Jira API ──────────────────────────────────────────────

  const syncFromApi = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) {
      setIsConfigured(false);
      return;
    }
    setIsConfigured(true);
    setLoading(true);
    setError(null);

    try {
      // Fetch current user accountId (needed for comment authorship check)
      if (!currentAccountIdRef.current) {
        const me = await fetchJson<{accountId: string}>('/rest/api/3/myself', headers);
        currentAccountIdRef.current = me.accountId;
      }

      // Fetch ticket list
      const jql = 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC';
      const params = new URLSearchParams({
        jql,
        maxResults: '50',
        fields: 'summary,status,priority,assignee,updated,customfield_10004,labels,issuetype',
      });
      const {issues} = await fetchJson<{issues: JiraApiIssue[]}>(
        `/rest/api/3/search/jql?${params}`,
        headers,
      );

      const existingKeys = await jiraStorage.getStoredKeys();
      const newKeys = issues.filter(i => !existingKeys.has(i.key)).map(i => i.key);

      // Fetch comments for in-progress tickets (needed for comment rule)
      const inProgressKeys = issues
        .filter(i => i.fields.status.statusCategory.colorName === 'yellow')
        .map(i => i.key);

      const commentsByKey = new Map<string, JiraApiComment[]>();
      await Promise.all(
        inProgressKeys.map(async key => {
          try {
            const detail = await fetchJson<{fields: {comment: {comments: JiraApiComment[]}}}>(
              `/rest/api/3/issue/${key}?fields=comment`,
              headers,
            );
            commentsByKey.set(key, detail.fields.comment?.comments ?? []);
          } catch (err) {
            log.warn(`Failed to fetch comments for ${key}`, err);
          }
        }),
      );

      // Convert and upsert tickets
      const now = new Date().toISOString();
      const records: JiraTicketRecord[] = issues.map(issue => {
        const apiComments = commentsByKey.get(issue.key);
        return {
          key: issue.key,
          summary: issue.fields.summary,
          status_name: issue.fields.status.name,
          status_category_color: issue.fields.status.statusCategory.colorName,
          priority_name: issue.fields.priority?.name ?? null,
          assignee_id: issue.fields.assignee?.accountId ?? null,
          assignee_name: issue.fields.assignee?.displayName ?? null,
          story_points: issue.fields.customfield_10004,
          labels: issue.fields.labels ?? [],
          issue_type_name: issue.fields.issuetype.name,
          comments: apiComments
            ? apiComments.map(c => ({
                id: c.id,
                author_id: c.author.accountId,
                author_name: c.author.displayName,
                created_at: c.created,
              }))
            : [],
          comments_fetched: apiComments !== undefined,
          fetched_at: now,
          updated_at: issue.fields.updated,
        };
      });

      await jiraStorage.upsertTickets(records);

      // Evaluate rules for all fetched tickets
      await Promise.all(records.map(r => evaluateAndPersist(r)));

      // Immediately re-evaluate any brand-new tickets we hadn't seen before
      if (newKeys.length > 0) {
        log.info(`New tickets found: ${newKeys.join(', ')}`);
      }

      await loadFromDb();
    } catch (err) {
      log.error('Jira sync failed', err);
      setError((err as Error).message);
      // Still load whatever we have in DB
      await loadFromDb();
    } finally {
      setLoading(false);
    }
  }, [authHeaders, fetchJson, jiraStorage, evaluateAndPersist, loadFromDb]);

  // ─── Re-check existing problems without a full API sync ───────────────────

  const recheckProblems = useCallback(async () => {
    const stored = await jiraStorage.getAllTickets();
    await Promise.all(stored.map(t => evaluateAndPersist(t)));
    await loadFromDb();
  }, [jiraStorage, evaluateAndPersist, loadFromDb]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Initial sync on mount
    void syncFromApi();

    const syncTimer    = setInterval(() => void syncFromApi(),    SYNC_INTERVAL_MS);
    const recheckTimer = setInterval(() => void recheckProblems(), RECHECK_INTERVAL_MS);

    return () => {
      clearInterval(syncTimer);
      clearInterval(recheckTimer);
    };
  }, [syncFromApi, recheckProblems]);

  return {tickets, loading, error, isConfigured, refresh: syncFromApi};
};
