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

import type {JiraTicketRecord} from 'src/script/ai/storage/records';

export interface RuleViolation {
  ruleId: string;
  message: string;
}

interface Rule {
  id: string;
  /** Whether this rule should be evaluated against the ticket at all. */
  applies: (ticket: JiraTicketRecord) => boolean;
  /** Returns a violation message if violated, or null if the ticket is clean. */
  check: (ticket: JiraTicketRecord, currentAccountId: string) => RuleViolation | null;
}

// ─── Constants from the ticketing standard ────────────────────────────────────

const FIBONACCI_POINTS = new Set([1, 2, 3, 5, 8, 13, 21]);

const ALLOWED_LABELS = new Set([
  'CS',
  'added-in-flight',
  'Internal',
  'External',
  'jira_escalated',
  'POV',
  'prospects/other',
]);

// Tickets whose statusCategory is "yellow" are the "In Progress" bucket.
const isInProgress = (t: JiraTicketRecord) => t.status_category_color === 'yellow';

// Three days in ms
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// ─── Rules ────────────────────────────────────────────────────────────────────

const rules: Rule[] = [
  // ── In-progress gates ────────────────────────────────────────────────────

  {
    id: 'in_progress_no_recent_comment',
    applies: isInProgress,
    check: (t, accountId) => {
      if (!t.comments_fetched) {
        return null; // Can't evaluate without comment data
      }
      const cutoff = Date.now() - THREE_DAYS_MS;
      const hasRecent = t.comments.some(
        c => c.author_id === accountId && new Date(c.created_at).getTime() >= cutoff,
      );
      return hasRecent ? null : {
        ruleId: 'in_progress_no_recent_comment',
        message: 'No comment by you in the last 3 days',
      };
    },
  },

  {
    id: 'in_progress_missing_story_points',
    applies: isInProgress,
    check: t =>
      t.story_points == null
        ? {ruleId: 'in_progress_missing_story_points', message: 'Missing story points'}
        : null,
  },

  {
    id: 'in_progress_no_assignee',
    applies: isInProgress,
    check: t =>
      !t.assignee_id
        ? {ruleId: 'in_progress_no_assignee', message: 'No assignee set'}
        : null,
  },

  // ── Story points ─────────────────────────────────────────────────────────

  {
    id: 'story_points_not_fibonacci',
    applies: t => t.story_points != null,
    check: t =>
      !FIBONACCI_POINTS.has(t.story_points!)
        ? {
            ruleId: 'story_points_not_fibonacci',
            message: `Story points (${t.story_points}) must be one of 1, 2, 3, 5, 8, 13, 21`,
          }
        : null,
  },

  // ── Title format ─────────────────────────────────────────────────────────

  {
    id: 'title_missing_bracket_format',
    applies: () => true,
    check: t =>
      // Valid titles start with at least [Area][Product] → two consecutive bracket groups
      /^\[[^\]]+\]\[[^\]]+\]/.test(t.summary)
        ? null
        : {ruleId: 'title_missing_bracket_format', message: 'Title missing [Area][Product] bracket format'},
  },

  {
    id: 'title_topic_has_and',
    applies: () => true,
    check: t => {
      // Strip all leading bracket groups and optional " - " separator to get the topic
      const topic = t.summary.replace(/^(\[[^\]]*\])+\s*-?\s*/, '');
      return /\band\b/i.test(topic)
        ? {ruleId: 'title_topic_has_and', message: 'Title contains "and" — consider splitting into two tickets'}
        : null;
    },
  },

  {
    id: 'title_missing_separator',
    applies: t => /^\[[^\]]+\]\[[^\]]+\]/.test(t.summary), // Only when brackets are present
    check: t =>
      // After bracket groups there should be " - " before the topic
      /^(\[[^\]]+\])+\s*-\s*.+/.test(t.summary)
        ? null
        : {ruleId: 'title_missing_separator', message: 'Title missing " - " separator between brackets and topic'},
  },

  // ── Labels ────────────────────────────────────────────────────────────────

  {
    id: 'invalid_label',
    applies: t => t.labels.length > 0,
    check: t => {
      const bad = t.labels.filter(l => !ALLOWED_LABELS.has(l));
      return bad.length > 0
        ? {
            ruleId: 'invalid_label',
            message: `Non-standard label${bad.length > 1 ? 's' : ''}: ${bad.join(', ')}`,
          }
        : null;
    },
  },
];

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Runs all applicable rules against the given ticket.
 * Returns a list of current violations. An empty list means the ticket is clean.
 */
export const evaluateTicket = (ticket: JiraTicketRecord, currentAccountId: string): RuleViolation[] => {
  const violations: RuleViolation[] = [];
  for (const rule of rules) {
    if (!rule.applies(ticket)) continue;
    const v = rule.check(ticket, currentAccountId);
    if (v) violations.push(v);
  }
  return violations;
};

/** All stable rule IDs — used to resolve problems that are no longer violated. */
export const ALL_RULE_IDS = rules.map(r => r.id);
