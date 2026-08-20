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

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  registerList,
} from '@lexical/list';
import {registerRichText} from '@lexical/rich-text';
import {$getRoot, $isElementNode, $isTextNode, KEY_ENTER_COMMAND, LexicalEditor} from 'lexical';

import {
  createWireLexicalEditorTestHarness,
  WireLexicalEditorTestHarness,
} from '../../testSupport/createWireLexicalEditorTestHarness';

type ListCommandCharacterizationTestCase = {
  readonly description: string;
  readonly command: typeof INSERT_ORDERED_LIST_COMMAND | typeof INSERT_UNORDERED_LIST_COMMAND;
  readonly expectedMarkdown: string;
};

const listCommandCharacterizationTestCases: readonly ListCommandCharacterizationTestCase[] = [
  {
    description: 'inserting an ordered list',
    command: INSERT_ORDERED_LIST_COMMAND,
    expectedMarkdown: '1. item',
  },
  {
    description: 'inserting an unordered list',
    command: INSERT_UNORDERED_LIST_COMMAND,
    expectedMarkdown: '- item',
  },
];

function selectEndOfFirstDocumentElement(editor: LexicalEditor): void {
  editor.update(
    () => {
      const firstDocumentElement = $getRoot().getFirstChild();
      if (firstDocumentElement === null || !$isElementNode(firstDocumentElement)) {
        throw new Error('The list command characterization requires a document element');
      }
      const lastTextNode = firstDocumentElement.getLastDescendant();
      if (lastTextNode === null || !$isTextNode(lastTextNode)) {
        throw new Error('The list command characterization requires a text node');
      }
      lastTextNode.selectEnd();
    },
    {discrete: true},
  );
}

type RegisteredListTestFunction = (harness: WireLexicalEditorTestHarness) => void;

function withRegisteredList(
  inputMarkdown: string,
  testFunction: RegisteredListTestFunction,
): RegisteredListTestFunction {
  return () => {
    const harness = createWireLexicalEditorTestHarness();
    harness.importMarkdown(inputMarkdown);
    selectEndOfFirstDocumentElement(harness.editor);

    const unregisterList = registerList(harness.editor);

    try {
      testFunction(harness);
    } finally {
      unregisterList();
    }
  };
}

describe('Wire Lexical list commands', () => {
  for (const characterizationTestCase of listCommandCharacterizationTestCases) {
    it(
      `preserves the current behavior for ${characterizationTestCase.description}`,
      withRegisteredList('item', harness => {
        let wasHandled = false;
        harness.editor.update(
          () => {
            wasHandled = harness.editor.dispatchCommand(characterizationTestCase.command, undefined);
          },
          {discrete: true},
        );

        expect(wasHandled).toBe(true);
        expect(harness.exportMarkdown()).toBe(characterizationTestCase.expectedMarkdown);
      }),
    );
  }

  it(
    'removes an existing unordered list',
    withRegisteredList('- item', harness => {
      let wasHandled = false;
      harness.editor.update(
        () => {
          wasHandled = harness.editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        },
        {discrete: true},
      );

      expect(wasHandled).toBe(true);
      expect(harness.exportMarkdown()).toBe('item');
    }),
  );

  it(
    'creates a new list item when Enter is pressed at the end of an item',
    withRegisteredList('- first', harness => {
      registerRichText(harness.editor);

      const enterEvent = new KeyboardEvent('keydown', {cancelable: true});
      let wasHandled = false;

      harness.editor.update(
        () => {
          wasHandled = harness.editor.dispatchCommand(KEY_ENTER_COMMAND, enterEvent);
        },
        {discrete: true},
      );

      expect(wasHandled).toBe(true);
      expect(enterEvent.defaultPrevented).toBe(true);
      expect(harness.exportMarkdown()).toBe('- first\n- ');
    }),
  );
});
