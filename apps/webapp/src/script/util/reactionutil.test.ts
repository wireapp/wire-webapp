/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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
 *
 */

import {ReactionMap} from 'Repositories/storage';
import {generateQualifiedId} from 'test/helper/UserGenerator';

import {addReaction, userReactionMapToReactionMap} from './reactionUtil';
import {createUuid} from './uuid';

describe('reactionUtil', () => {
  describe('userReactionMapToReactionMap', () => {
    it('converts a user reaction map to a reaction map', () => {
      const userId = {id: createUuid(), domain: ''};
      const userReactions = {[userId.id]: '👍,👎'};
      const reactionMap = userReactionMapToReactionMap(userReactions);

      expect(reactionMap).toEqual([
        ['👍', [userId]],
        ['👎', [userId]],
      ]);
    });

    it('converts multiple users reactions to a reaction map', () => {
      const userId = {id: createUuid(), domain: ''};
      const otherUserId = {id: createUuid(), domain: ''};
      const userReactions = {[userId.id]: '👍,👎', [otherUserId.id]: '👍,❤️'};
      const reactionMap = userReactionMapToReactionMap(userReactions);

      expect(reactionMap).toEqual([
        ['👍', [userId, otherUserId]],
        ['👎', [userId]],
        ['❤️', [otherUserId]],
      ]);
    });
  });

  describe('addReaction', () => {
    it('adds a single reaction', () => {
      const userId = generateQualifiedId();
      const updatedReactions = addReaction([], '👍', userId);

      expect(updatedReactions).toEqual([['👍', [userId]]]);
    });

    it('adds a new reaction to a reaction list', () => {
      const userId = generateQualifiedId();
      const reactions: ReactionMap = [['👎', [generateQualifiedId()]]];
      const updatedReactions = addReaction(reactions.slice(), '👍', userId);

      expect(updatedReactions).toEqual([...reactions, ['👍', [userId]]]);
    });

    it('adds a already existing reaction to a reaction list', () => {
      const userId = generateQualifiedId();
      const firstReactorId = generateQualifiedId();
      const reactions: ReactionMap = [['👍', [firstReactorId]]];
      const updatedReactions = addReaction(reactions.slice(), '👍', userId);

      expect(updatedReactions).toEqual([['👍', [firstReactorId, userId]]]);
    });

    it('removes a user reaction', () => {
      const userId = generateQualifiedId();
      const reactions: ReactionMap = [['👍', [userId]]];
      const updatedReactions = addReaction(reactions.slice(), '', userId);

      expect(updatedReactions).toEqual([]);
    });

    it('leaves other user reactions if a single reaction is removed', () => {
      const userId = generateQualifiedId();
      const reactions: ReactionMap = [
        ['👍', [userId]],
        ['👎', [userId]],
      ];
      const updatedReactions = addReaction(reactions.slice(), '👍', userId);

      expect(updatedReactions).toEqual([['👍', [userId]]]);
    });

    it('keeps the order at which the reactions were received', () => {
      const userId = generateQualifiedId();
      const reactorId = generateQualifiedId();
      const reactions: ReactionMap = [
        ['👍', [userId]],
        ['👎', [userId]],
      ];
      const updatedReactions = addReaction(reactions.slice(), '👍,❤️', reactorId);

      expect(updatedReactions).toEqual([
        ['👍', [userId, reactorId]],
        ['👎', [userId]],
        ['❤️', [reactorId]],
      ]);
    });
  });
});
