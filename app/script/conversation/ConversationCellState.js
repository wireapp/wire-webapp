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
window.z.conversation = z.conversation || {};

z.conversation.ConversationCellState = (() => {

  const default_state = {
    description() {
      return '';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.NONE;
    },
  };

  const muted_state = {
    match(conversation_et) {
      return conversation_et.is_muted();
    },
    description() {
      return 'muted';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.MUTED;
    },
  };

  const new_message_state = {
    match(conversation_et) {
      return conversation_et.unread_message_count() > 0;
    },
    description() {
      return 'unread messages';
    },
    icon() {
      return z.conversation.ConversationStatusIcon.UNREAD_MESSAGES;
    },
  };

  function generate(conversation_et) {
    console.debug('generate');
    const states = [muted_state, new_message_state];
    const icon_state = states.find((state) => state.match(conversation_et));
    const description_state = states.find((state) => state.match(conversation_et));

    return {
      icon: (icon_state || default_state).icon(),
      description: (description_state || default_state).description(conversation_et),
    };
  }

  return {
    generate,
  };

})();
