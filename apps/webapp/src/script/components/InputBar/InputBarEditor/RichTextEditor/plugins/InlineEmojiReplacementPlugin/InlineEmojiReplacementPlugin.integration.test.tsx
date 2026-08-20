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
import {$createParagraphNode, $createTextNode, $getRoot, KEY_SPACE_COMMAND, LexicalEditor} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {ReplaceEmojiPlugin} from './InlineEmojiReplacementPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type InlineEmojiReplacementPluginTestFixture = {
  readonly editor: LexicalEditor;
};

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

function renderReplaceEmojiPlugin(): Result<InlineEmojiReplacementPluginTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <ReplaceEmojiPlugin />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function setParagraphsAndSelectEnd(editor: LexicalEditor, paragraphs: readonly string[]): void {
  editor.update(
    () => {
      const paragraphNodes = paragraphs.map(paragraph => {
        const paragraphNode = $createParagraphNode();
        paragraphNode.append($createTextNode(paragraph));

        return paragraphNode;
      });

      $getRoot()
        .clear()
        .append(...paragraphNodes);
      paragraphNodes.at(-1)?.selectEnd();
    },
    {discrete: true},
  );
}

function dispatchSpaceCommand(editor: LexicalEditor): boolean {
  let wasHandled = false;

  editor.update(
    () => {
      wasHandled = editor.dispatchCommand(KEY_SPACE_COMMAND, new KeyboardEvent('keydown', {key: ' '}));
    },
    {discrete: true},
  );

  return wasHandled;
}

function getParagraphTexts(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() => {
    return $getRoot()
      .getChildren()
      .map(paragraphNode => {
        return paragraphNode.getTextContent();
      });
  });
}

describe('ReplaceEmojiPlugin', () => {
  it('keeps an emoticon unchanged until the space command is dispatched', () => {
    const fixture = unwrap(renderReplaceEmojiPlugin());

    act(() => {
      setParagraphsAndSelectEnd(fixture.editor, ['hello :) ']);
    });

    expect(getParagraphTexts(fixture.editor)).toEqual(['hello :) ']);
  });

  it('replaces an emoticon in the selected text node after a space command', () => {
    const fixture = unwrap(renderReplaceEmojiPlugin());

    act(() => {
      setParagraphsAndSelectEnd(fixture.editor, ['hello :) ']);
    });

    const wasHandled = dispatchSpaceCommand(fixture.editor);

    expect(wasHandled).toBe(false);
    expect(getParagraphTexts(fixture.editor)).toEqual(['hello 🙂 ']);
  });

  it('replaces an emoticon only in the selected text node', () => {
    const fixture = unwrap(renderReplaceEmojiPlugin());

    act(() => {
      setParagraphsAndSelectEnd(fixture.editor, ['first :) ', 'second :D ']);
    });

    dispatchSpaceCommand(fixture.editor);

    expect(getParagraphTexts(fixture.editor)).toEqual(['first :) ', 'second 😄 ']);
  });
});
