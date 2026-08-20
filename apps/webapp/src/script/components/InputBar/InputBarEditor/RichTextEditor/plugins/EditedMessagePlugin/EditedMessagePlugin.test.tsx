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
import {$createParagraphNode, $createTextNode, $getRoot, $nodesOfType, LexicalEditor} from 'lexical';
import {noop} from 'noop-esm';
import {Maybe, toolbelt, type Result} from 'true-myth';
import {useEffect, type FunctionComponent} from 'react';

import {act, render, waitFor, type RenderResult} from '@testing-library/react';

import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {Text} from 'Repositories/entity/message/text';
import {MentionEntity} from 'src/script/message/mentionEntity';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrap} from 'Util/test/resultTestSupport';

import {MentionNode} from '../../nodes/MentionNode';
import {editorConfig} from '../../editorConfig';
import {getMentionMarkdownTransformer} from './getMentionMarkdownTransformer/getMentionMarkdownTransformer';
import {EditedMessagePlugin} from './EditedMessagePlugin';
import {markdownTransformers} from '../../utils/markdownTransformers';

type EditorCapturePluginProps = {
  readonly onReady: (editor: LexicalEditor) => void;
};

type EditedMessagePluginTestFixture = {
  readonly editor: LexicalEditor;
  readonly rerender: RenderResult['rerender'];
};

type MentionCharacterizationTestCase = {
  readonly description: string;
  readonly messageText: string;
  readonly mentionStartIndex: number;
  readonly mentionLength: number;
  readonly expectedTextContent: string;
  readonly expectedMentionText: string;
};

type EditedMessageStructureTestCase = {
  readonly description: string;
  readonly messageText: string;
  readonly expectedTextContent: string;
};

const mentionCharacterizationTestCases: readonly MentionCharacterizationTestCase[] = [
  {
    description: 'a mention surrounded by ordinary text and punctuation',
    messageText: 'Hello @Alice!',
    mentionStartIndex: 6,
    mentionLength: 6,
    expectedTextContent: 'Hello @Alice!',
    expectedMentionText: '@Alice',
  },
];

const editedMessageStructureTestCases: readonly EditedMessageStructureTestCase[] = [
  {
    description: 'a multiline blockquote',
    messageText: '> first\n> second',
    expectedTextContent: 'first\nsecond',
  },
  {
    description: 'a fenced code block with a language suffix',
    messageText: '```typescript\nconst value = 1;\n```',
    expectedTextContent: 'const value = 1;',
  },
];

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

function createContentMessage(messageText: string, mentions: readonly MentionEntity[] = []): ContentMessage {
  const message = new ContentMessage(undefined, translateForTest);
  const textAsset = new Text(undefined, messageText);
  textAsset.mentions(mentions.slice());
  message.addAsset(textAsset);

  return message;
}

function renderEditedMessagePlugin(
  message: ContentMessage,
  showMarkdownPreview: boolean,
): Result<EditedMessagePluginTestFixture, Error> {
  let capturedEditor: Maybe<LexicalEditor> = Maybe.nothing();

  function captureEditor(editor: LexicalEditor): void {
    capturedEditor = Maybe.just(editor);
  }

  const renderedEditor = render(
    <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
      <EditorCapturePlugin onReady={captureEditor} />
      <EditedMessagePlugin message={message} showMarkdownPreview={showMarkdownPreview} />
    </LexicalComposer>,
  );

  const fixture = capturedEditor.map(editor => {
    return {editor, rerender: renderedEditor.rerender};
  });

  return toolbelt.fromMaybe(new Error('The Lexical editor was not captured'), fixture);
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

function getMentionMarkdown(editor: LexicalEditor, allowedMentions: string[]): string {
  const mentionMarkdownTransformer = getMentionMarkdownTransformer(allowedMentions);

  return editor.getEditorState().read(() => {
    return $convertToMarkdownString([mentionMarkdownTransformer, ...markdownTransformers], undefined, true);
  });
}

function getMentionTexts(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() => {
    return $nodesOfType(MentionNode).map(mentionNode => {
      return mentionNode.getTextContent();
    });
  });
}

