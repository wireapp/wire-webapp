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

import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

import {User} from '../../../../../repositories/entity/User';
import {translateForTest} from '../../../../../util/test/translateForTest';

import {
  createWireLexicalEditorTestHarness,
  WireLexicalEditorTestHarness,
} from '../testSupport/createWireLexicalEditorTestHarness';
import {$createMentionNode} from '../nodes/mentionNode';

import {parseMentions} from './parseMentions';

type CreateTestUserOptions = {
  readonly userId: string;
  readonly userName: string;
  readonly userDomain?: string;
};

type MentionEditorContentOptions = {
  readonly harness: WireLexicalEditorTestHarness;
  readonly text: string;
  readonly mentionValues: string[];
};

type ParsedMentionValue = {
  readonly startIndex: number;
  readonly length: number;
  readonly userId: string;
  readonly domain: string | undefined;
};

function createTestUser(testUserOptions: CreateTestUserOptions): User {
  const {userId, userName, userDomain} = testUserOptions;
  const user = new User(userId, userDomain ?? '', translateForTest);
  user.name(userName);

  return user;
}

function setMentionEditorContent(mentionEditorContentOptions: MentionEditorContentOptions): void {
  const {harness, text, mentionValues} = mentionEditorContentOptions;
  harness.editor.update(
    () => {
      const paragraph = $createParagraphNode();
      let textStartIndex = 0;

      mentionValues.forEach(function (mentionValue: string): void {
        const mentionText = `@${mentionValue}`;
        const mentionStartIndex = text.indexOf(mentionText, textStartIndex);

        if (mentionStartIndex === -1) {
          throw new Error(`Mention ${mentionText} was not found in ${text}`);
        }

        const textBeforeMention = text.slice(textStartIndex, mentionStartIndex);
        if (textBeforeMention.length > 0) {
          paragraph.append($createTextNode(textBeforeMention));
        }

        paragraph.append($createMentionNode('@', mentionValue));
        textStartIndex = mentionStartIndex + mentionText.length;
      });

      const textAfterMentions = text.slice(textStartIndex);
      if (textAfterMentions.length > 0) {
        paragraph.append($createTextNode(textAfterMentions));
      }

      $getRoot().clear();
      $getRoot().append(paragraph);
    },
    {discrete: true},
  );
}

function getParsedMentionValues(mentionEntities: ReturnType<typeof parseMentions>): ParsedMentionValue[] {
  return mentionEntities.map(mentionEntity => {
    return {
      startIndex: mentionEntity.startIndex,
      length: mentionEntity.length,
      userId: mentionEntity.userId,
      domain: mentionEntity.domain,
    };
  });
}

