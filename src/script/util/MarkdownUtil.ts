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

export const isMarkdownText = (text: string): boolean => {
  if (!text) {
    return false;
  }

  const markdownPatterns = [
    // Headers
    /^#{1,6}\s+/m,

    // Bold
    /\*\*[^*]+\*\*/,
    /__[^_]+__/,

    // Italic
    /\*[^*]+\*/,
    /_[^_]+_/,

    // Links
    /\[[^\]\r\n]*\]\([^()\r\n]*?\)/,

    // Images
    /!\[[^\]]*\]\([^)]*\)/,

    // Lists
    /^[-*+]\s[^\n]*$/m, // Unordered
    /^\d+\.\s[^\n]*$/m, // Ordered

    // Blockquotes
    /^>\s+/m,

    // Code blocks
    /```[\s\S]*?```/,
    /`[^`]+`/,

    // Horizontal rules
    /^(?:[-*_]){3,}\s*$/m,

    // Tables
    /\|[^|]+\|/,
    /^[-:|]+$/m,

    // Strikethrough
    /~~[^~]+~~/,
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
};
