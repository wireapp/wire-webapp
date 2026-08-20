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

import {$convertFromMarkdownString} from '@lexical/markdown';
import {LexicalEditor, $createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {noop} from 'noop-esm';
import {Maybe, toolbelt, type Result} from 'true-myth';

import {act, render} from '@testing-library/react';

import {MessageContent} from 'Components/InputBar/common/messageContent/messageContent';
import {unwrap} from 'Util/test/resultTestSupport';

import {RichTextEditor} from './RichTextEditor';

import {markdownTransformers} from './utils/markdownTransformers';

type RichTextEditorTestOptions = {
  readonly disableMessagePreprocessing: boolean;
  readonly replaceEmojis: boolean;
  readonly showMarkdownPreview: boolean;
};

type RichTextEditorTestFixture = {
  readonly editor: LexicalEditor;
  readonly onUpdate: jest.Mock<void, [MessageContent]>;
  readonly saveDraftState: jest.Mock<void, [string, string, string | undefined]>;
};

type RichTextEditorTestFunction = () => void;

const defaultRichTextEditorTestOptions: RichTextEditorTestOptions = {
  disableMessagePreprocessing: false,
  replaceEmojis: false,
  showMarkdownPreview: true,
};

function throwEditorError(error: unknown): never {
  throw error;
}

function withFakeTimers(testFunction: RichTextEditorTestFunction): RichTextEditorTestFunction {
  return function (): void {
    jest.useFakeTimers();

    try {
      testFunction();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  };
}

function renderRichTextEditor(
  richTextEditorTestOptions: RichTextEditorTestOptions = defaultRichTextEditorTestOptions,
): Result<RichTextEditorTestFixture, Error> {
  const onUpdate = jest.fn<void, [MessageContent]>();
  const saveDraftState = jest.fn<void, [string, string, string | undefined]>();
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  render(
    <RichTextEditor
      placeholder="Message"
      replaceEmojis={richTextEditorTestOptions.replaceEmojis}
      editedMessage={undefined}
      hasLocalEphemeralTimer={false}
      showFormatToolbar={false}
      showMarkdownPreview={richTextEditorTestOptions.showMarkdownPreview}
      disableMessagePreprocessing={richTextEditorTestOptions.disableMessagePreprocessing}
      getMentionCandidates={() => []}
      saveDraftState={saveDraftState}
      loadDraftState={async () => {
        return {editorState: null};
      }}
      onUpdate={onUpdate}
      onArrowUp={noop}
      onEscape={noop}
      onShiftTab={noop}
      onBlur={noop}
      onSend={noop}
      onSetup={captureEditor}
    >
      {null}
    </RichTextEditor>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor, onUpdate, saveDraftState};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
}

function importMarkdown(editor: LexicalEditor, markdown: string): void {
  editor.update(
    () => {
      $getRoot().clear();
      $convertFromMarkdownString(markdown, markdownTransformers, undefined, true);
    },
    {discrete: true},
  );
}

function setRawParagraphs(editor: LexicalEditor, paragraphs: readonly string[]): void {
  editor.update(
    () => {
      const paragraphNodes = paragraphs.map(paragraph => {
        const paragraphNode = $createParagraphNode();
        paragraphNode.append($createTextNode(paragraph));

        return paragraphNode;
      });

      $getRoot()
        .clear()
        .append(...paragraphNodes);
    },
    {discrete: true},
  );
}

describe('RichTextEditor', () => {
  it(
    'reports serialized Markdown and saves the same transformed message when preprocessing is enabled',
    withFakeTimers(() => {
      const fixture = unwrap(renderRichTextEditor());

      act(() => {
        importMarkdown(fixture.editor, '**bold**\n\n- item');
      });

      expect(fixture.onUpdate).toHaveBeenLastCalledWith({
        text: '**bold**\n\n- item',
        mentions: [],
      });

      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(fixture.saveDraftState).toHaveBeenLastCalledWith(
        JSON.stringify(fixture.editor.getEditorState().toJSON()),
        '**bold**\n\n- item',
        undefined,
      );
    }),
  );

  it(
    'reports raw editor text and leaves Markdown-looking text unchanged when preprocessing is disabled',
    withFakeTimers(() => {
      const fixture = unwrap(
        renderRichTextEditor({
          disableMessagePreprocessing: true,
          replaceEmojis: true,
          showMarkdownPreview: false,
        }),
      );

      act(() => {
        setRawParagraphs(fixture.editor, ['**bold**', 'hello :)']);
      });

      expect(fixture.onUpdate).toHaveBeenLastCalledWith({
        text: '**bold**\nhello :)',
        mentions: [],
      });

      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(fixture.saveDraftState).toHaveBeenLastCalledWith(
        JSON.stringify(fixture.editor.getEditorState().toJSON()),
        '**bold**\nhello :)',
        undefined,
      );
    }),
  );
});
