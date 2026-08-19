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
 *
 */

import {$convertFromMarkdownString, $convertToMarkdownString} from '@lexical/markdown';
import {createEditor, $getRoot, LexicalEditor} from 'lexical';

import {editorConfig} from '../editorConfig';
import {markdownTransformers} from '../utils/markdownTransformers';

export interface WireLexicalEditorTestHarness {
  readonly editor: LexicalEditor;
  readonly importMarkdown: (markdown: string) => void;
  readonly exportMarkdown: () => string;
  readonly getTextContent: () => string;
}

function throwEditorError(error: unknown): never {
  throw error;
}

export function createWireLexicalEditorTestHarness(): WireLexicalEditorTestHarness {
  const {namespace, theme, nodes} = editorConfig;
  const editor = createEditor({
    namespace,
    theme,
    nodes,
    onError: throwEditorError,
  });

  function importMarkdown(markdown: string): void {
    editor.update(
      () => {
        $getRoot().clear();
        $convertFromMarkdownString(markdown, markdownTransformers, undefined, true);
      },
      {discrete: true},
    );
  }

  function exportMarkdown(): string {
    return editor.getEditorState().read(() => {
      return $convertToMarkdownString(markdownTransformers, undefined, true);
    });
  }

  function getTextContent(): string {
    return editor.getEditorState().read(() => {
      return $getRoot().getTextContent();
    });
  }

  return {editor, importMarkdown, exportMarkdown, getTextContent};
}
