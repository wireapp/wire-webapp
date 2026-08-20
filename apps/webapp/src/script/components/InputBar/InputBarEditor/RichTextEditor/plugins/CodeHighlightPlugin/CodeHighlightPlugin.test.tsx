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

import {CodeHighlightNode, $createCodeNode, $isCodeHighlightNode} from '@lexical/code';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createTextNode, $getRoot, $nodesOfType, LexicalEditor} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {CodeHighlightPlugin} from './CodeHighlightPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type CodeHighlightPluginTestFixture = {
  readonly editor: LexicalEditor;
};

type CodeHighlightToken = {
  readonly text: string;
  readonly highlightType: string | null | undefined;
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

function renderCodeHighlightPlugin(): Result<CodeHighlightPluginTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <CodeHighlightPlugin />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function setJavaScriptCode(editor: LexicalEditor): void {
  editor.update(
    () => {
      const codeNode = $createCodeNode('javascript');
      codeNode.append($createTextNode('const greeting = "hello";'));
      $getRoot().clear().append(codeNode);
      codeNode.selectEnd();
    },
    {discrete: true},
  );
}

function getCodeHighlightTokens(editor: LexicalEditor): CodeHighlightToken[] {
  return editor.getEditorState().read(() => {
    return $nodesOfType(CodeHighlightNode)
      .filter($isCodeHighlightNode)
      .map(codeHighlightNode => {
        return {
          text: codeHighlightNode.getTextContent(),
          highlightType: codeHighlightNode.getHighlightType(),
        };
      });
  });
}

describe('CodeHighlightPlugin', () => {
  it('tokenizes JavaScript code while preserving its text content', () => {
    const fixture = unwrap(renderCodeHighlightPlugin());

    act(() => {
      setJavaScriptCode(fixture.editor);
    });

    expect(
      fixture.editor.getEditorState().read(() => {
        return $getRoot().getTextContent();
      }),
    ).toBe('const greeting = "hello";');
    expect(getCodeHighlightTokens(fixture.editor)).toEqual([
      {text: 'const', highlightType: 'keyword'},
      {text: ' greeting ', highlightType: undefined},
      {text: '=', highlightType: 'operator'},
      {text: ' ', highlightType: undefined},
      {text: '"hello"', highlightType: 'string'},
      {text: ';', highlightType: 'punctuation'},
    ]);
  });
});
