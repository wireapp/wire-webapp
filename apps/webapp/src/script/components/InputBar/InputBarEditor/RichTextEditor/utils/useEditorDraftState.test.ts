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

import {$createMentionNode} from '../nodes/MentionNode';
import {EmojiNode} from '../nodes/EmojiNode';
import {$createParagraphNode, $createTextNode, $getRoot, LexicalEditor} from 'lexical';

import {act, renderHook} from '@testing-library/react';

import {
  createWireLexicalEditorTestHarness,
  WireLexicalEditorTestHarness,
} from '../testSupport/createWireLexicalEditorTestHarness';
import {useEditorDraftState} from './useEditorDraftState';

type SaveDraftState = (editorState: string, plainMessage: string, replyId?: string) => void;

type DraftStateCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly replaceEmojis: boolean;
  readonly expectedPlainMessage: string;
};

type DraftStateTestFunction = () => void;

type DraftStateCharacterizationTestFunction = (testCase: DraftStateCharacterizationTestCase) => void;

type DraftStateHookOptions = {
  readonly editor: LexicalEditor | null;
  readonly replaceEmojis: boolean;
  readonly disableMessagePreprocessing: boolean;
  readonly saveDraftState: SaveDraftState;
};

type DraftStateHookRenderResult = {
  readonly result: {
    readonly current: ReturnType<typeof useEditorDraftState>;
  };
  readonly unmount: () => void;
};

const draftStateCharacterizationTestCases: readonly DraftStateCharacterizationTestCase[] = [
  {
    description: 'plain text',
    inputMarkdown: 'draft message',
    replaceEmojis: false,
    expectedPlainMessage: 'draft message',
  },
  {
    description: 'formatted text in a list and a link',
    inputMarkdown: '**bold**\n\n- item\n- [link](https://wire.com)',
    replaceEmojis: false,
    expectedPlainMessage: '**bold**\n\n- item\n- [link](https://wire.com)',
  },
  {
    description: 'an emoticon with emoji replacement enabled',
    inputMarkdown: 'hello :)',
    replaceEmojis: true,
    expectedPlainMessage: 'hello 🙂',
  },
];

function executeWithFakeTimers(testFunction: DraftStateTestFunction): void {
  jest.useFakeTimers();

  try {
    testFunction();
  } finally {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  }
}

function withFakeTimers(testFunction: DraftStateTestFunction): DraftStateTestFunction {
  return () => {
    executeWithFakeTimers(testFunction);
  };
}

function withFakeTimersForCharacterizationTest(
  testFunction: DraftStateCharacterizationTestFunction,
): DraftStateCharacterizationTestFunction {
  return function (testCase: DraftStateCharacterizationTestCase): void {
    executeWithFakeTimers(() => {
      testFunction(testCase);
    });
  };
}

function renderDraftStateHook(draftStateHookOptions: DraftStateHookOptions): DraftStateHookRenderResult {
  const editorRef = {current: draftStateHookOptions.editor};
  const renderedHook = renderHook(() => {
    return useEditorDraftState({
      editorRef,
      saveDraftState: draftStateHookOptions.saveDraftState,
      replaceEmojis: draftStateHookOptions.replaceEmojis,
      disableMessagePreprocessing: draftStateHookOptions.disableMessagePreprocessing,
    });
  });

  return {result: renderedHook.result, unmount: renderedHook.unmount};
}

function importMarkdown(harness: WireLexicalEditorTestHarness, markdown: string): void {
  harness.importMarkdown(markdown);
}

function appendMentionContent(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createTextNode('Hello '), $createMentionNode('@', 'Alice'), $createTextNode('!'));
      $getRoot().clear().append(paragraphNode);
    },
    {discrete: true},
  );
}

function appendEmojiContent(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append(new EmojiNode('🧪'));
      $getRoot().clear().append(paragraphNode);
    },
    {discrete: true},
  );
}

