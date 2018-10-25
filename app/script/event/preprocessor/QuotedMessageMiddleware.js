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

'use strict';

window.z = window.z || {};
window.z.event = z.event || {};
window.z.event.preprocessor = z.event.preprocessor || {};

z.event.preprocessor.QuotedMessageMiddleware = class QuotedMessageMiddleware {
  /**
   * Construct a new QuotedMessageMiddleware.
   * This class is reponsible for parsing incomming text messages that contains quoted messages.
   * It will handle validating the quote and adding metadatas to the event.
   *
   * @param {z.event.EventRepository} eventRepository - Repository that handles events
   */
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
    this.logger = new z.util.Logger('z.event.preprocessor.QuotedMessageMiddleware', z.config.LOGGER.OPTIONS);
  }

  processEvent(event) {
    return Promise.resolve(event);
  }
};
