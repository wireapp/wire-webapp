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

import {TOGGLE_LINK_COMMAND, $createLinkNode} from '@lexical/link';
import {$convertToMarkdownString} from '@lexical/markdown';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $createTextNode, $getRoot, LexicalEditor} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {markdownTransformers} from '../../utils/markdownTransformers';
import {LinkPlugin} from './linkPlugin';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type LinkCharacterizationTestCase = {
  readonly description: string;
  readonly url: string;
  readonly expectedWasHandled: boolean;
  readonly expectedMarkdown: string;
};

type LinkPluginTestFixture = {
  readonly editor: LexicalEditor;
};

const linkCharacterizationTestCases: readonly LinkCharacterizationTestCase[] = [
  {
    description: 'a supported HTTPS URL',
    url: 'https://wire.com',
    expectedWasHandled: true,
    expectedMarkdown: '[Wire](https://wire.com)',
  },
  {
    description: 'an unsupported FTP URL',
    url: 'ftp://wire.com',
    expectedWasHandled: false,
    expectedMarkdown: 'Wire',
  },
  {
    description: 'a mailto URL despite the URL sanitizer supporting mailto links',
    url: 'mailto:alice@wire.com',
    expectedWasHandled: false,
    expectedMarkdown: 'Wire',
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

function renderLinkPlugin(): Result<LinkPluginTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <LinkPlugin />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function selectText(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode(text);
      paragraph.append(textNode);
      $getRoot().clear();
      $getRoot().append(paragraph);
      textNode.select(0, text.length);
    },
    {discrete: true},
  );
}

function createLink(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      const linkNode = $createLinkNode('https://wire.com');
      const linkTextNode = $createTextNode('Wire');
      linkNode.append(linkTextNode);
      paragraph.append(linkNode);
      $getRoot().clear();
      $getRoot().append(paragraph);
      linkTextNode.select(0, linkTextNode.getTextContentSize());
    },
    {discrete: true},
  );
}

function getMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(markdownTransformers, undefined, true);
  });
}

describe('LinkPlugin', () => {
  it.each(linkCharacterizationTestCases)('preserves current behavior for $description', testCase => {
    const fixture = unwrap(renderLinkPlugin());

    act(() => {
      selectText(fixture.editor, 'Wire');
    });

    let wasHandled = false;
    act(() => {
      fixture.editor.update(
        () => {
          wasHandled = fixture.editor.dispatchCommand(TOGGLE_LINK_COMMAND, testCase.url);
        },
        {discrete: true},
      );
    });

    expect(wasHandled).toBe(testCase.expectedWasHandled);
    expect(getMarkdown(fixture.editor)).toBe(testCase.expectedMarkdown);
  });

  it('removes a link when the toggle command receives a null URL', () => {
    const fixture = unwrap(renderLinkPlugin());

    act(() => {
      createLink(fixture.editor);
    });

    let wasHandled = false;
    act(() => {
      fixture.editor.update(
        () => {
          wasHandled = fixture.editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        },
        {discrete: true},
      );
    });

    expect(wasHandled).toBe(true);
    expect(getMarkdown(fixture.editor)).toBe('Wire');
  });
});
