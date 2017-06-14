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
window.z.team = z.team || {};

z.team.TeamEntity = class TeamEntity {
  constructor(id) {
    this.creator = undefined;
    this.icon = '';
    this.icon_key = undefined;
    this.members = ko.observableArray([]);
    this.id = id;
    this.name = ko.observable('');

    this.conversations_archived = ko.observableArray([]);
    this.conversations_calls = ko.observableArray([]);
    this.conversations_cleared = ko.observableArray([]);
    this.conversations_unarchived = ko.observableArray([]);

    this.has_unread_conversation = ko.pureComputed(() => {
      for (const conversation_et of this.conversations_unarchived()) {
        if (!conversation_et.is_request() && !conversation_et.is_muted() && conversation_et.unread_message_count()) {
          return true;
        }
      }

      return false;
    });

    this.last_active_conversation = undefined;
  }
};