describe('parseMentions', () => {
  it('returns no entities when the editor contains no mention nodes', () => {
    const harness = createWireLexicalEditorTestHarness();
    const user = createTestUser({userId: 'alice-id', userName: 'Alice'});

    setMentionEditorContent({harness, text: 'ordinary text', mentionValues: []});

    const actualMentions = getParsedMentionValues(parseMentions(harness.editor, 'ordinary text', [user]));
    const expectedMentions: ParsedMentionValue[] = [];

    expect(actualMentions).toEqual(expectedMentions);
  });

  it('returns the entity for one allowed mention with its text position', () => {
    const harness = createWireLexicalEditorTestHarness();
    const user = createTestUser({userId: 'alice-id', userName: 'Alice'});

    setMentionEditorContent({harness, text: 'Hello @Alice!', mentionValues: ['Alice']});

    const actualMentions = getParsedMentionValues(parseMentions(harness.editor, 'Hello @Alice!', [user]));
    const expectedMentions: ParsedMentionValue[] = [{startIndex: 6, length: 6, userId: 'alice-id', domain: ''}];

    expect(actualMentions).toEqual(expectedMentions);
  });

  it('returns multiple mentions in document order even when users are supplied in another order', () => {
    const harness = createWireLexicalEditorTestHarness();
    const alice = createTestUser({userId: 'alice-id', userName: 'Alice'});
    const bob = createTestUser({userId: 'bob-id', userName: 'Bob'});
    const text = '@Bob and @Alice';

    setMentionEditorContent({harness, text, mentionValues: ['Bob', 'Alice']});

    const actualMentions = getParsedMentionValues(parseMentions(harness.editor, text, [alice, bob]));
    const expectedMentions: ParsedMentionValue[] = [
      {startIndex: 0, length: 4, userId: 'bob-id', domain: ''},
      {startIndex: 9, length: 6, userId: 'alice-id', domain: ''},
    ];

    expect(actualMentions).toEqual(expectedMentions);
  });

  it('returns repeated mentions for the same user at their individual positions', () => {
    const harness = createWireLexicalEditorTestHarness();
    const user = createTestUser({userId: 'alice-id', userName: 'Alice'});
    const text = '@Alice and @Alice';

    setMentionEditorContent({harness, text, mentionValues: ['Alice', 'Alice']});

    const actualMentions = getParsedMentionValues(parseMentions(harness.editor, text, [user]));
    const expectedMentions: ParsedMentionValue[] = [
      {startIndex: 0, length: 6, userId: 'alice-id', domain: ''},
      {startIndex: 11, length: 6, userId: 'alice-id', domain: ''},
    ];

    expect(actualMentions).toEqual(expectedMentions);
  });

  it('omits a mention whose user is not among the candidates', () => {
    const harness = createWireLexicalEditorTestHarness();
    const user = createTestUser({userId: 'alice-id', userName: 'Alice'});

    setMentionEditorContent({harness, text: 'Hello @Unknown!', mentionValues: ['Unknown']});

    const actualMentions = getParsedMentionValues(parseMentions(harness.editor, 'Hello @Unknown!', [user]));
    const expectedMentions: ParsedMentionValue[] = [];

    expect(actualMentions).toEqual(expectedMentions);
  });

  it('preserves the user domain on a federated mention', () => {
    const harness = createWireLexicalEditorTestHarness();
    const user = createTestUser({userId: 'alice-id', userName: 'Alice', userDomain: 'example.com'});

    setMentionEditorContent({harness, text: '@Alice', mentionValues: ['Alice']});

    const actualMentions = getParsedMentionValues(parseMentions(harness.editor, '@Alice', [user]));
    const expectedMentions: ParsedMentionValue[] = [
      {startIndex: 0, length: 6, userId: 'alice-id', domain: 'example.com'},
    ];

    expect(actualMentions).toEqual(expectedMentions);
  });
});

describe('parseMentions with a mention of everyone', () => {
  function setContent(harness: WireLexicalEditorTestHarness, build: () => void): void {
    harness.editor.update(
      () => {
        $getRoot().clear();
        build();
      },
      {discrete: true},
    );
  }

  it('maps a mention of everyone to an entity with no user, when it is available', () => {
    const harness = createWireLexicalEditorTestHarness();
    setContent(harness, () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('hi '), $createMentionNode('@', 'all', true), $createTextNode(' lunch?'));
      $getRoot().append(paragraph);
    });

    const [mention, ...rest] = parseMentions(harness.editor, 'hi @all lunch?', [], true);

    expect(rest).toHaveLength(0);
    expect(mention.isEveryone).toBe(true);
    expect(mention.startIndex).toBe(3);
    expect(mention.length).toBe(4);
  });

  it('sends a mention of everyone as plain text when it is not available', () => {
    const harness = createWireLexicalEditorTestHarness();
    setContent(harness, () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createMentionNode('@', 'all', true));
      $getRoot().append(paragraph);
    });

    expect(parseMentions(harness.editor, '@all', [], false)).toEqual([]);
  });

  it('maps a mention of a user named all to that user, not to everyone', () => {
    const harness = createWireLexicalEditorTestHarness();
    const userNamedAll = createTestUser({userId: 'all-user-id', userName: 'all'});
    setContent(harness, () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createMentionNode('@', 'all'));
      $getRoot().append(paragraph);
    });

    const [mention] = parseMentions(harness.editor, '@all', [userNamedAll], true);

    expect(mention.isEveryone).toBe(false);
    expect(mention.userId).toBe('all-user-id');
  });

  it('ignores plain text that reads @all', () => {
    const harness = createWireLexicalEditorTestHarness();
    setContent(harness, () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('@all'));
      $getRoot().append(paragraph);
    });

    expect(parseMentions(harness.editor, '@all', [], true)).toEqual([]);
  });
});
