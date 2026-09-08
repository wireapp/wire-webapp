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

import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$convertFromMarkdownString, $convertToMarkdownString} from '@lexical/markdown';
import {registerRichText} from '@lexical/rich-text';
import {$getRoot, $isElementNode, $isTextNode, INDENT_CONTENT_COMMAND, type LexicalEditor} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {ListItemTabIndentationPlugin} from '../listIndentationPlugin/listIndentationPlugin';
import {markdownTransformers} from '../../utils/markdownTransformers';

import {ListMaxIndentLevelPlugin} from './listMaxIndentLevelPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type ListMaxIndentLevelCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly maxDepth: number;
  readonly expectedWasHandled: boolean;
  readonly expectedMarkdown: string;
};

const listMaxIndentLevelCharacterizationTestCases: readonly ListMaxIndentLevelCharacterizationTestCase[] = [
  {
    description: 'a top-level list item below the configured maximum depth',
    inputMarkdown: '- first\n- second',
    maxDepth: 3,
    expectedWasHandled: true,
    expectedMarkdown: '- first\n- second',
  },
  {
    description: 'a top-level list item at a maximum depth of one',
    inputMarkdown: '- first\n- second',
    maxDepth: 1,
    expectedWasHandled: true,
    expectedMarkdown: '- first\n- second',
  },
  {
    description: 'a nested list item at a maximum depth of two',
    inputMarkdown: '- one\n  - two\n    - three',
    maxDepth: 2,
    expectedWasHandled: true,
    expectedMarkdown: '- one\n- two\n    - three',
  },
];

function throwEditorError(error: unknown): never {
  throw error;
}

const EditorCapturePlugin: FunctionComponent<EditorCapturePluginProps> = props => {
  const {onReady} = props;
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
};

function renderListMaxIndentLevelEditor(maxDepth: number): Result<LexicalEditor, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <ListPlugin />
      <ListItemTabIndentationPlugin />
      <ListMaxIndentLevelPlugin maxDepth={maxDepth} />
    </LexicalComposer>,
  );

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), capturedEditor);
}

function importMarkdown(editor: LexicalEditor, markdown: string): void {
  editor.update(
    () => {
      $getRoot().clear();
      $convertFromMarkdownString(markdown, markdownTransformers, undefined, true);
      $getRoot().selectEnd();
    },
    {discrete: true},
  );
}

function selectEndOfLastListItem(editor: LexicalEditor): void {
  editor.update(
    () => {
      const firstDocumentElement = $getRoot().getFirstChild();
      if (firstDocumentElement === null || !$isElementNode(firstDocumentElement)) {
        throw new Error('The list max indentation characterization requires a document element');
      }
      const lastTextNode = firstDocumentElement.getLastDescendant();
      if (lastTextNode === null || !$isTextNode(lastTextNode)) {
        throw new Error('The list max indentation characterization requires a text node');
      }
      lastTextNode.selectEnd();
    },
    {discrete: true},
  );
}

function exportMarkdown(editor: LexicalEditor): string {
  let markdown = '';

  editor.getEditorState().read(() => {
    markdown = $convertToMarkdownString(markdownTransformers, undefined, true);
  });

  return markdown;
}

describe('ListMaxIndentLevelPlugin', () => {
  it.each(listMaxIndentLevelCharacterizationTestCases)(
    'preserves the current indent command behavior for $description',
    characterizationTestCase => {
      const editorResult = renderListMaxIndentLevelEditor(characterizationTestCase.maxDepth);
      const editor = unwrap(editorResult);

      importMarkdown(editor, characterizationTestCase.inputMarkdown);
      registerRichText(editor);
      selectEndOfLastListItem(editor);

      const actualWasHandled = editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      const actualMarkdown = exportMarkdown(editor);
      const expectedWasHandled = characterizationTestCase.expectedWasHandled;
      const expectedMarkdown = characterizationTestCase.expectedMarkdown;

      expect(actualWasHandled).toBe(expectedWasHandled);
      expect(actualMarkdown).toBe(expectedMarkdown);
    },
  );
});
