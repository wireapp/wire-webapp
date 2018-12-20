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
window.z.conversation = z.conversation || {};

z.conversation.EventInfoEntity = class EventInfoEntity {
  /**
   * Constructs a new event info entity.
   * @class z.conversation.EventInfoEntity
   * @param {z.proto.GenericMessage} [genericMessage] - Generic message
   * @param {string} [conversationId=''] - Conversation ID
   * @param {Object} options - Message sending options
   * @param {Array<string>|boolean} [options.nativePush=true] - Send native push notification for message
   * @param {Array<string>|boolean} [options.precondition=false] - Level that backend checks for missing clients
   * @param {Object} [options.recipients={}] - Message recipients
   * @param {number} timestamp - Timestamp of optimistic event
   */
  constructor(genericMessage, conversationId = '', options) {
    this.conversationId = conversationId;
    this.genericMessage = genericMessage;

    this.options = Object.assign({nativePush: true, precondition: false}, options);

    this.timestamp = undefined;
    this.type = undefined;
  }

  forceSending() {
    this.options.precondition = true;
  }

  getType() {
    return this.type ? this.type : this.genericMessage && this.genericMessage.content;
  }

  setTimestamp(time) {
    this.timestamp = new Date(time).getTime();
  }

  setType(type) {
    this.type = type;
  }

  updateOptions(updatedOptions) {
    this.options = Object.assign(this.options, updatedOptions);
  }
};
