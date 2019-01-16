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

window.z = window.z || {};
window.z.util = z.util || {};

z.util.MessageComparator = {
  /**
   * Checks if two arrays with mentions contain different values.
   *
   * @param {z.entity.Message} originalMessageEntity - Message entity
   * @param {Array<z.message.MentionEntity>} [updatedMentions] - Updated mentions
   * @returns {boolean} Are the mentions different from each other
   */
  areMentionsDifferent: (originalMessageEntity, updatedMentions) => {
    const flattenToUserId = mentions => mentions.map(mention => mention.userId).sort();

    const existingMentions = flattenToUserId(originalMessageEntity.get_first_asset().mentions());
    updatedMentions = flattenToUserId(updatedMentions);

    const hasDifferentAmount = existingMentions.length !== updatedMentions.length;
    const hasDifferentUserIDs = existingMentions.some((userId, index) => userId !== updatedMentions[index]);

    return hasDifferentAmount || hasDifferentUserIDs;
  },
  /**
   * Checks if a given text is different from an already existing text on the message entity.
   *
   * @param {z.entity.Message} originalMessageEntity - Message entity
   * @param {string} textMessage - Message to compare with
   * @returns {boolean} Are text the same
   */
  isTextDifferent: (originalMessageEntity, textMessage) => {
    return textMessage !== originalMessageEntity.get_first_asset().text;
  },
};
