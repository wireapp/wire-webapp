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

import {AutoLinkNode} from '@lexical/link';
import {$convertToMarkdownString} from '@lexical/markdown';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $createTextNode, $getRoot, $nodesOfType, LexicalEditor} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {markdownTransformers} from '../../utils/markdownTransformers';
import {AutoLinkPlugin} from './autoLinkPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type AutoLinkCharacterizationTestCase = {
  readonly description: string;
  readonly inputText: string;
  readonly expectedLinkUrls: readonly string[];
  readonly expectedMarkdown: string;
};

type AutoLinkPluginTestFixture = {
  readonly editor: LexicalEditor;
};

const autoLinkCharacterizationTestCases: readonly AutoLinkCharacterizationTestCase[] = [
  {
    description: 'a supported HTTPS URL',
    inputText: 'Visit https://wire.com',
    expectedLinkUrls: ['https://wire.com'],
    expectedMarkdown: 'Visit [https://wire.com](https://wire.com)',
  },
  {
    description: 'a URL followed by punctuation',
    inputText: 'Visit https://wire.com, today',
    expectedLinkUrls: ['https://wire.com,'],
    expectedMarkdown: 'Visit [https://wire.com,](https://wire.com,) today',
  },
  {
    description: 'an unsupported FTP URL',
    inputText: 'Visit ftp://wire.com',
    expectedLinkUrls: [],
    expectedMarkdown: 'Visit ftp://wire.com',
  },
  {
    description: 'an HTTPS URL embedded in another word',
    inputText: 'prefixhttps://wire.com',
    expectedLinkUrls: [],
    expectedMarkdown: 'prefixhttps://wire.com',
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

function renderAutoLinkPlugin(): Result<AutoLinkPluginTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <AutoLinkPlugin />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function importText(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      $getRoot().clear();
      $getRoot().append(paragraph);
      paragraph.selectEnd();
    },
    {discrete: true},
  );
}

function getAutoLinkUrls(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() => {
    return $nodesOfType(AutoLinkNode).map(autoLinkNode => {
      return autoLinkNode.getURL();
    });
  });
}

function getMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(markdownTransformers, undefined, true);
  });
}

describe('AutoLinkPlugin', () => {
  it.each(autoLinkCharacterizationTestCases)('preserves current behavior for $description', testCase => {
    const fixture = unwrap(renderAutoLinkPlugin());

    act(() => {
      importText(fixture.editor, testCase.inputText);
    });

    expect(getAutoLinkUrls(fixture.editor)).toEqual(testCase.expectedLinkUrls);
    expect(getMarkdown(fixture.editor)).toBe(testCase.expectedMarkdown);
  });
});
