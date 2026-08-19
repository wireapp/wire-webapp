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

import {$getRoot, KEY_TAB_COMMAND} from 'lexical';
import {registerList} from '@lexical/list';

import {createWireLexicalEditorTestHarness} from '../../testSupport/createWireLexicalEditorTestHarness';

import {registerListItemTabIndentation} from './ListIndentationPlugin';

type ListIndentationCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly isShiftPressed: boolean;
  readonly expectedWasHandled: boolean;
  readonly expectedDefaultPrevented: boolean;
  readonly expectedMarkdown: string;
};

const listIndentationCharacterizationTestCases: readonly ListIndentationCharacterizationTestCase[] = [
  {
    description: 'indents the last item with Tab',
    inputMarkdown: '- first\n- second',
    isShiftPressed: false,
    expectedWasHandled: false,
    expectedDefaultPrevented: true,
    expectedMarkdown: '- first\n- second',
  },
  {
    description: 'outdents the nested item with Shift+Tab',
    inputMarkdown: '- first\n  - second',
    isShiftPressed: true,
    expectedWasHandled: false,
    expectedDefaultPrevented: true,
    expectedMarkdown: '- first\n- second',
  },
];

function createTabEvent(isShiftPressed: boolean): KeyboardEvent {
  return new KeyboardEvent('keydown', {cancelable: true, shiftKey: isShiftPressed});
}

describe('ListIndentationPlugin', () => {
  it.each(listIndentationCharacterizationTestCases)(
    'preserves the current command behavior for $description',
    characterizationTestCase => {
      const harness = createWireLexicalEditorTestHarness();
      harness.importMarkdown(characterizationTestCase.inputMarkdown);

      harness.editor.update(
        () => {
          $getRoot().selectEnd();
        },
        {discrete: true},
      );

      const unregisterList = registerList(harness.editor);
      const unregisterListItemTabIndentation = registerListItemTabIndentation(harness.editor);
      const tabEvent = createTabEvent(characterizationTestCase.isShiftPressed);
      const actualWasHandled = harness.editor.dispatchCommand(KEY_TAB_COMMAND, tabEvent);
      const actualMarkdown = harness.exportMarkdown();
      const expectedWasHandled = characterizationTestCase.expectedWasHandled;
      const expectedDefaultPrevented = characterizationTestCase.expectedDefaultPrevented;
      const expectedMarkdown = characterizationTestCase.expectedMarkdown;

      unregisterList();
      unregisterListItemTabIndentation();

      expect(actualWasHandled).toBe(expectedWasHandled);
      expect(tabEvent.defaultPrevented).toBe(expectedDefaultPrevented);
      expect(actualMarkdown).toBe(expectedMarkdown);
    },
  );

  it('does not handle Tab when the selection is in an ordinary paragraph', () => {
    const harness = createWireLexicalEditorTestHarness();
    harness.importMarkdown('ordinary text');
    harness.editor.update(
      () => {
        $getRoot().selectEnd();
      },
      {discrete: true},
    );

    const unregisterList = registerList(harness.editor);
    const unregisterListItemTabIndentation = registerListItemTabIndentation(harness.editor);
    const tabEvent = createTabEvent(false);
    const actualWasHandled = harness.editor.dispatchCommand(KEY_TAB_COMMAND, tabEvent);
    const expectedWasHandled = false;

    unregisterList();
    unregisterListItemTabIndentation();

    expect(actualWasHandled).toBe(expectedWasHandled);
    expect(tabEvent.defaultPrevented).toBe(false);
    expect(harness.exportMarkdown()).toBe('ordinary text');
  });
});
