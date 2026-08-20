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
import {$createParagraphNode, $getRoot, $nodesOfType, LexicalEditor, PASTE_COMMAND} from 'lexical';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {render} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrap} from 'Util/test/resultTestSupport';

import {MentionNode} from '../../nodes/MentionNode';
import {editorConfig} from '../../editorConfig';
import {PastePlugin} from './PastePlugin';
import {markdownTransformers} from '../../utils/markdownTransformers';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type PastePluginTestFixture = {
  readonly editor: LexicalEditor;
};

type RenderPastePluginOptions = {
  readonly isPreviewMode: boolean;
  readonly mentionCandidates: readonly User[];
};

type PasteEventOptions = {
  readonly htmlContent: string;
  readonly plainText: string;
};

type PasteEventFixture = {
  readonly event: ClipboardEvent;
  readonly preventDefault: jest.Mock<void, []>;
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

function renderPastePlugin(renderPastePluginOptions: RenderPastePluginOptions): Result<PastePluginTestFixture, Error> {
  const getMentionCandidates = jest
    .fn<User[], []>()
    .mockReturnValue(renderPastePluginOptions.mentionCandidates.slice());
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <PastePlugin getMentionCandidates={getMentionCandidates} isPreviewMode={renderPastePluginOptions.isPreviewMode} />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function createPasteEvent(pasteEventOptions: PasteEventOptions): PasteEventFixture {
  const preventDefault = jest.fn<void, []>();
  const clipboardData = {
    getData(format: string): string {
      return format === 'text/html' ? pasteEventOptions.htmlContent : pasteEventOptions.plainText;
    },
  };
  const event = {clipboardData, preventDefault} as unknown as ClipboardEvent;

  return {event, preventDefault};
}

function selectEndOfEmptyParagraph(editor: LexicalEditor): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      $getRoot().clear().append(paragraphNode);
      paragraphNode.selectEnd();
    },
    {discrete: true},
  );
}

function dispatchPaste(editor: LexicalEditor, event: ClipboardEvent): boolean {
  let wasHandled = false;

  editor.update(
    () => {
      wasHandled = editor.dispatchCommand(PASTE_COMMAND, event);
    },
    {discrete: true},
  );

  return wasHandled;
}

function getMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(markdownTransformers, undefined, true);
  });
}

function getTextContent(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    return $getRoot().getTextContent();
  });
}

function getMentionTexts(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() => {
    return $nodesOfType(MentionNode).map(mentionNode => {
      return mentionNode.getTextContent();
    });
  });
}

function createMentionCandidate(name: string): User {
  const user = new User(`${name}-id`, '', translateForTest);
  user.name(name);

  return user;
}

describe('PastePlugin', () => {
  it('inserts multiline plain text and consumes the paste command', () => {
    const fixture = unwrap(
      renderPastePlugin({
        isPreviewMode: true,
        mentionCandidates: [],
      }),
    );
    const pasteEventFixture = createPasteEvent({htmlContent: '', plainText: 'first line\nsecond line'});
    selectEndOfEmptyParagraph(fixture.editor);

    const wasHandled = dispatchPaste(fixture.editor, pasteEventFixture.event);

    expect(wasHandled).toBe(true);
    expect(pasteEventFixture.preventDefault).toHaveBeenCalledTimes(1);
    expect(getTextContent(fixture.editor)).toBe('first line\nsecond line');
  });

  it('preserves formatting from HTML in preview mode', () => {
    const fixture = unwrap(
      renderPastePlugin({
        isPreviewMode: true,
        mentionCandidates: [],
      }),
    );
    const pasteEventFixture = createPasteEvent({
      htmlContent: '<strong>bold</strong> <em>italic</em>',
      plainText: 'bold italic',
    });
    selectEndOfEmptyParagraph(fixture.editor);

    const wasHandled = dispatchPaste(fixture.editor, pasteEventFixture.event);

    expect(wasHandled).toBe(true);
    expect(getMarkdown(fixture.editor)).toBe('**bold** *italic*');
  });

  it('inserts a Markdown link as text when preview mode is disabled', () => {
    const fixture = unwrap(
      renderPastePlugin({
        isPreviewMode: false,
        mentionCandidates: [],
      }),
    );
    const pasteEventFixture = createPasteEvent({
      htmlContent: '<a href="https://wire.com">Wire</a>',
      plainText: 'Wire',
    });
    selectEndOfEmptyParagraph(fixture.editor);

    const wasHandled = dispatchPaste(fixture.editor, pasteEventFixture.event);

    expect(wasHandled).toBe(true);
    expect(getMarkdown(fixture.editor)).toBe('[Wire](https://wire.com)');
    expect(getTextContent(fixture.editor)).toBe('[Wire](https://wire.com)');
  });

  it('preserves a valid Lexical mention node from HTML', () => {
    const fixture = unwrap(
      renderPastePlugin({
        isPreviewMode: true,
        mentionCandidates: [createMentionCandidate('Alice')],
      }),
    );
    const pasteEventFixture = createPasteEvent({
      htmlContent:
        '<span data-lexical-mention="true" data-lexical-mention-trigger="@" data-lexical-mention-value="Alice">@Alice</span>',
      plainText: '@Alice',
    });
    selectEndOfEmptyParagraph(fixture.editor);

    const wasHandled = dispatchPaste(fixture.editor, pasteEventFixture.event);

    expect(wasHandled).toBe(true);
    expect(getMentionTexts(fixture.editor)).toEqual(['@Alice']);
    expect(getTextContent(fixture.editor)).toBe('@Alice');
  });

  it('combines the mention trigger with an at-prefixed pasted mention value', () => {
    const fixture = unwrap(
      renderPastePlugin({
        isPreviewMode: true,
        mentionCandidates: [createMentionCandidate('Alice')],
      }),
    );
    const pasteEventFixture = createPasteEvent({
      htmlContent:
        '<span data-lexical-mention="true" data-lexical-mention-trigger="@" data-lexical-mention-value="@Alice">@Alice</span>',
      plainText: '@Alice',
    });
    selectEndOfEmptyParagraph(fixture.editor);

    const wasHandled = dispatchPaste(fixture.editor, pasteEventFixture.event);

    expect(wasHandled).toBe(true);
    expect(getMentionTexts(fixture.editor)).toEqual(['@@Alice']);
    expect(getTextContent(fixture.editor)).toBe('@@Alice');
  });

  it('converts an unavailable Lexical mention to ordinary text', () => {
    const fixture = unwrap(
      renderPastePlugin({
        isPreviewMode: true,
        mentionCandidates: [],
      }),
    );
    const pasteEventFixture = createPasteEvent({
      htmlContent:
        '<span data-lexical-mention="true" data-lexical-mention-trigger="@" data-lexical-mention-value="@Unknown">@Unknown</span>',
      plainText: '@Unknown',
    });
    selectEndOfEmptyParagraph(fixture.editor);

    const wasHandled = dispatchPaste(fixture.editor, pasteEventFixture.event);

    expect(wasHandled).toBe(true);
    expect(getMentionTexts(fixture.editor)).toEqual([]);
    expect(getTextContent(fixture.editor)).toBe('@Unknown');
  });

  it('does not consume a paste command without clipboard data', () => {
    const fixture = unwrap(
      renderPastePlugin({
        isPreviewMode: true,
        mentionCandidates: [],
      }),
    );
    const wasHandled = dispatchPaste(fixture.editor, {} as ClipboardEvent);

    expect(wasHandled).toBe(false);
  });
});
