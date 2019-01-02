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
window.z.viewModel = z.viewModel || {};

z.viewModel.ShortcutsViewModel = class ShortcutsViewModel {
  constructor(mainViewModel, repositories) {
    this.onMuteCall = this.onMuteCall.bind(this);
    this.onRejectCall = this.onRejectCall.bind(this);

    this.callingRepository = repositories.calling;
    this.logger = new z.util.Logger('z.viewModel.ShortcutsViewModel', z.config.LOGGER.OPTIONS);

    this.joinedCall = this.callingRepository.joinedCall;
    this.joinedCall.subscribe(callEntity => this._updateShortcutSubscription(callEntity));
  }

  _updateShortcutSubscription(callEntity) {
    this._unsubscribeShortcuts();

    if (callEntity) {
      switch (callEntity.state()) {
        case z.calling.enum.CALL_STATE.ONGOING:
        case z.calling.enum.CALL_STATE.OUTGOING:
          this._subscribeOutgoingOrOngoingCall();
          break;
        case z.calling.enum.CALL_STATE.INCOMING:
          this._subscribeIncomingCall();
          break;
        default:
          break;
      }
    }
  }

  _subscribeIncomingCall() {
    amplify.subscribe(z.event.WebApp.SHORTCUT.CALL_REJECT, this.onRejectCall);
  }

  _subscribeOutgoingOrOngoingCall() {
    amplify.subscribe(z.event.WebApp.SHORTCUT.CALL_MUTE, this.onMuteCall);
  }

  _unsubscribeShortcuts() {
    amplify.unsubscribe(z.event.WebApp.SHORTCUT.CALL_MUTE, this.onMuteCall);
    amplify.unsubscribe(z.event.WebApp.SHORTCUT.CALL_REJECT, this.onRejectCall);
  }

  onMuteCall() {
    if (this.joinedCall()) {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.joinedCall().id, z.media.MediaType.AUDIO);
    }
  }

  onRejectCall() {
    if (this.joinedCall()) {
      amplify.publish(z.event.WebApp.CALL.STATE.REJECT, this.joinedCall().id);
    }
  }
};
