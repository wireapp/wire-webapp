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
window.z.viewModel = z.viewModel || {};

z.viewModel.ShortcutsViewModel = class ShortcutsViewModel {
  constructor(mainViewModel, repositories) {
    this.on_mute_call = this.on_mute_call.bind(this);
    this.on_reject_call = this.on_reject_call.bind(this);

    this.calling_repository = repositories.calling;
    this.logger = new z.util.Logger('z.viewModel.ShortcutsViewModel', z.config.LOGGER.OPTIONS);

    this.joined_call = this.calling_repository.joinedCall;

    this.joined_call.subscribe(call_et => {
      this._update_shortcut_subscription(call_et);
    });
  }

  _update_shortcut_subscription(call_et) {
    this._unsubscribe_shortcuts();

    if (call_et) {
      switch (call_et.state()) {
        case z.calling.enum.CALL_STATE.ONGOING:
        case z.calling.enum.CALL_STATE.OUTGOING:
          this._subscribe_shortcuts_outgoing_ongoing();
          break;
        case z.calling.enum.CALL_STATE.INCOMING:
          this._subscribe_shortcuts_incoming();
          break;
        default:
          break;
      }
    }
  }

  _subscribe_shortcuts_incoming() {
    amplify.subscribe(z.event.WebApp.SHORTCUT.CALL_REJECT, this.on_reject_call);
  }

  _subscribe_shortcuts_outgoing_ongoing() {
    amplify.subscribe(z.event.WebApp.SHORTCUT.CALL_MUTE, this.on_mute_call);
  }

  _unsubscribe_shortcuts() {
    amplify.unsubscribe(z.event.WebApp.SHORTCUT.CALL_MUTE, this.on_mute_call);
    amplify.unsubscribe(z.event.WebApp.SHORTCUT.CALL_REJECT, this.on_reject_call);
  }

  on_mute_call() {
    if (this.joined_call()) {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.joined_call().id, z.media.MediaType.AUDIO);
    }
  }

  on_reject_call() {
    if (this.joined_call()) {
      amplify.publish(z.event.WebApp.CALL.STATE.REJECT, this.joined_call().id);
    }
  }
};
