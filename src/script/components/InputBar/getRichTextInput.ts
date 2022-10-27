/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {MentionEntity} from '../../message/MentionEntity';

const mentionAttributes = ' class="input-mention" data-uie-name="item-input-mention"';

const getPieces = (currentMentions: MentionEntity[], inputValue: string) => {
  const revertedCurrentMentions = currentMentions.slice().reverse();

  return revertedCurrentMentions.reduce(
    (currentPieces, mentionEntity) => {
      const currentPiece = currentPieces.shift();

      if (currentPiece) {
        currentPieces.unshift(currentPiece.slice(mentionEntity.endIndex));
        currentPieces.unshift(
          currentPiece.slice(mentionEntity.startIndex, mentionEntity.startIndex + mentionEntity.length),
        );
        currentPieces.unshift(currentPiece.slice(0, mentionEntity.startIndex));
      }

      return currentPieces;
    },
    [inputValue],
  );
};

const getRichTextInput = (currentMentions: MentionEntity[], inputValue: string) => {
  const pieces = getPieces(currentMentions, inputValue);

  return pieces
    .map((piece, index) => {
      const textPiece = piece.replace(/[\r\n]/g, '<br>');

      return `<span${index % 2 ? mentionAttributes : ''}>${textPiece}</span>`;
    })
    .join('')
    .replace(/<br><\/span>$/, '<br>&nbsp;</span>');
};

export {getRichTextInput};
