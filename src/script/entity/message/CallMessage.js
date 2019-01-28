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

import {t} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.entity = z.entity || {};

z.entity.CallMessage = class CallMessage extends z.entity.Message {
  constructor() {
    super();
    this.super_type = z.message.SuperType.CALL;
    this.call_message_type = '';
    this.finished_reason = '';

    this.caption = ko.pureComputed(() =>
      this.user().is_me ? t('conversationVoiceChannelDeactivateYou') : t('conversationVoiceChannelDeactivate')
    );
  }

  /**
   * Check if call message is call activation.
   * @returns {boolean} Is message of type activate
   */
  is_activation() {
    return this.call_message_type === z.message.CALL_MESSAGE_TYPE.ACTIVATED;
  }

  /**
   * Check if call message is call deactivation.
   * @returns {boolean} Is message of type deactivate
   */
  is_deactivation() {
    return this.call_message_type === z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
  }

  was_completed() {
    return this.finished_reason === z.calling.enum.TERMINATION_REASON.COMPLETED;
  }

  was_missed() {
    return this.finished_reason === z.calling.enum.TERMINATION_REASON.MISSED;
  }
};
