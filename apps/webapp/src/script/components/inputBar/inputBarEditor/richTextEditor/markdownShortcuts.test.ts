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
 */

import {$createParagraphNode, $getRoot, $getSelection, $isRangeSelection, LexicalEditor} from 'lexical';
import {registerMarkdownShortcuts} from '@lexical/markdown';

import {createWireLexicalEditorTestHarness} from './testSupport/createWireLexicalEditorTestHarness';

import {markdownTransformers} from './utils/markdownTransformers';

type MarkdownShortcutCharacterizationTestCase = {
  readonly description: string;
  readonly typedText: string;
  readonly expectedMarkdown: string;
  readonly expectedTextContent: string;
};

const markdownShortcutCharacterizationTestCases: readonly MarkdownShortcutCharacterizationTestCase[] = [
  {
    description: 'an ordered-list shortcut',
    typedText: '1. item',
    expectedMarkdown: '1. item',
    expectedTextContent: 'item',
  },
  {
    description: 'an ambiguous non-one ordered-list input',
    typedText: '14. - 25. september',
    expectedMarkdown: '14. - 25. september',
    expectedTextContent: '- 25. september',
  },
  {
    description: 'a non-one ordered-list input with a month name',
    typedText: '14. September',
    expectedMarkdown: '14. September',
    expectedTextContent: 'September',
  },
  {
    description: 'a year-like ordered-list input',
    typedText: '2026. something',
    expectedMarkdown: '2026. something',
    expectedTextContent: 'something',
  },
  {
    description: 'a zero-padded ordered-list input',
    typedText: '01. something',
    expectedMarkdown: '1. something',
    expectedTextContent: 'something',
  },
  {
    description: 'a zero ordered-list input',
    typedText: '0. something',
    expectedMarkdown: '0. something',
    expectedTextContent: 'something',
  },
  {
    description: 'a number without a separating space',
    typedText: '1.something',
    expectedMarkdown: '1.something',
    expectedTextContent: '1.something',
  },
  {
    description: 'a number followed by a closing parenthesis',
    typedText: '1) something',
    expectedMarkdown: '1) something',
    expectedTextContent: '1) something',
  },
  {
    description: 'a dash unordered-list shortcut',
    typedText: '- item',
    expectedMarkdown: '- item',
    expectedTextContent: 'item',
  },
  {
    description: 'a dash unordered-list input with a following space',
    typedText: '- something',
    expectedMarkdown: '- something',
    expectedTextContent: 'something',
  },
  {
    description: 'a dash without a following space',
    typedText: '-something',
    expectedMarkdown: '-something',
    expectedTextContent: '-something',
  },
  {
    description: 'an asterisk unordered-list shortcut',
    typedText: '* item',
    expectedMarkdown: '- item',
    expectedTextContent: 'item',
  },
  {
    description: 'an asterisk unordered-list input with a following space',
    typedText: '* something',
    expectedMarkdown: '- something',
    expectedTextContent: 'something',
  },
  {
    description: 'an asterisk without a following space',
    typedText: '*something',
    expectedMarkdown: '*something',
    expectedTextContent: '*something',
  },
  {
    description: 'a plus unordered-list shortcut',
    typedText: '+ item',
    expectedMarkdown: '- item',
    expectedTextContent: 'item',
  },
  {
    description: 'a plus unordered-list input with a following space',
    typedText: '+ something',
    expectedMarkdown: '- something',
    expectedTextContent: 'something',
  },
  {
    description: 'a plus without a following space',
    typedText: '+something',
    expectedMarkdown: '+something',
    expectedTextContent: '+something',
  },
  {
    description: 'a heading shortcut',
    typedText: '## heading',
    expectedMarkdown: '## heading',
    expectedTextContent: 'heading',
  },
  {
    description: 'a blockquote shortcut',
    typedText: '> quote',
    expectedMarkdown: '> quote',
    expectedTextContent: 'quote',
  },
];

function throwEditorError(error: unknown): never {
  throw error;
}

function prepareEditor(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      $getRoot().clear();
      $getRoot().append(paragraph);
      paragraph.select();
    },
    {discrete: true},
  );
}

function typeText(editor: LexicalEditor, typedText: string): void {
  for (const character of typedText) {
    editor.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throwEditorError(new Error('The typing characterization requires a range selection'));
        }
        selection.insertText(character);
      },
      {discrete: true},
    );
  }
}

describe('Wire Lexical Markdown shortcuts', () => {
  it.each(markdownShortcutCharacterizationTestCases)(
    'preserves the current typed behavior for $description',
    characterizationTestCase => {
      const harness = createWireLexicalEditorTestHarness();
      const unregisterMarkdownShortcuts = registerMarkdownShortcuts(harness.editor, markdownTransformers);

      try {
        prepareEditor(harness.editor);
        typeText(harness.editor, characterizationTestCase.typedText);

        const actualMarkdown = harness.exportMarkdown();
        const actualTextContent = harness.getTextContent();

        expect(actualMarkdown).toBe(characterizationTestCase.expectedMarkdown);
        expect(actualTextContent).toBe(characterizationTestCase.expectedTextContent);
      } finally {
        unregisterMarkdownShortcuts();
      }
    },
  );
});
