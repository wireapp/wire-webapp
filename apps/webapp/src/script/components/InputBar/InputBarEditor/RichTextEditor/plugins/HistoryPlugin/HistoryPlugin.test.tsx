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

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $nodesOfType,
  LexicalEditor,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {$createMentionNode, MentionNode} from '../../nodes/MentionNode';
import {HistoryPlugin} from './HistoryPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type HistoryPluginTestFixture = {
  readonly editor: LexicalEditor;
};

type HistoryTestFunction = () => void;

const EditorCapturePlugin: FunctionComponent<EditorCapturePluginProps> = props => {
  const {onReady} = props;
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
};

function throwEditorError(error: unknown): never {
  throw error;
}

function withFakeTimers(testFunction: HistoryTestFunction): HistoryTestFunction {
  return function (): void {
    jest.useFakeTimers();

    try {
      testFunction();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  };
}

function renderHistoryPlugin(): Result<HistoryPluginTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <HistoryPlugin />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function setEditorText(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createTextNode(text));
      $getRoot().clear().append(paragraphNode);
    },
    {discrete: true},
  );
}

function getTextContent(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $getRoot().getTextContent();
  });
}

function setEditorMention(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createTextNode('hello '), $createMentionNode('@', 'Alice'));
      $getRoot().clear().append(paragraphNode);
    },
    {discrete: true},
  );
}

function getMentionNodeCount(editor: LexicalEditor): number {
  return editor.getEditorState().read(() => {
    return $nodesOfType(MentionNode).length;
  });
}

function advancePastHistoryMergeWindow(): void {
  act(() => {
    jest.advanceTimersByTime(301);
  });
}

function dispatchHistoryCommand(editor: LexicalEditor, command: typeof UNDO_COMMAND | typeof REDO_COMMAND): boolean {
  let wasHandled = false;

  editor.update(
    () => {
      wasHandled = editor.dispatchCommand(command, undefined);
    },
    {discrete: true},
  );

  return wasHandled;
}

describe('HistoryPlugin', () => {
  it(
    'undoes and redoes editor changes after the history merge window',
    withFakeTimers(() => {
      const fixture = unwrap(renderHistoryPlugin());
      setEditorText(fixture.editor, 'first');
      advancePastHistoryMergeWindow();
      setEditorText(fixture.editor, 'second');
      advancePastHistoryMergeWindow();

      expect(dispatchHistoryCommand(fixture.editor, UNDO_COMMAND)).toBe(true);
      expect(getTextContent(fixture.editor)).toBe('first');

      expect(dispatchHistoryCommand(fixture.editor, REDO_COMMAND)).toBe(true);
      expect(getTextContent(fixture.editor)).toBe('second');
    }),
  );

  it(
    'returns the immediately preceding state after changes inside the history merge window',
    withFakeTimers(() => {
      const fixture = unwrap(renderHistoryPlugin());
      setEditorText(fixture.editor, 'first');
      jest.advanceTimersByTime(100);
      setEditorText(fixture.editor, 'second');
      jest.advanceTimersByTime(100);
      setEditorText(fixture.editor, 'third');
      advancePastHistoryMergeWindow();

      expect(dispatchHistoryCommand(fixture.editor, UNDO_COMMAND)).toBe(true);
      expect(getTextContent(fixture.editor)).toBe('second');

      expect(dispatchHistoryCommand(fixture.editor, REDO_COMMAND)).toBe(true);
      expect(getTextContent(fixture.editor)).toBe('third');
    }),
  );

  it(
    'handles undo when the history is empty without changing the editor',
    withFakeTimers(() => {
      const fixture = unwrap(renderHistoryPlugin());

      expect(dispatchHistoryCommand(fixture.editor, UNDO_COMMAND)).toBe(true);
      expect(getTextContent(fixture.editor)).toBe('');
    }),
  );

  it(
    'restores custom mention nodes through undo and redo',
    withFakeTimers(() => {
      const fixture = unwrap(renderHistoryPlugin());
      setEditorMention(fixture.editor);
      advancePastHistoryMergeWindow();
      setEditorText(fixture.editor, 'plain text');
      advancePastHistoryMergeWindow();

      expect(dispatchHistoryCommand(fixture.editor, UNDO_COMMAND)).toBe(true);
      expect(getTextContent(fixture.editor)).toBe('hello @Alice');
      expect(getMentionNodeCount(fixture.editor)).toBe(1);

      expect(dispatchHistoryCommand(fixture.editor, REDO_COMMAND)).toBe(true);
      expect(getTextContent(fixture.editor)).toBe('plain text');
      expect(getMentionNodeCount(fixture.editor)).toBe(0);
    }),
  );
});
