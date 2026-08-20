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
import {$convertToMarkdownString} from '@lexical/markdown';
import {$createParagraphNode, $createTextNode, $getRoot, LexicalEditor} from 'lexical';
import {act, renderHook} from '@testing-library/react';
import {type FunctionComponent, type ReactNode} from 'react';

import {editorConfig} from '../editorConfig';
import {markdownTransformers} from '../utils/markdownTransformers';
import {useBlockquoteState} from './useBlockquoteState/useBlockquoteState';
import {useCodeBlockState} from './useCodeBlockState/useCodeBlockState';

type LexicalComposerTestWrapperProps = {
  readonly children: ReactNode;
};

type FormatBlockCommands = {
  readonly editor: LexicalEditor;
  readonly formatBlockquote: () => void;
  readonly formatCodeBlock: () => void;
};

function throwEditorError(error: unknown): never {
  throw error;
}

const LexicalComposerTestWrapper: FunctionComponent<LexicalComposerTestWrapperProps> = props => {
  const {children} = props;

  return <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>{children}</LexicalComposer>;
};

function useFormatBlockCommands(): FormatBlockCommands {
  const [editor] = useLexicalComposerContext();
  const {formatBlockquote} = useBlockquoteState();
  const {formatCodeBlock} = useCodeBlockState();

  return {editor, formatBlockquote, formatCodeBlock};
}

function setSelectedParagraph(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode(text);
      paragraphNode.append(textNode);
      $getRoot().clear().append(paragraphNode);
      textNode.select(0, text.length);
    },
    {discrete: true},
  );
}

function getMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(markdownTransformers, undefined, true);
  });
}

function flushEditorUpdate(editor: LexicalEditor): void {
  editor.update(() => {}, {discrete: true});
}

describe('FormatToolbar block commands', () => {
  it('formats a selected paragraph as a blockquote and toggles it back to a paragraph', () => {
    const {result} = renderHook(useFormatBlockCommands, {wrapper: LexicalComposerTestWrapper});
    const {editor, formatBlockquote} = result.current;

    act(() => {
      setSelectedParagraph(editor, 'quoted text');
    });

    act(() => {
      formatBlockquote();
    });

    act(() => {
      flushEditorUpdate(editor);
    });

    expect(getMarkdown(editor)).toBe('> quoted text');

    act(() => {
      formatBlockquote();
    });

    act(() => {
      flushEditorUpdate(editor);
    });

    expect(getMarkdown(editor)).toBe('quoted text');
  });

  it('formats a selected paragraph as a code block and toggles it back to a paragraph', () => {
    const {result} = renderHook(useFormatBlockCommands, {wrapper: LexicalComposerTestWrapper});
    const {editor, formatCodeBlock} = result.current;

    act(() => {
      setSelectedParagraph(editor, 'const value = 1;');
    });

    act(() => {
      formatCodeBlock();
    });

    act(() => {
      flushEditorUpdate(editor);
    });

    expect(getMarkdown(editor)).toBe('```\nconst value = 1;\n```');

    act(() => {
      formatCodeBlock();
    });

    act(() => {
      flushEditorUpdate(editor);
    });

    expect(getMarkdown(editor)).toBe('const value = 1;');
  });
});
