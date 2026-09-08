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

import {MentionEntity} from '../../../../../message/mentionEntity';

import {createNodes} from './generateNodes';

type GenerateNodesTestCase = {
  readonly description: string;
  readonly messageText: string;
  readonly mentions: MentionEntity[];
  readonly expectedNodes: readonly {readonly data: string; readonly type: string}[];
};

const generateNodesTestCases: readonly GenerateNodesTestCase[] = [
  {
    description: 'text without mentions',
    messageText: 'ordinary text',
    mentions: [],
    expectedNodes: [{data: 'ordinary text', type: 'text'}],
  },
  {
    description: 'a mention at the beginning',
    messageText: '@Alice says hello',
    mentions: [new MentionEntity(0, 6, 'alice-id')],
    expectedNodes: [
      {data: '@Alice', type: 'Mention'},
      {data: ' says hello', type: 'text'},
    ],
  },
  {
    description: 'a mention between ordinary text',
    messageText: 'Hello @Alice!',
    mentions: [new MentionEntity(6, 6, 'alice-id')],
    expectedNodes: [
      {data: 'Hello ', type: 'text'},
      {data: '@Alice', type: 'Mention'},
      {data: '!', type: 'text'},
    ],
  },
  {
    description: 'multiple mentions supplied out of order',
    messageText: '@Alice and @Bob',
    mentions: [new MentionEntity(11, 4, 'bob-id'), new MentionEntity(0, 6, 'alice-id')],
    expectedNodes: [
      {data: '@Alice', type: 'Mention'},
      {data: ' and ', type: 'text'},
      {data: '@Bob', type: 'Mention'},
    ],
  },
  {
    description: 'repeated mentions of the same user',
    messageText: '@Alice and @Alice',
    mentions: [new MentionEntity(0, 6, 'alice-id'), new MentionEntity(11, 6, 'alice-id')],
    expectedNodes: [
      {data: '@Alice', type: 'Mention'},
      {data: ' and ', type: 'text'},
      {data: '@Alice', type: 'Mention'},
    ],
  },
  {
    description: 'a mention after Unicode text',
    messageText: '😀 @Alice',
    mentions: [new MentionEntity(3, 6, 'alice-id')],
    expectedNodes: [
      {data: '😀 ', type: 'text'},
      {data: '@Alice', type: 'Mention'},
    ],
  },
];

describe('createNodes', () => {
  it.each(generateNodesTestCases)('preserves the current behavior for $description', generateNodesTestCase => {
    const actualNodes = createNodes(generateNodesTestCase.mentions, generateNodesTestCase.messageText);
    const expectedNodes = generateNodesTestCase.expectedNodes;

    expect(actualNodes).toEqual(expectedNodes);
  });
});
