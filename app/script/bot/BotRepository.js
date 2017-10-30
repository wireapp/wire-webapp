/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.bot = z.bot || {};

z.bot.BotRepository = class BotRepository {
  constructor(conversation_repository) {
    this.logger = new z.util.Logger('z.bot.BotRepository', z.config.LOGGER.OPTIONS);
    this.conversation_repository = conversation_repository;
  }

  /**
   * Add bot to conversation.
   * @param {string} botName - Bot name registered on backend
   * @param {boolean} [create_conversation=true] - A new conversation is created if true otherwise bot is added to active conversation
   * @returns {Promise} Resolves when bot was added to conversation
   */
  add_bot({botName, botProvider, botService}, create_conversation = true) {
    this.logger.info(`Info for bot '${botName}' retrieved.`, {botName, botProvider, botService});
    return Promise.resolve()
      .then(() => {
        if (create_conversation) {
          return this.conversation_repository.create_new_conversation([], botName);
        }
        return {conversation_et: this.conversation_repository.active_conversation()};
      })
      .then(({conversation_et}) => {
        this.conversation_repository.add_bot(conversation_et, botProvider, botService);
        amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et);
      })
      .catch(error => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.BOTS_UNAVAILABLE);
        throw error;
      });
  }
};
