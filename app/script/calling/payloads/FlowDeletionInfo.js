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
window.z.calling = z.calling || {};
window.z.calling.payloads = z.calling.payloads || {};

z.calling.payloads.FlowDeletionReason = {
  RELEASED: 'released',
  TIMEOUT: 'timeout',
};

z.calling.payloads.FlowDeletionInfo = class FlowDeletionInfo {
  /**
   * Object to keep an flow deletion information.
   *
   * @param {string} conversation_id - Conversation ID
   * @param {string} flow_id - Flow ID
   * @param {z.calling.payloads.FlowDeletionReason} reason - Reason for flow to be deleted
   */
  constructor(conversation_id, flow_id, reason) {
    this.conversation_id = conversation_id;
    this.flow_id = flow_id;
    this.reason = reason;
  }
};
