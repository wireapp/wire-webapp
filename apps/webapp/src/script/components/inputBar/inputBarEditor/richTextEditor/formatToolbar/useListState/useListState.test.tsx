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
import {$convertToMarkdownString} from '@lexical/markdown';
import {$createParagraphNode, $createTextNode, $getRoot, type LexicalEditor} from 'lexical';
import {noop} from 'noop-esm';
import {act, renderHook} from '@testing-library/react';
import {type FunctionComponent, type ReactNode} from 'react';

import {editorConfig} from '../../editorConfig';
import {markdownTransformers} from '../../utils/markdownTransformers';

import {useListState} from './useListState';

type LexicalComposerTestWrapperProps = {
  readonly children: ReactNode;
};

type ListStateTestResult = {
  readonly editor: LexicalEditor;
  readonly formatList: (listType: ListType) => void;
};

type ListType = 'unordered' | 'ordered';

type ListStateCharacterizationTestCase = {
  readonly description: string;
  readonly listType: ListType;
  readonly expectedListMarkdown: string;
};

const listStateCharacterizationTestCases: readonly ListStateCharacterizationTestCase[] = [
  {
    description: 'an unordered list',
    listType: 'unordered',
    expectedListMarkdown: '- item',
  },
  {
    description: 'an ordered list',
    listType: 'ordered',
    expectedListMarkdown: '1. item',
  },
];

function throwEditorError(error: unknown): never {
  throw error;
}

const LexicalComposerTestWrapper: FunctionComponent<LexicalComposerTestWrapperProps> = props => {
  const {children} = props;

  return (
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <ListPlugin />
      {children}
    </LexicalComposer>
  );
};

function useListStateWithEditor(): ListStateTestResult {
  const [editor] = useLexicalComposerContext();
  const {formatList} = useListState();

  return {editor, formatList};
}

function setSelectedParagraph(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode('item');
      paragraphNode.append(textNode);
      $getRoot().clear().append(paragraphNode);
      textNode.select(0, textNode.getTextContentSize());
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
  editor.update(noop, {discrete: true});
}

describe('useListState', () => {
  it.each(listStateCharacterizationTestCases)('toggles $description formatting', characterizationTestCase => {
    const {result} = renderHook(useListStateWithEditor, {wrapper: LexicalComposerTestWrapper});

    act(() => {
      setSelectedParagraph(result.current.editor);
    });

    act(() => {
      result.current.formatList(characterizationTestCase.listType);
    });

    act(() => {
      flushEditorUpdate(result.current.editor);
    });

    expect(getMarkdown(result.current.editor)).toBe(characterizationTestCase.expectedListMarkdown);

    act(() => {
      result.current.formatList(characterizationTestCase.listType);
    });

    act(() => {
      flushEditorUpdate(result.current.editor);
    });

    expect(getMarkdown(result.current.editor)).toBe('item');
  });
});
