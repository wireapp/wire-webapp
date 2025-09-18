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

import {isMarkdownText, sanitizeMarkdown} from './MarkdownUtil';

describe('MarkdownUtil', () => {
  describe('isMarkdownText', () => {
    it('returns false for empty text', () => {
      expect(isMarkdownText('')).toBe(false);
    });

    it('returns true for headers', () => {
      expect(isMarkdownText('# Header')).toBe(true);
      expect(isMarkdownText('## Header')).toBe(true);
      expect(isMarkdownText('### Header')).toBe(true);
      expect(isMarkdownText('#### Header')).toBe(true);
      expect(isMarkdownText('##### Header')).toBe(true);
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

    it('returns true for a mix of Markdown features', () => {
      expect(isMarkdownText('# Header with [link](http://example.com)')).toBe(true);
      expect(isMarkdownText('**Bold and _italic_**')).toBe(true);
      expect(isMarkdownText('- item with `inline code`')).toBe(true);
      expect(isMarkdownText('> Quote with *italic*')).toBe(true);
    });

    it('returns true for multi-line Markdown', () => {
      expect(
        isMarkdownText(`\`\`\`
  Line 1
  Line 2
  \`\`\``),
      ).toBe(true);
      expect(
        isMarkdownText(`1. Item 1
  2. Item 2`),
      ).toBe(true);
    });

    it('handles escaped Markdown patterns correctly', () => {
      expect(isMarkdownText('\\*not italic\\*')).toBe(false);
      expect(isMarkdownText('Some \\`inline code\\` here')).toBe(false);
      expect(isMarkdownText('\\> Not a blockquote')).toBe(false);
    });
  });

  describe('sanitizeMarkdown', () => {
    it('returns empty string for falsy input', () => {
      expect(sanitizeMarkdown('')).toBe('');
    });

    it('removes headers while preserving text', () => {
      expect(sanitizeMarkdown('# Header 1')).toBe('Header 1');
      expect(sanitizeMarkdown('## Header 2')).toBe('Header 2');
      expect(sanitizeMarkdown('### Header 3')).toBe('Header 3');
      expect(sanitizeMarkdown('#### Header 4')).toBe('Header 4');
      expect(sanitizeMarkdown('##### Header 5')).toBe('Header 5');
      expect(sanitizeMarkdown('###### Header 6')).toBe('Header 6');
    });

    it('removes bold formatting', () => {
      expect(sanitizeMarkdown('**bold text**')).toBe('bold text');
      expect(sanitizeMarkdown('__also bold__')).toBe('also bold');
      expect(sanitizeMarkdown('normal **bold** normal')).toBe('normal bold normal');
    });

    it('removes italic formatting', () => {
      expect(sanitizeMarkdown('*italic text*')).toBe('italic text');
      expect(sanitizeMarkdown('_also italic_')).toBe('also italic');
      expect(sanitizeMarkdown('normal *italic* normal')).toBe('normal italic normal');
    });

    it('removes links while preserving link text', () => {
      expect(sanitizeMarkdown('[link text](http://example.com)')).toBe('link text');
      expect(sanitizeMarkdown('Click [here](http://example.com) now')).toBe('Click here now');
      expect(sanitizeMarkdown('[](http://example.com)')).toBe('');
    });

    it('removes list markers', () => {
      expect(sanitizeMarkdown('- First item\n- Second item')).toBe('First item\nSecond item');
      expect(sanitizeMarkdown('* Star item\n+ Plus item')).toBe('Star item\nPlus item');
      expect(sanitizeMarkdown('1. First\n2. Second')).toBe('First\nSecond');
    });

    it('removes blockquotes', () => {
      expect(sanitizeMarkdown('> quoted text')).toBe('quoted text');
      expect(sanitizeMarkdown('> multiple\n> line quote')).toBe('multiple\nline quote');
    });

    it('removes code blocks', () => {
      expect(sanitizeMarkdown('```\ncode block\n```')).toBe('code block');
      expect(sanitizeMarkdown('`inline code`')).toBe('inline code');
      expect(sanitizeMarkdown('```typescript\nconst x = 1;\n```')).toBe('typescript\nconst x = 1;');
    });

    it('removes table formatting', () => {
      expect(sanitizeMarkdown('| Header |')).toBe('Header');
      expect(sanitizeMarkdown('| Col 1 | Col 2 |\n|--|--|\n| Data 1 | Data 2 |')).toBe('Col 1 Col 2\n\nData 1 Data 2');
    });

    it('removes strikethrough', () => {
      expect(sanitizeMarkdown('~~struck text~~')).toBe('struck text');
      expect(sanitizeMarkdown('normal ~~struck~~ normal')).toBe('normal struck normal');
    });

    it('handles complex mixed markdown', () => {
      const complexMarkdown = `# Main Title

**Important** _announcement_:

1. First [point](http://example.com)
2. Second point with ~~strike~~

> Quote with \`code\`

\`\`\`
Example code
\`\`\``;

      const expected = `Main Title

Important announcement:

First point
Second point with strike

Quote with code

Example code`;

      expect(sanitizeMarkdown(complexMarkdown).replace(/\s+/g, ' ').trim()).toBe(expected.replace(/\s+/g, ' ').trim());
    });
  });
});