describe('useEditorDraftState', () => {
  it.each(draftStateCharacterizationTestCases)(
    'saves the serialized editor and transformed plain message for $description',
    withFakeTimersForCharacterizationTest(testCase => {
      const harness = createWireLexicalEditorTestHarness();
      importMarkdown(harness, testCase.inputMarkdown);
      const saveDraftState = jest.fn<void, Parameters<SaveDraftState>>();
      const renderedHook = renderDraftStateHook({
        editor: harness.editor,
        replaceEmojis: testCase.replaceEmojis,
        disableMessagePreprocessing: false,
        saveDraftState,
      });

      act(() => {
        renderedHook.result.current.saveDraft();
      });

      expect(saveDraftState).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(799);
      });

      expect(saveDraftState).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(saveDraftState).toHaveBeenCalledWith(
        JSON.stringify(harness.editor.getEditorState().toJSON()),
        testCase.expectedPlainMessage,
        undefined,
      );

      renderedHook.unmount();
    }),
  );

  it(
    'saves raw editor text and an empty Markdown value when preprocessing is disabled',
    withFakeTimers(() => {
      const harness = createWireLexicalEditorTestHarness();
      importMarkdown(harness, 'first line\nsecond line');
      const saveDraftState = jest.fn<void, Parameters<SaveDraftState>>();
      const renderedHook = renderDraftStateHook({
        editor: harness.editor,
        replaceEmojis: false,
        disableMessagePreprocessing: true,
        saveDraftState,
      });

      act(() => {
        renderedHook.result.current.saveDraft();
        jest.advanceTimersByTime(800);
      });

      expect(saveDraftState).toHaveBeenCalledWith(
        JSON.stringify(harness.editor.getEditorState().toJSON()),
        'first line\nsecond line',
        undefined,
      );

      renderedHook.unmount();
    }),
  );

  it(
    'saves the display text of a custom mention node',
    withFakeTimers(() => {
      const harness = createWireLexicalEditorTestHarness();
      appendMentionContent(harness.editor);
      const saveDraftState = jest.fn<void, Parameters<SaveDraftState>>();
      const renderedHook = renderDraftStateHook({
        editor: harness.editor,
        replaceEmojis: false,
        disableMessagePreprocessing: false,
        saveDraftState,
      });

      act(() => {
        renderedHook.result.current.saveDraft();
        jest.advanceTimersByTime(800);
      });

      expect(saveDraftState).toHaveBeenCalledWith(
        JSON.stringify(harness.editor.getEditorState().toJSON()),
        'Hello @Alice!',
        undefined,
      );

      renderedHook.unmount();
    }),
  );

  it(
    'saves the display text and serialized state of a custom emoji node',
    withFakeTimers(() => {
      const harness = createWireLexicalEditorTestHarness();
      appendEmojiContent(harness.editor);
      const saveDraftState = jest.fn<void, Parameters<SaveDraftState>>();
      const renderedHook = renderDraftStateHook({
        editor: harness.editor,
        replaceEmojis: false,
        disableMessagePreprocessing: false,
        saveDraftState,
      });

      act(() => {
        renderedHook.result.current.saveDraft();
        jest.advanceTimersByTime(800);
      });

      expect(saveDraftState).toHaveBeenCalledWith(expect.stringContaining('"type":"emoji"'), '🧪', undefined);

      renderedHook.unmount();
    }),
  );

  it(
    'flushes a pending save when the hook unmounts',
    withFakeTimers(() => {
      const harness = createWireLexicalEditorTestHarness();
      importMarkdown(harness, 'pending draft');
      const saveDraftState = jest.fn<void, Parameters<SaveDraftState>>();
      const renderedHook = renderDraftStateHook({
        editor: harness.editor,
        replaceEmojis: false,
        disableMessagePreprocessing: false,
        saveDraftState,
      });

      act(() => {
        renderedHook.result.current.saveDraft();
      });

      expect(saveDraftState).not.toHaveBeenCalled();

      renderedHook.unmount();

      expect(saveDraftState).toHaveBeenCalledWith(
        JSON.stringify(harness.editor.getEditorState().toJSON()),
        'pending draft',
        undefined,
      );
    }),
  );

  it(
    'does not save when the editor reference is empty',
    withFakeTimers(() => {
      const saveDraftState = jest.fn<void, Parameters<SaveDraftState>>();
      const renderedHook = renderDraftStateHook({
        editor: null,
        replaceEmojis: false,
        disableMessagePreprocessing: false,
        saveDraftState,
      });

      act(() => {
        renderedHook.result.current.saveDraft();
        jest.advanceTimersByTime(800);
      });

      expect(saveDraftState).not.toHaveBeenCalled();

      renderedHook.unmount();
    }),
  );
});
