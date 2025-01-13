/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

const HEADER_PATTERN = /^#{1,6}\s+/m;
const BOLD_PATTERN_1 = /\*\*[^*]+\*\*/;
const BOLD_PATTERN_2 = /__[^_]+__/;
const ITALIC_PATTERN_1 = /\*[^*]+\*/;
const ITALIC_PATTERN_2 = /_[^_]+_/;
const LINK_PATTERN = /\[[^\]\r\n]{0,500}\]\([^()\r\n]{0,1000}\)/;
const IMAGE_PATTERN = /!\[[^\]]*\]\([^)]*\)/;
const UNORDERED_LIST_PATTERN = /^[-*+]\s.*/gm;
const ORDERED_LIST_PATTERN = /^[\d]+\.\s.*/gm;
const BLOCKQUOTE_PATTERN = /^>\s+/gm;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/;
const INLINE_CODE_PATTERN = /`[^`]+`/;
const HORIZONTAL_RULE_PATTERN = /^(?:[-*_]){3,}\s*$/m;
const TABLE_PATTERN_1 = /^\|[^|]+\|.*$/gm;
const TABLE_PATTERN_2 = /^\|[-:|]+\|.*$/gm;
const STRIKETHROUGH_PATTERN = /~~[^~]+~~/;

const UNORDERED_LIST_DETECT_PATTERN = /^[-*+]\s.*/m;
const ORDERED_LIST_DETECT_PATTERN = /^[\d]+\.\s.*/m;

const MARKDOWN_PATTERNS = [
  HEADER_PATTERN,
  BOLD_PATTERN_1,
  BOLD_PATTERN_2,
  ITALIC_PATTERN_1,
  ITALIC_PATTERN_2,
  LINK_PATTERN,
  IMAGE_PATTERN,
  UNORDERED_LIST_DETECT_PATTERN,
  ORDERED_LIST_DETECT_PATTERN,
  BLOCKQUOTE_PATTERN,
  CODE_BLOCK_PATTERN,
  INLINE_CODE_PATTERN,
  HORIZONTAL_RULE_PATTERN,
  TABLE_PATTERN_1,
  TABLE_PATTERN_2,
  STRIKETHROUGH_PATTERN,
];

const ESCAPED_MARKDOWN_PATTERN = /\\(.)/g;

const INVALID_PATTERNS = [/\\([\\`*_{}[\]()#+\-.!>])/];

/**
 * Checks if the given text string contains markdown.
 */
export const isMarkdownText = (text: string): boolean => {
  if (!text) {
    return false;
  }

  if (INVALID_PATTERNS.some(pattern => pattern.test(text))) {
    return false;
  }

  return MARKDOWN_PATTERNS.some(pattern => pattern.test(text));
};

/**
 * Removes all markdown formatting from a given string.
 */
export const sanitizeMarkdown = (text: string): string => {
  if (!text) {
    return '';
  }

  return markdownSanitizers
    .reduce((sanitizedText, {pattern, transform}) => sanitizedText.replace(pattern, transform), text)
    .trim();
};

interface MarkdownSanitizer {
  pattern: RegExp;
  transform: (match: string, ...args: any[]) => string;
}

const markdownSanitizers: MarkdownSanitizer[] = [
  {
    pattern: ESCAPED_MARKDOWN_PATTERN,
    transform: (_match: string, char: string) => char,
  },
  {
    pattern: HEADER_PATTERN,
    transform: (_match: string) => '',
  },
  {
    pattern: BOLD_PATTERN_1,
    transform: (match: string) => match.slice(2, -2),
  },
  {
    pattern: BOLD_PATTERN_2,
    transform: (match: string) => match.slice(2, -2),
  },
  {
    pattern: ITALIC_PATTERN_1,
    transform: (match: string) => match.slice(1, -1),
  },
  {
    pattern: ITALIC_PATTERN_2,
    transform: (match: string) => match.slice(1, -1),
  },
  {
    pattern: LINK_PATTERN,
    transform: (match: string) => match.match(/\[(.*?)\]/)?.[1] || '',
  },
  {
    pattern: IMAGE_PATTERN,
    transform: (match: string) => match.match(/\[(.*?)\]/)?.[1] || '',
  },
  {
    pattern: UNORDERED_LIST_PATTERN,
    transform: (match: string) => match.replace(/^[-*+]\s/, ''),
  },
  {
    pattern: ORDERED_LIST_PATTERN,
    transform: (match: string) => match.replace(/^[\d]+\.\s/, ''),
  },
  {
    pattern: BLOCKQUOTE_PATTERN,
    transform: (_match: string) => '',
  },
  {
    pattern: CODE_BLOCK_PATTERN,
    transform: (match: string) => match.replace(/```/g, '').trim(),
  },
  {
    pattern: INLINE_CODE_PATTERN,
    transform: (match: string) => match.slice(1, -1),
  },
  {
    pattern: HORIZONTAL_RULE_PATTERN,
    transform: (_match: string) => '',
  },
  {
    pattern: TABLE_PATTERN_2,
    transform: (_match: string) => '',
  },
  {
    pattern: TABLE_PATTERN_1,
    transform: (match: string) =>
      match
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim())
        .join(' '),
  },
  {
    pattern: STRIKETHROUGH_PATTERN,
    transform: (match: string) => match.slice(2, -2),
  },
];
