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

import {$createCodeNode} from '@lexical/code';
import {$createLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  ElementNode,
  LexicalEditor,
  TextFormatType,
} from 'lexical';
import {noop} from 'noop-esm';
import {match} from 'ts-pattern';
import {act, renderHook} from '@testing-library/react';
import {type FunctionComponent, type ReactNode} from 'react';

import {editorConfig} from '../../editorConfig';
import {useToolbarState} from './useToolbarState';

type LexicalComposerTestWrapperProps = {
  readonly children: ReactNode;
};

type ToolbarStateTestResult = {
  readonly editor: LexicalEditor;
  readonly activeFormats: readonly string[];
};

type InlineFormat = Extract<TextFormatType, 'bold' | 'italic' | 'strikethrough' | 'code'>;

type InlineFormatCharacterizationTestCase = {
  readonly description: string;
  readonly formats: readonly InlineFormat[];
  readonly expectedActiveFormats: readonly string[];
};

type BlockFormat = 'unorderedList' | 'orderedList' | 'heading' | 'blockquote' | 'codeBlock' | 'link';

type BlockFormatCharacterizationTestCase = {
  readonly description: string;
  readonly format: BlockFormat;
  readonly expectedActiveFormats: readonly string[];
};

const inlineFormatCharacterizationTestCases: readonly InlineFormatCharacterizationTestCase[] = [
  {description: 'bold', formats: ['bold'], expectedActiveFormats: ['bold']},
  {description: 'italic', formats: ['italic'], expectedActiveFormats: ['italic']},
  {description: 'strikethrough', formats: ['strikethrough'], expectedActiveFormats: ['strikethrough']},
  {description: 'inline code', formats: ['code'], expectedActiveFormats: ['code']},
  {
    description: 'bold and italic',
    formats: ['bold', 'italic'],
    expectedActiveFormats: ['bold', 'italic'],
  },
];

const blockFormatCharacterizationTestCases: readonly BlockFormatCharacterizationTestCase[] = [
  {description: 'an unordered list', format: 'unorderedList', expectedActiveFormats: ['unorderedList']},
  {description: 'an ordered list', format: 'orderedList', expectedActiveFormats: ['orderedList']},
  {description: 'a heading', format: 'heading', expectedActiveFormats: ['heading']},
  {description: 'a blockquote', format: 'blockquote', expectedActiveFormats: ['blockquote']},
  {description: 'a code block', format: 'codeBlock', expectedActiveFormats: ['codeBlock']},
  {description: 'a link', format: 'link', expectedActiveFormats: ['link']},
];

function throwEditorError(error: unknown): never {
  throw error;
}

const LexicalComposerTestWrapper: FunctionComponent<LexicalComposerTestWrapperProps> = props => {
  const {children} = props;

  return <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>{children}</LexicalComposer>;
};

function useToolbarStateWithEditor(): ToolbarStateTestResult {
  const [editor] = useLexicalComposerContext();
  const {activeFormats} = useToolbarState();

  return {editor, activeFormats};
}

function setSelectedInlineText(editor: LexicalEditor, formats: readonly InlineFormat[]): void {
  editor.update(
    () => {
      const textNode = $createTextNode('formatted text');
      const paragraphNode = $createParagraphNode();
      paragraphNode.append(textNode);
      $getRoot().clear().append(paragraphNode);
      textNode.select(0, textNode.getTextContentSize());

      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }

      for (const format of formats) {
        selection.formatText(format);
      }
    },
    {discrete: true},
  );
}

function setSelectedBlock(editor: LexicalEditor, format: BlockFormat): void {
  editor.update(
    () => {
      const textNode = $createTextNode('formatted text');
      const blockNode = match(format)
        .returnType<ElementNode>()
        .with('unorderedList', () => {
          const listItemNode = $createListItemNode();
          listItemNode.append(textNode);

          return $createListNode('bullet').append(listItemNode);
        })
        .with('orderedList', () => {
          const listItemNode = $createListItemNode();
          listItemNode.append(textNode);

          return $createListNode('number').append(listItemNode);
        })
        .with('heading', () => {
          const headingNode = $createHeadingNode('h1');
          headingNode.append(textNode);

          return headingNode;
        })
        .with('blockquote', () => {
          const blockquoteNode = $createQuoteNode();
          blockquoteNode.append(textNode);

          return blockquoteNode;
        })
        .with('codeBlock', () => {
          const codeBlockNode = $createCodeNode();
          codeBlockNode.append(textNode);

          return codeBlockNode;
        })
        .with('link', () => {
          const linkNode = $createLinkNode('https://wire.com');
          linkNode.append(textNode);

          return linkNode;
        })
        .exhaustive();

      $getRoot().clear().append(blockNode);
      textNode.select(0, textNode.getTextContentSize());
    },
    {discrete: true},
  );
}

function flushEditorUpdate(editor: LexicalEditor): void {
  editor.update(noop, {discrete: true});
}

describe('useToolbarState', () => {
  it('starts with no active formats before a range selection exists', () => {
    const {result} = renderHook(useToolbarStateWithEditor, {wrapper: LexicalComposerTestWrapper});

    expect(result.current.activeFormats).toEqual([]);
  });

  it.each(inlineFormatCharacterizationTestCases)('reports active $description formatting', testCase => {
    const {result} = renderHook(useToolbarStateWithEditor, {wrapper: LexicalComposerTestWrapper});

    act(() => {
      setSelectedInlineText(result.current.editor, testCase.formats);
    });

    expect(result.current.activeFormats).toEqual(testCase.expectedActiveFormats);
  });

  it.each(blockFormatCharacterizationTestCases)('reports active formatting for $description', testCase => {
    const {result} = renderHook(useToolbarStateWithEditor, {wrapper: LexicalComposerTestWrapper});

    act(() => {
      setSelectedBlock(result.current.editor, testCase.format);
    });

    expect(result.current.activeFormats).toEqual(testCase.expectedActiveFormats);
  });

  it('retains the previous active formatting after replacing selected formatted text with plain text', () => {
    const {result} = renderHook(useToolbarStateWithEditor, {wrapper: LexicalComposerTestWrapper});

    act(() => {
      setSelectedInlineText(result.current.editor, ['bold']);
    });

    expect(result.current.activeFormats).toEqual(['bold']);

    act(() => {
      setSelectedInlineText(result.current.editor, []);
    });

    act(() => {
      flushEditorUpdate(result.current.editor);
    });

    expect(result.current.activeFormats).toEqual(['bold']);
  });
});
