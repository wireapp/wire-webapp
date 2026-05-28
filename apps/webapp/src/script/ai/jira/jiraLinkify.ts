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

/**
 * Utilities for detecting and hyperlinking Jira ticket keys in text and HTML.
 *
 * Matches standard Jira key format: PROJECT-123 (uppercase letters, hyphen, digits).
 * Only replaces keys that exist in the provided known_keys set to avoid false positives.
 */

const JIRA_KEY_PATTERN = '\\b([A-Z][A-Z0-9]*-\\d+)\\b';

// Matches <a>…</a> blocks, other tags, or a bare Jira key — in that order.
// The <a> alternative is first so entire anchor blocks are consumed before per-tag skipping,
// which prevents wrapping already-linked text in a second anchor (invalid HTML).
// The Jira key appears as capture group 1; the other two alternatives leave it undefined.
const HTML_JIRA_REGEX = new RegExp(
  '<a\\b[^>]*>[\\s\\S]*?<\\/a>|<[^>]+>|\\b([A-Z][A-Z0-9]*-\\d+)\\b',
  'g',
);

/**
 * Post-processes rendered HTML to wrap known Jira ticket IDs in internal navigation links.
 * Skips text inside HTML tags, attributes, and existing <a> elements to avoid nesting anchors.
 */
export const injectJiraLinksIntoHtml = (html: string, known_keys: Set<string>): string => {
  if (known_keys.size === 0) {
    return html;
  }

  return html.replace(HTML_JIRA_REGEX, (match, ticket_id: string | undefined) => {
    if (!ticket_id || !known_keys.has(ticket_id)) {
      return match;
    }
    return `<a class="jira-inline-link" data-jira-link="${ticket_id}" href="#/jira/${ticket_id}">${ticket_id}</a>`;
  });
};

/** A segment of plain text split for React rendering: either raw text or a known Jira link. */
export type JiraChunk = {type: 'text'; content: string} | {type: 'link'; key: string};

/**
 * Splits plain text into alternating text/link chunks so a React component can render
 * Jira ticket IDs as interactive elements without using dangerouslySetInnerHTML.
 */
export const splitTextWithJiraLinks = (text: string, known_keys: Set<string>): JiraChunk[] => {
  if (!text || known_keys.size === 0) {
    return [{type: 'text', content: text}];
  }

  const chunks: JiraChunk[] = [];
  let last_index = 0;

  for (const match of text.matchAll(new RegExp(JIRA_KEY_PATTERN, 'g'))) {
    const key = match[1];
    if (!known_keys.has(key)) {
      continue;
    }
    if (match.index > last_index) {
      chunks.push({type: 'text', content: text.slice(last_index, match.index)});
    }
    chunks.push({type: 'link', key});
    last_index = match.index + match[0].length;
  }

  if (last_index < text.length) {
    chunks.push({type: 'text', content: text.slice(last_index)});
  }

  return chunks.length > 0 ? chunks : [{type: 'text', content: text}];
};
