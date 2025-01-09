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

import {isMarkdownText} from './MarkdownUtil';

describe('MarkdownUtil', () => {
  describe('isMarkdownText', () => {
    it('returns false for empty text', () => {
      expect(isMarkdownText('')).toBe(false);
    });

    it('returns true for headers', () => {
      expect(isMarkdownText('# Header')).toBe(true);
      expect(isMarkdownText('## Header')).toBe(true);
      expect(isMarkdownText('###### Header')).toBe(true);
    });

    it('returns true for bold text', () => {
      expect(isMarkdownText('**bold**')).toBe(true);
      expect(isMarkdownText('__bold__')).toBe(true);
    });

    it('returns true for italic text', () => {
      expect(isMarkdownText('*italic*')).toBe(true);
      expect(isMarkdownText('_italic_')).toBe(true);
    });

    it('returns true for links', () => {
      expect(isMarkdownText('[example](http://example.com)')).toBe(true);
    });

    it('returns true for images', () => {
      expect(isMarkdownText('![alt text](image.jpg)')).toBe(true);
    });

    it('returns true for unordered lists', () => {
      expect(isMarkdownText('- item')).toBe(true);
      expect(isMarkdownText('* item')).toBe(true);
      expect(isMarkdownText('+ item')).toBe(true);
    });

    it('returns true for ordered lists', () => {
      expect(isMarkdownText('1. item')).toBe(true);
    });

    it('returns true for blockquotes', () => {
      expect(isMarkdownText('> quote')).toBe(true);
    });

    it('returns true for code blocks', () => {
      expect(isMarkdownText('```\ncode\n```')).toBe(true);
      expect(isMarkdownText('`code`')).toBe(true);
    });

    it('returns true for horizontal rules', () => {
      expect(isMarkdownText('---')).toBe(true);
      expect(isMarkdownText('***')).toBe(true);
      expect(isMarkdownText('___')).toBe(true);
    });

    it('returns true for tables', () => {
      expect(isMarkdownText('| Header |')).toBe(true);
      expect(isMarkdownText('|---|')).toBe(true);
    });

    it('returns true for strikethrough', () => {
      expect(isMarkdownText('~~strikethrough~~')).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(isMarkdownText('plain text')).toBe(false);
    });
  });
});
