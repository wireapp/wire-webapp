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
window.z.entity = z.entity || {};


z.entity.Conversation = class Conversation {
  /**
   * Constructs a new conversation entity.
   * @class z.entity.Conversation
   * @param {string} conversation_id - Conversation ID
   */
  constructor(conversation_id = '') {
    this.id = conversation_id;
    this.creator = undefined;
    this.type = ko.observable();
    this.name = ko.observable();
    this.input = ko.observable(z.util.StorageUtil.get_value(`${z.storage.StorageKey.CONVERSATION.INPUT}|${this.id}`) || '');
    this.input.subscribe((text) => {
      return z.util.StorageUtil.set_value(`${z.storage.StorageKey.CONVERSATION.INPUT}|${this.id}`, text);
    });

    this.is_pending = ko.observable(false);
    this.is_loaded = ko.observable(false);

    this.participating_user_ets = ko.observableArray([]); // Does not include us
    this.participating_user_ids = ko.observableArray([]);
    this.self = undefined;
    this.number_of_participants = ko.pureComputed(() => {
      return this.participating_user_ids().length;
    });

    this.is_group = ko.pureComputed(() => this.type() === z.conversation.ConversationType.REGULAR);
    this.is_one2one = ko.pureComputed(() => this.type() === z.conversation.ConversationType.ONE2ONE);
    this.is_request = ko.pureComputed(() => this.type() === z.conversation.ConversationType.CONNECT);
    this.is_self = ko.pureComputed(() => this.type() === z.conversation.ConversationType.SELF);

    // in case this is a one2one conversation this is the connection to that user
    this.connection = ko.observable(new z.entity.Connection());
    this.connection.subscribe((connection_et) => {
      if (this.participating_user_ids().includes(connection_et.to)) {
        return this.participating_user_ids([connection_et.to]);
      }
    });

    // E2EE conversation states
  }
};
