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

z.viewModel.ModalsViewModel = class ModalsViewModel {
  static get CONSENT_TYPE() {
    return {
      INCOMING_CALL: 'incoming_call',
      MESSAGE: 'message',
      OUTGOING_CALL: 'outgoing_call',
    };
  }

  static get TYPE() {
    return {
      BLOCK: '.modal-block',
      BOTS_CONFIRM: '.modal-bots-confirm',
      BOTS_UNAVAILABLE: '.modal-bots-unavailable',
      CALL_EMPTY_CONVERSATION: '.modal-call-conversation-empty',
      CALL_NO_VIDEO_IN_GROUP: '.modal-call-no-video-in-group',
      CALL_START_ANOTHER: '.modal-call-second',
      CALLING: '.modal-calling',
      CLEAR: '.modal-clear',
      CLEAR_GROUP: '.modal-clear-group',
      CONNECTED_DEVICE: '.modal-connected-device',
      CONTACTS: '.modal-contacts',
      DELETE_ACCOUNT: '.modal-delete-account',
      DELETE_EVERYONE_MESSAGE: '.modal-delete-message-everyone',
      DELETE_MESSAGE: '.modal-delete-message',
      LEAVE: '.modal-leave',
      LOGOUT: '.modal-logout',
      NEW_DEVICE: '.modal-new-device',
      NOT_CONNECTED: '.modal-not-connected',
      REMOVE_DEVICE: '.modal-remove-device',
      SERVICE_UNAVAILABLE: '.modal-service-unavailable',
      SESSION_RESET: '.modal-session-reset',
      TOO_LONG_MESSAGE: '.modal-too-long-message',
      TOO_MANY_MEMBERS: '.modal-too-many-members',
      UPLOAD_PARALLEL: '.modal-asset-upload-parallel',
      UPLOAD_TOO_LARGE: '.modal-asset-upload-too-large',
    };
  }

  constructor() {
    this.logger = new z.util.Logger('z.viewModel.ModalsViewModel', z.config.LOGGER.OPTIONS);
    this.elementId = 'modals';

    this.modals = {};

    amplify.subscribe(z.event.WebApp.WARNING.MODAL, this.showModal.bind(this));

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  /**
   * Show modal
   *
   * @param {ModalsViewModel.TYPE} type - Indicates which modal to show
   * @param {Object} [options={}] - Information to configure modal
   * @param {Object} options.data - Content needed for visualization on modal
   * @param {Function} options.action - Called when action in modal is triggered
   * @returns {undefined} No return value
   */
  showModal(type, options = {}) {
    const actionElement = $(type).find('.modal-action');
    const messageElement = $(type).find('.modal-text');
    const titleElement = $(type).find('.modal-title');

    switch (type) {
      case ModalsViewModel.TYPE.BLOCK:
        this._showModalBlock(options.data, titleElement, messageElement);
        break;
      case ModalsViewModel.TYPE.BOTS_CONFIRM:
        this._showModalBotsConfirm(options.data, messageElement);
        break;
      case ModalsViewModel.TYPE.CALL_START_ANOTHER:
        this._showModalCallStartAnother(options.data, titleElement, messageElement);
        break;
      case ModalsViewModel.TYPE.CLEAR:
        type = this._showModalClear(options, type);
        break;
      case ModalsViewModel.TYPE.CONNECTED_DEVICE:
        this._showModalConnectedDevice(options.data);
        break;
      case ModalsViewModel.TYPE.LEAVE:
        this._showModalLeave(options.data, titleElement);
        break;
      case ModalsViewModel.TYPE.NEW_DEVICE:
        this._showModalNewDevice(options.data, titleElement, messageElement, actionElement);
        break;
      case ModalsViewModel.TYPE.NOT_CONNECTED:
        this._showModalNotConnected(options.data, messageElement);
        break;
      case ModalsViewModel.TYPE.REMOVE_DEVICE:
        this._showModalRemoveDevice(options.data, titleElement);
        break;
      case ModalsViewModel.TYPE.TOO_MANY_MEMBERS:
        this._showModalTooManyMembers(options.data, messageElement);
        break;
      case ModalsViewModel.TYPE.UPLOAD_PARALLEL:
        this._showModalUploadParallel(options.data, titleElement);
        break;
      case ModalsViewModel.TYPE.UPLOAD_TOO_LARGE:
        this._showModalUploadTooLarge(options.data, titleElement);
        break;
      case ModalsViewModel.TYPE.TOO_LONG_MESSAGE:
        this._showModalMessageTooLong(options.data, messageElement);
        break;
      default:
        this.logger.warn(`Modal of type '${type}' is not supported`);
    }

    const modal = new zeta.webapp.module.Modal(type, null, () => {
      $(type)
        .find('.modal-close')
        .off('click');

      $(type)
        .find('.modal-action')
        .off('click');

      $(type)
        .find('.modal-secondary')
        .off('click');

      modal.destroy();

      if (typeof options.close === 'function') {
        options.close();
      }
    });

    $(type)
      .find('.modal-close')
      .click(() => modal.hide());

    $(type)
      .find('.modal-secondary')
      .click(() => {
        modal.hide(() => {
          if (typeof options.secondary === 'function') {
            options.secondary();
          }
        });
      });

    $(type)
      .find('.modal-action')
      .click(() => {
        const checkbox = $(type).find('.modal-checkbox');
        const input = $(type).find('.modal-input');

        if (checkbox.length) {
          options.action(checkbox.is(':checked'));
          checkbox.prop('checked', false);
        } else if (input.length) {
          options.action(input.val());
          input.val('');
        } else if (typeof options.action === 'function') {
          options.action();
        }

        modal.hide();
      });

    if (!modal.is_shown()) {
      this.logger.info(`Show modal of type '${type}'`);
    }
    modal.toggle();
  }

  _showModalBlock(content, titleElement, messageElement) {
    titleElement.text(z.l10n.text(z.string.modalBlockConversationHeadline, content));
    messageElement.text(z.l10n.text(z.string.modalBlockConversationMessage, content));
  }

  _showModalBotsConfirm(content, messageElement) {
    messageElement.text(z.l10n.text(z.string.modalBotsConfirmMessage, content));
  }

  /**
   * Show modal for second call.
   *
   * @note Modal supports z.calling.enum.CALL_STATE.INCOMING, z.calling.enum.CALL_STATE.ONGOING, z.calling.enum.CALL_STATE.OUTGOING
   * @private
   *
   * @param {z.calling.enum.CALL_STATE} callState - Current call state
   * @param {jQuery} titleElement - Title element
   * @param {jQuery} messageElement - Message element
   * @returns {undefined} No return value
   */
  _showModalCallStartAnother(callState, titleElement, messageElement) {
    const action_element = $(ModalsViewModel.TYPE.CALL_START_ANOTHER).find('.modal-action');

    action_element.text(z.l10n.text(z.string[`modalCallSecond${callState}Action`]));
    messageElement.text(z.l10n.text(z.string[`modalCallSecond${callState}Message`]));
    titleElement.text(z.l10n.text(z.string[`modalCallSecond${callState}Headline`]));
  }

  _showModalClear(options, type) {
    if (options.conversation.is_group() && !options.conversation.removed_from_conversation()) {
      type = ModalsViewModel.TYPE.CLEAR_GROUP;
    }

    const titleElement = $(type).find('.modal-title');
    titleElement.text(z.l10n.text(z.string.modalClearConversationHeadline));

    return type;
  }

  _showModalConnectedDevice(devices) {
    const devicesElement = $(ModalsViewModel.TYPE.CONNECTED_DEVICE).find('.modal-connected-devices');

    devicesElement.empty();

    devices.map(device => {
      $('<div>')
        .text(`${moment(device.time).format('MMMM Do YYYY, HH:mm')} - UTC`)
        .appendTo(devicesElement);

      $('<div>')
        .text(`${z.l10n.text(z.string.modalConnectedDeviceFrom)} ${device.model}`)
        .appendTo(devicesElement);
    });
  }

  _showModalLeave(content, titleElement) {
    titleElement.text(z.l10n.text(z.string.modalLeaveConversationHeadline, content));
  }

  _showModalNewDevice(content, titleElement, messageElement, action_element) {
    let actionId;
    let messageId;
    const joinedNames = z.util.LocalizerUtil.joinNames(content.user_ets, z.string.Declension.NOMINATIVE);
    const substitutions = z.util.StringUtil.capitalize_first_char(joinedNames);

    let stringId;
    if (content.user_ets.length > 1) {
      stringId = z.string.modalNewDeviceHeadlineMany;
    } else {
      const isSelfUser = content.user_ets[0].is_me;
      stringId = isSelfUser ? z.string.modalNewDeviceHeadlineYou : z.string.modalNewDeviceHeadline;
    }
    titleElement.text(z.l10n.text(stringId, substitutions));

    switch (content.consent_type) {
      case ModalsViewModel.CONSENT_TYPE.INCOMING_CALL:
        messageId = z.string.modalNewDeviceCallIncoming;
        actionId = z.string.modalNewDeviceCallAccept;
        break;
      case ModalsViewModel.CONSENT_TYPE.OUTGOING_CALL:
        messageId = z.string.modalNewDeviceCallOutgoing;
        actionId = z.string.modalNewDeviceCallAnyway;
        break;
      default:
        messageId = z.string.modalNewDeviceMessage;
        actionId = z.string.modalNewDeviceSendAnyway;
    }

    messageElement.text(z.l10n.text(messageId));
    action_element.text(z.l10n.text(actionId));
  }

  _showModalNotConnected(content, messageElement) {
    const stringId = content ? z.string.modalNotConnectedMessageOne : z.string.modalNotConnectedMessageMany;
    messageElement.text(z.l10n.text(stringId, content));
  }

  _showModalRemoveDevice(content, titleElement) {
    titleElement.text(z.l10n.text(z.string.modalRemoveDeviceHeadline, content));
  }

  _showModalTooManyMembers(content, messageElement) {
    const substitutions = {number1: content.max, number2: content.open_spots};
    messageElement.text(z.l10n.text(z.string.modalTooManyMembersMessage, substitutions));
  }

  _showModalUploadParallel(content, titleElement) {
    titleElement.text(z.l10n.text(z.string.modalUploadsParallel, content));
  }

  _showModalUploadTooLarge(content, titleElement) {
    titleElement.text(z.l10n.text(z.string.conversationAssetUploadTooLarge, content));
  }

  _showModalMessageTooLong(content, messageElement) {
    messageElement.text(z.l10n.text(z.string.modalTooLongMessage, content));
  }
};
