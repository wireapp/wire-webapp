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

import {$convertToMarkdownString} from '@lexical/markdown';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createLinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getRoot, LexicalEditor} from 'lexical';
import {noop} from 'noop-esm';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render} from '@testing-library/react';

import {unwrap} from 'Util/test/resultTestSupport';

import {editorConfig} from '../../editorConfig';
import {markdownTransformers} from '../../utils/markdownTransformers';
import {useLinkState} from './useLinkState';

type LinkState = ReturnType<typeof useLinkState>;

type LinkStateCapturePluginProps = {
  readonly onReady: (linkState: LinkState) => void;
};

type LinkStateTestFixture = {
  readonly editor: LexicalEditor;
  readonly getLinkState: () => Result<LinkState, Error>;
};

const LinkStateCapturePlugin: FunctionComponent<LinkStateCapturePluginProps> = props => {
  const {onReady} = props;
  const linkState = useLinkState();

  useEffect(() => {
    onReady(linkState);
  }, [linkState, onReady]);

  return null;
};

function throwEditorError(error: unknown): never {
  throw error;
}

function renderLinkState(): Result<LinkStateTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();
  let capturedLinkState: Maybe<LinkState> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  function captureLinkState(linkState: LinkState): void {
    capturedLinkState = Maybe.just(linkState);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <LinkStateCapturePlugin onReady={captureLinkState} />
      <EditorCapturePlugin onReady={captureEditor} />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {
      editor,
      getLinkState(): Result<LinkState, Error> {
        return toolbelt.fromMaybe(new Error('The link state was not captured'), capturedLinkState);
      },
    };
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

const EditorCapturePlugin: FunctionComponent<EditorCapturePluginProps> = props => {
  const {onReady} = props;
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
};

function selectText(editor: LexicalEditor, text: string): void {
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

function selectExistingLink(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const linkNode = $createLinkNode('https://wire.com');
      const linkTextNode = $createTextNode('Wire');
      linkNode.append(linkTextNode);
      paragraphNode.append(linkNode);
      $getRoot().clear().append(paragraphNode);
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

function flushEditorUpdate(editor: LexicalEditor): void {
  editor.update(noop, {discrete: true});
}

describe('useLinkState', () => {
  it('opens a new-link state for selected text and inserts a sanitized link', () => {
    const fixture = unwrap(renderLinkState());

    act(() => {
      selectText(fixture.editor, 'Wire');
    });

    act(() => {
      unwrap(fixture.getLinkState()).formatLink();
    });

    const newLinkState = unwrap(fixture.getLinkState());

    expect(newLinkState.isModalOpen).toBe(true);
    expect(newLinkState.selectedText).toBe('Wire');
    expect(newLinkState.linkUrl).toBe('');

    act(() => {
      newLinkState.insertLink('example.com');
    });

    act(() => {
      flushEditorUpdate(fixture.editor);
    });

    expect(getMarkdown(fixture.editor)).toBe('[Wire](https://example.com)');
    expect(unwrap(fixture.getLinkState()).isModalOpen).toBe(false);
  });

  it('opens an existing-link state and replaces its URL and visible text', () => {
    const fixture = unwrap(renderLinkState());

    act(() => {
      selectExistingLink(fixture.editor);
    });

    act(() => {
      unwrap(fixture.getLinkState()).formatLink();
    });

    const existingLinkState = unwrap(fixture.getLinkState());

    expect(existingLinkState.isModalOpen).toBe(true);
    expect(existingLinkState.selectedText).toBe('Wire');
    expect(existingLinkState.linkUrl).toBe('https://wire.com');

    act(() => {
      existingLinkState.insertLink('https://wire.com/new', 'New Wire');
    });

    act(() => {
      flushEditorUpdate(fixture.editor);
    });

    expect(getMarkdown(fixture.editor)).toBe('[New Wire](https://wire.com/new)');
    expect(unwrap(fixture.getLinkState()).isModalOpen).toBe(false);
  });
});
