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
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  LexicalCommand,
  LexicalEditor,
} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render, type RenderResult} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../editorConfig';

import {$createMentionNode} from './MentionNode';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type MentionEditorTestFixture = {
  readonly editor: LexicalEditor;
  readonly editorElement: HTMLElement;
};

type KeyboardCommandResult = {
  readonly wasHandled: boolean;
  readonly defaultWasPrevented: boolean;
};

const EditorCapturePlugin: FunctionComponent<EditorCapturePluginProps> = props => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    props.onReady(editor);
  }, [editor, props.onReady]);

  return null;
};

function throwEditorError(error: unknown): never {
  throw error;
}

function renderMentionEditor(): Result<MentionEditorTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  const renderedMentionEditor: RenderResult = render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <RichTextPlugin
        contentEditable={<ContentEditable data-uie-name="mention-editor" />}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>,
  );

  const editorElement = renderedMentionEditor.getByTestId('mention-editor');
  const fixture = capturedEditor.map(editor => {
    return {editor, editorElement};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function setMentionContent(editor: LexicalEditor, cursorBeforeMention: boolean): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const textBeforeMention = $createTextNode('before ');
      const mentionNode = $createMentionNode('@', 'Alice');
      const textAfterMention = $createTextNode(' after');

      paragraphNode.append(textBeforeMention, mentionNode, textAfterMention);
      $getRoot().clear().append(paragraphNode);

      if (cursorBeforeMention) {
        textBeforeMention.selectEnd();
      } else {
        textAfterMention.select(0, 0);
      }
    },
    {discrete: true},
  );
}

function dispatchKeyboardCommand(
  editor: LexicalEditor,
  command: LexicalCommand<KeyboardEvent>,
  key: string,
): KeyboardCommandResult {
  const keyboardEvent = new KeyboardEvent('keydown', {cancelable: true, key});
  const wasHandled = editor.dispatchCommand(command, keyboardEvent);

  return {wasHandled, defaultWasPrevented: keyboardEvent.defaultPrevented};
}

async function selectMentionWithBackspace(fixture: MentionEditorTestFixture): Promise<KeyboardCommandResult> {
  await act(async () => {
    setMentionContent(fixture.editor, false);
    await Promise.resolve();
  });

  let commandResult: KeyboardCommandResult = {wasHandled: false, defaultWasPrevented: false};
  await act(async () => {
    commandResult = dispatchKeyboardCommand(fixture.editor, KEY_BACKSPACE_COMMAND, 'Backspace');
    await Promise.resolve();
  });

  return commandResult;
}

function getFocusedMentionElement(editorElement: HTMLElement): HTMLElement | null {
  return editorElement.querySelector('[data-uie-name="item-input-mention"].focused-mentions');
}

describe('Mention', () => {
  it('selects a mention when Backspace is pressed immediately after it', async () => {
    const fixture = unwrap(renderMentionEditor());

    const commandResult = await selectMentionWithBackspace(fixture);
    const focusedMentionElement = getFocusedMentionElement(fixture.editorElement);

    assertNotNull(focusedMentionElement);
    expect(commandResult).toEqual({wasHandled: true, defaultWasPrevented: true});
    expect(focusedMentionElement).toHaveTextContent('@Alice');
  });

  it('removes a selected mention when Backspace is pressed again', async () => {
    const fixture = unwrap(renderMentionEditor());

    await selectMentionWithBackspace(fixture);

    let commandResult: KeyboardCommandResult = {wasHandled: false, defaultWasPrevented: false};
    await act(async () => {
      commandResult = dispatchKeyboardCommand(fixture.editor, KEY_BACKSPACE_COMMAND, 'Backspace');
      await Promise.resolve();
    });

    expect(commandResult).toEqual({wasHandled: true, defaultWasPrevented: true});
    expect(
      fixture.editor.getEditorState().read(() => {
        return $getRoot().getTextContent();
      }),
    ).toBe('before  after');
    expect(getFocusedMentionElement(fixture.editorElement)).toBeNull();
  });

  it('selects and then removes a mention when Delete is pressed immediately before it', async () => {
    const fixture = unwrap(renderMentionEditor());

    await act(async () => {
      setMentionContent(fixture.editor, true);
      await Promise.resolve();
    });

    let selectionResult: KeyboardCommandResult = {wasHandled: false, defaultWasPrevented: false};
    await act(async () => {
      selectionResult = dispatchKeyboardCommand(fixture.editor, KEY_DELETE_COMMAND, 'Delete');
      await Promise.resolve();
    });

    let deletionResult: KeyboardCommandResult = {wasHandled: false, defaultWasPrevented: false};
    await act(async () => {
      deletionResult = dispatchKeyboardCommand(fixture.editor, KEY_DELETE_COMMAND, 'Delete');
      await Promise.resolve();
    });

    expect(selectionResult).toEqual({wasHandled: true, defaultWasPrevented: true});
    expect(deletionResult).toEqual({wasHandled: true, defaultWasPrevented: true});
    expect(
      fixture.editor.getEditorState().read(() => {
        return $getRoot().getTextContent();
      }),
    ).toBe('before  after');
    expect(getFocusedMentionElement(fixture.editorElement)).toBeNull();
  });

  it.each([
    {description: 'ArrowLeft', command: KEY_ARROW_LEFT_COMMAND, key: 'ArrowLeft'},
    {description: 'ArrowRight', command: KEY_ARROW_RIGHT_COMMAND, key: 'ArrowRight'},
  ])('moves the selection away from a selected mention with $description', async testCase => {
    const fixture = unwrap(renderMentionEditor());

    await selectMentionWithBackspace(fixture);

    let commandResult: KeyboardCommandResult = {wasHandled: false, defaultWasPrevented: false};
    await act(async () => {
      commandResult = dispatchKeyboardCommand(fixture.editor, testCase.command, testCase.key);
      await Promise.resolve();
    });

    const hasRangeSelection = fixture.editor.getEditorState().read(() => {
      return $isRangeSelection($getSelection());
    });

    expect(commandResult).toEqual({wasHandled: true, defaultWasPrevented: true});
    expect(hasRangeSelection).toBe(true);
    expect(getFocusedMentionElement(fixture.editorElement)).toBeNull();
  });
});
