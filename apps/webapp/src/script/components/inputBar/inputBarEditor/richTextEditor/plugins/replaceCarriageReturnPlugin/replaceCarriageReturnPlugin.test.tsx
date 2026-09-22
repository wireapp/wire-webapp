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

import {useEffect, type FunctionComponent} from 'react';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $createTextNode, $getRoot, LexicalEditor, PASTE_COMMAND} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';

import {render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {ReplaceCarriageReturnPlugin} from './replaceCarriageReturnPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type CarriageReturnTestCase = {
  readonly description: string;
  readonly inputText: string;
  readonly expectedText: string;
};

const carriageReturnTestCases: readonly CarriageReturnTestCase[] = [
  {
    description: 'CRLF line endings',
    inputText: 'first\r\nsecond',
    expectedText: 'first\nsecond',
  },
  {
    description: 'standalone carriage returns',
    inputText: 'first\rsecond',
    expectedText: 'first\nsecond',
  },
  {
    description: 'LF line endings',
    inputText: 'first\nsecond',
    expectedText: 'first\nsecond',
  },
  {
    description: 'mixed line endings',
    inputText: 'first\r\nsecond\rthird\nfourth',
    expectedText: 'first\nsecond\nthird\nfourth',
  },
];

function throwEditorError(error: Error): never {
  throw error;
}

const EditorCapturePlugin: FunctionComponent<EditorCapturePluginProps> = props => {
  const {onReady} = props;
  const [editor] = useLexicalComposerContext();

  useEffect(
    function (): void {
      onReady(editor);
    },
    [editor, onReady],
  );

  return null;
};

function renderReplaceCarriageReturnPlugin(): Result<LexicalEditor, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{namespace: 'ReplaceCarriageReturnPluginTest', onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <ReplaceCarriageReturnPlugin />
    </LexicalComposer>,
  );

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), capturedEditor);
}

describe('ReplaceCarriageReturnPlugin', () => {
  it.each(carriageReturnTestCases)(
    'normalizes $description before the editor reads the pasted text',
    carriageReturnTestCase => {
      const editor = unwrap(renderReplaceCarriageReturnPlugin());

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(carriageReturnTestCase.inputText));
          $getRoot().clear();
          $getRoot().append(paragraph);
          paragraph.selectEnd();
          editor.dispatchCommand(PASTE_COMMAND, new Event('paste') as ClipboardEvent);
        },
        {discrete: true},
      );

      const actualText = editor.getEditorState().read(() => {
        return $getRoot().getTextContent();
      });
      const expectedText = carriageReturnTestCase.expectedText;

      expect(actualText).toBe(expectedText);
    },
  );
});
