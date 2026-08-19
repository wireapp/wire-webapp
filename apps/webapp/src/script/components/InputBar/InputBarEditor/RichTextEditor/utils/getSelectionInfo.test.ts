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

import {assertNotNull} from '@sindresorhus/is';
import {$createParagraphNode, $createTextNode, $getRoot, LexicalEditor} from 'lexical';

import {createWireLexicalEditorTestHarness, WireLexicalEditorTestHarness} from '../testSupport/createWireLexicalEditorTestHarness';

import {getSelectionInfo} from './getSelectionInfo';

type TextSelectionOptions = {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
};

type SelectionInfoTestCase = {
  readonly description: string;
  readonly text: string;
  readonly cursorOffset: number;
  readonly expectedWordCharBeforeCursor: boolean;
  readonly expectedWordCharAfterCursor: boolean;
  readonly expectedCursorAtStartOfNode: boolean;
  readonly expectedCursorAtEndOfNode: boolean;
};

type SelectionSiblingTextContents = {
  readonly previousText: string | undefined;
  readonly nextText: string | undefined;
};

const selectionInfoTestCases: readonly SelectionInfoTestCase[] = [
  {
    description: 'a word after a mention trigger',
    text: '@Alice',
    cursorOffset: 6,
    expectedWordCharBeforeCursor: true,
    expectedWordCharAfterCursor: false,
    expectedCursorAtStartOfNode: false,
    expectedCursorAtEndOfNode: true,
  },
  {
    description: 'a mention trigger immediately before a space',
    text: '@ Alice',
    cursorOffset: 1,
    expectedWordCharBeforeCursor: false,
    expectedWordCharAfterCursor: false,
    expectedCursorAtStartOfNode: false,
    expectedCursorAtEndOfNode: false,
  },
  {
    description: 'a mention trigger embedded after ordinary text',
    text: 'name@example',
    cursorOffset: 5,
    expectedWordCharBeforeCursor: false,
    expectedWordCharAfterCursor: true,
    expectedCursorAtStartOfNode: false,
    expectedCursorAtEndOfNode: false,
  },
  {
    description: 'the start of ordinary text',
    text: 'Alice',
    cursorOffset: 0,
    expectedWordCharBeforeCursor: false,
    expectedWordCharAfterCursor: true,
    expectedCursorAtStartOfNode: true,
    expectedCursorAtEndOfNode: false,
  },
  {
    description: 'punctuation at the end of text',
    text: 'Alice!',
    cursorOffset: 6,
    expectedWordCharBeforeCursor: false,
    expectedWordCharAfterCursor: false,
    expectedCursorAtStartOfNode: false,
    expectedCursorAtEndOfNode: true,
  },
];

function setTextSelection(editor: LexicalEditor, textSelectionOptions: TextSelectionOptions): void {
  const {text, startOffset, endOffset} = textSelectionOptions;

  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode(text);
      paragraphNode.append(textNode);
      $getRoot().clear().append(paragraphNode);
      textNode.select(startOffset, endOffset);
    },
    {discrete: true},
  );
}

function readSelectionInfo(editor: LexicalEditor): ReturnType<typeof getSelectionInfo> {
  return editor.getEditorState().read(() => getSelectionInfo(['@']));
}

function readSelectionSiblingTextContents(editor: LexicalEditor): SelectionSiblingTextContents {
  return editor.getEditorState().read(() => {
    const selectionInfo = getSelectionInfo(['@']);
    assertNotNull(selectionInfo);

    return {
      previousText: selectionInfo.prevNode?.getTextContent(),
      nextText: selectionInfo.nextNode?.getTextContent(),
    };
  });
}

function setTextSelectionWithSiblings(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const textBeforeSelection = $createTextNode('before');
      const selectedText = $createTextNode('@Alice');
      const textAfterSelection = $createTextNode('after');
      selectedText.setFormat('bold');
      paragraphNode.append(textBeforeSelection, selectedText, textAfterSelection);
      $getRoot().clear().append(paragraphNode);
      selectedText.select(3, 3);
    },
    {discrete: true},
  );
}

describe('getSelectionInfo', () => {
  it.each(selectionInfoTestCases)('characterizes $description', testCase => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    setTextSelection(harness.editor, {
      text: testCase.text,
      startOffset: testCase.cursorOffset,
      endOffset: testCase.cursorOffset,
    });

    const actualSelectionInfo = readSelectionInfo(harness.editor);
    assertNotNull(actualSelectionInfo);

    expect(actualSelectionInfo.textContent).toBe(testCase.text);
    expect(actualSelectionInfo.offset).toBe(testCase.cursorOffset);
    expect(actualSelectionInfo.isTextNode).toBe(true);
    expect(actualSelectionInfo.wordCharBeforeCursor).toBe(testCase.expectedWordCharBeforeCursor);
    expect(actualSelectionInfo.wordCharAfterCursor).toBe(testCase.expectedWordCharAfterCursor);
    expect(actualSelectionInfo.cursorAtStartOfNode).toBe(testCase.expectedCursorAtStartOfNode);
    expect(actualSelectionInfo.cursorAtEndOfNode).toBe(testCase.expectedCursorAtEndOfNode);
  });

  it('returns adjacent lexical siblings for a collapsed text selection', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    setTextSelectionWithSiblings(harness.editor);

    const actualSelectionSiblingTextContents = readSelectionSiblingTextContents(harness.editor);

    expect(actualSelectionSiblingTextContents.previousText).toBe('before');
    expect(actualSelectionSiblingTextContents.nextText).toBe('after');
  });

  it('returns undefined for a non-collapsed text selection', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    setTextSelection(harness.editor, {text: 'Alice', startOffset: 0, endOffset: 3});

    const actualSelectionInfo = readSelectionInfo(harness.editor);

    expect(actualSelectionInfo).toBeUndefined();
  });

  it('projects a paragraph element selection onto its first text node', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    harness.editor.update(
      () => {
        const paragraphNode = $createParagraphNode();
        const textNode = $createTextNode('Alice');
        paragraphNode.append(textNode);
        $getRoot().clear().append(paragraphNode);
        paragraphNode.select();
      },
      {discrete: true},
    );

    const actualSelectionInfo = readSelectionInfo(harness.editor);
    assertNotNull(actualSelectionInfo);

    expect(actualSelectionInfo.textContent).toBe('Alice');
    expect(actualSelectionInfo.offset).toBe(0);
    expect(actualSelectionInfo.isTextNode).toBe(true);
    expect(actualSelectionInfo.selection.anchor.type).toBe('element');
  });
});