describe('EditedMessagePlugin', () => {
  it('loads an existing plain message into the editor', async () => {
    const fixture = unwrap(renderEditedMessagePlugin(createContentMessage('existing message'), true));

    await waitFor(() => {
      expect(getMarkdown(fixture.editor)).toBe('existing message');
    });

    expect(getTextContent(fixture.editor)).toBe('existing message');
  });

  it('imports Markdown formatting, lists, and links when preview mode is enabled', async () => {
    const messageText = '**bold**\n\n- item\n- [link](https://wire.com)';
    const fixture = unwrap(renderEditedMessagePlugin(createContentMessage(messageText), true));

    await waitFor(() => {
      expect(getMarkdown(fixture.editor)).toBe(messageText);
    });

    expect(getTextContent(fixture.editor)).toBe('bold\n\n\n\nitem\n\nlink');
  });

  it('serializes content added after restoring an edited message', async () => {
    const fixture = unwrap(renderEditedMessagePlugin(createContentMessage('**existing**'), true));

    await waitFor(() => {
      expect(getMarkdown(fixture.editor)).toBe('**existing**');
    });

    act(() => {
      fixture.editor.update(
        () => {
          const paragraphNode = $createParagraphNode();
          paragraphNode.append($createTextNode('added'));
          $getRoot().append(paragraphNode);
        },
        {discrete: true},
      );
    });

    expect(getMarkdown(fixture.editor)).toBe('**existing**\nadded');
  });

  it.each(editedMessageStructureTestCases)(
    'restores $description and preserves its Markdown representation',
    async editedMessageStructureTestCase => {
      const fixture = unwrap(
        renderEditedMessagePlugin(createContentMessage(editedMessageStructureTestCase.messageText), true),
      );

      await waitFor(() => {
        expect(getMarkdown(fixture.editor)).toBe(editedMessageStructureTestCase.messageText);
      });

      expect(getTextContent(fixture.editor)).toBe(editedMessageStructureTestCase.expectedTextContent);
    },
  );

  it('keeps Markdown-looking text as text when preview mode is disabled', async () => {
    const messageText = '**bold**';
    const fixture = unwrap(renderEditedMessagePlugin(createContentMessage(messageText), false));

    await waitFor(() => {
      expect(getTextContent(fixture.editor)).toBe(messageText);
    });

    expect(getMarkdown(fixture.editor)).toBe(messageText);
  });

  it.each(mentionCharacterizationTestCases)(
    'restores $description as a custom mention node',
    async mentionCharacterizationTestCase => {
      const mention = new MentionEntity(
        mentionCharacterizationTestCase.mentionStartIndex,
        mentionCharacterizationTestCase.mentionLength,
        '00000000-0000-0000-0000-000000000001',
      );
      const message = createContentMessage(mentionCharacterizationTestCase.messageText, [mention]);
      const fixture = unwrap(renderEditedMessagePlugin(message, true));

      await waitFor(() => {
        expect(getMentionTexts(fixture.editor)).toEqual([mentionCharacterizationTestCase.expectedMentionText]);
      });

      expect(getTextContent(fixture.editor)).toBe(mentionCharacterizationTestCase.expectedTextContent);
      expect(getMentionMarkdown(fixture.editor, [mentionCharacterizationTestCase.expectedMentionText])).toBe(
        'Hello <mention>@Alice</mention>!',
      );
    },
  );

  it('restores mentions as custom nodes when preview mode is disabled', async () => {
    const messageText = 'Hello @Alice!';
    const mention = new MentionEntity(6, 6, '00000000-0000-0000-0000-000000000001');
    const fixture = unwrap(renderEditedMessagePlugin(createContentMessage(messageText, [mention]), false));

    await waitFor(() => {
      expect(getMentionTexts(fixture.editor)).toEqual(['@Alice']);
    });

    expect(getTextContent(fixture.editor)).toBe(messageText);
    expect(getMentionMarkdown(fixture.editor, ['@Alice'])).toBe('Hello <mention>@Alice</mention>!');
  });

  it('replaces the previous editor contents when the edited message changes', async () => {
    const firstMessage = createContentMessage('first message');
    const secondMessage = createContentMessage('second message');
    const fixture = unwrap(renderEditedMessagePlugin(firstMessage, true));

    await waitFor(() => {
      expect(getTextContent(fixture.editor)).toBe('first message');
    });

    fixture.rerender(
      <LexicalComposer initialConfig={{...editorConfig, onError: throwEditorError}}>
        <EditorCapturePlugin onReady={noop} />
        <EditedMessagePlugin message={secondMessage} showMarkdownPreview />
      </LexicalComposer>,
    );

    await waitFor(() => {
      expect(getTextContent(fixture.editor)).toBe('second message');
    });
  });
});
