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

import {registerRichText} from '@lexical/rich-text';
import {
  FORMAT_TEXT_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  LexicalEditor,
  TextFormatType,
} from 'lexical';

import {
  createWireLexicalEditorTestHarness,
  WireLexicalEditorTestHarness,
} from '../testSupport/createWireLexicalEditorTestHarness';

type InlineFormat = Extract<TextFormatType, 'bold' | 'italic' | 'strikethrough' | 'code'>;

type InlineFormatCharacterizationTestCase = {
  readonly description: string;
  readonly format: InlineFormat;
  readonly expectedMarkdown: string;
};

type RegisteredRichTextTestFunction = (harness: WireLexicalEditorTestHarness) => void;
type InlineFormatTestFunction = () => void;

const inlineFormatCharacterizationTestCases: readonly InlineFormatCharacterizationTestCase[] = [
  {
    description: 'bold text',
    format: 'bold',
    expectedMarkdown: '**formatted text**',
  },
  {
    description: 'italic text',
    format: 'italic',
    expectedMarkdown: '*formatted text*',
  },
  {
    description: 'strikethrough text',
    format: 'strikethrough',
    expectedMarkdown: '~~formatted text~~',
  },
  {
    description: 'inline code text',
    format: 'code',
    expectedMarkdown: '`formatted text`',
  },
];

function setSelectedText(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode(text);
      paragraphNode.append(textNode);
      $getRoot().clear().append(paragraphNode);
      textNode.select(0, text.length);
    },
    {discrete: true},
  );
}

function dispatchFormatCommand(editor: LexicalEditor, format: InlineFormat): boolean {
  let wasHandled = false;

  editor.update(
    () => {
      wasHandled = editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    {discrete: true},
  );

  return wasHandled;
}

function withRegisteredRichText(testFunction: RegisteredRichTextTestFunction): InlineFormatTestFunction {
  return () => {
    const harness = createWireLexicalEditorTestHarness();
    const unregisterRichText = registerRichText(harness.editor);

    try {
      testFunction(harness);
    } finally {
      unregisterRichText();
    }
  };
}

describe('Wire Lexical inline format commands', () => {
  for (const characterizationTestCase of inlineFormatCharacterizationTestCases) {
    it(
      `formats and unformats ${characterizationTestCase.description}`,
      withRegisteredRichText(harness => {
        setSelectedText(harness.editor, 'formatted text');

        expect(dispatchFormatCommand(harness.editor, characterizationTestCase.format)).toBe(true);
        expect(harness.exportMarkdown()).toBe(characterizationTestCase.expectedMarkdown);

        expect(dispatchFormatCommand(harness.editor, characterizationTestCase.format)).toBe(true);
        expect(harness.exportMarkdown()).toBe('formatted text');
      }),
    );
  }

  it(
    'exports combined bold and italic formatting using the current Markdown representation',
    withRegisteredRichText(harness => {
      setSelectedText(harness.editor, 'formatted text');

      expect(dispatchFormatCommand(harness.editor, 'bold')).toBe(true);
      expect(dispatchFormatCommand(harness.editor, 'italic')).toBe(true);

      expect(harness.exportMarkdown()).toBe('***formatted text***');
    }),
  );
});
