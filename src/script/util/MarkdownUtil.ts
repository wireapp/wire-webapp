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
    // Headers (e.g. # Header)
    /^#{1,6}\s+/m,

    // Bold (e.g. **bold** or __bold__)
    /\*\*[^*]+\*\*/,
    /__[^_]+__/,

    // Italic (e.g. *italic* or _italic_)
    /\*[^*]+\*/,
    /_[^_]+_/,

    // Links (e.g. [text](http://example.com))
    /\[[^\]\r\n]{0,500}\]\([^()\r\n]{0,1000}\)/,

    // Images (e.g. ![alt](url))
    /!\[[^\]]*\]\([^)]*\)/,

    // Lists
    /^[-*+]\s[^\n]*$/m, // Unordered (e.g. - item, * item)
    /^\d+\.\s[^\n]*$/m, // Ordered (e.g. 1. item)

    // Blockquotes (e.g. > quote)
    /^>\s+/m,

    // Code blocks (e.g. ``` code ``` or `inline code`)
    /```[\s\S]*?```/,
    /`[^`]+`/,

    // Horizontal rules (e.g. --- or *** or ___)
    /^(?:[-*_]){3,}\s*$/m,

    // Tables (e.g. | Header | row | --- | :---: |)
    /\|[^|]+\|/,
    /^[-:|]+$/m,

    // Strikethrough (e.g., ~~text~~)
    /~~[^~]+~~/,
  ];

  const invalidPatterns = [
    // Escaped markdown characters (\*not italic\*)
    /\\([\\`*_{}[\]()#+\-.!>])/,
  ];

  if (invalidPatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  return markdownPatterns.some(pattern => pattern.test(text));
};
