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
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.ModalType = {
  BLOCK: '.modal-block',
  CALL_EMPTY_CONVERSATION: '.modal-call-conversation-empty',
  CALL_FULL_CONVERSATION: '.modal-call-conversation-full',
  CALL_FULL_VOICE_CHANNEL: '.modal-call-voice-channel-full',
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
  REMOVE_DEVICE: '.modal-remove-device',
  SESSION_RESET: '.modal-session-reset',
  TOO_LONG_MESSAGE: '.modal-too-long-message',
  TOO_MANY_MEMBERS: '.modal-too-many-members',
  UPLOAD_PARALLEL: '.modal-asset-upload-parallel',
  UPLOAD_TOO_LARGE: '.modal-asset-upload-too-large'
};

z.ViewModel.MODAL_CONSENT_TYPE = {
  INCOMING_CALL: 'incoming_call',
  MESSAGE: 'message',
  OUTGOING_CALL: 'outgoing_call'
};

z.ViewModel.ModalsViewModel = class ModalsViewModel {
  constructor(element_id) {
    this.logger = new z.util.Logger('z.ViewModel.ModalsViewModel', z.config.LOGGER.OPTIONS);

    this.modals = {};

    amplify.subscribe(z.event.WebApp.WARNING.MODAL, this.show_modal.bind(this));

    ko.applyBindings(this, document.getElementById(element_id));
  }

  /**
   * Show modal
   *
   * @param {z.ViewModel.ModalType} type - Indicates which modal to show
   * @param {Object} [options={}] - Information to configure modal
   * @param {Object} options.data - Content needed for visualization on modal
   * @param {Function} options.action - Called when action in modal is triggered
   * @returns {undefined} No return value
   */
  show_modal(type, options = {}) {
    const action_element = $(type).find('.modal-action');
    const message_element = $(type).find('.modal-text');
    const title_element = $(type).find('.modal-title');

    switch (type) {
      case z.ViewModel.ModalType.BLOCK:
        this._show_modal_block(options.data, title_element, message_element);
        break;
      case z.ViewModel.ModalType.CALL_FULL_CONVERSATION:
        this._show_modal_call_full_conversation(options.data, message_element);
        break;
      case z.ViewModel.ModalType.CALL_FULL_VOICE_CHANNEL:
        this._show_modal_call_full_voice_channel(options.data, message_element);
        break;
      case z.ViewModel.ModalType.CALL_START_ANOTHER:
        this._show_modal_call_start_another(options.data, title_element, message_element);
        break;
      case z.ViewModel.ModalType.CLEAR:
        type = this._show_modal_clear(options, type);
        break;
      case z.ViewModel.ModalType.CONNECTED_DEVICE:
        this._show_modal_connected_device(options.data);
        break;
      case z.ViewModel.ModalType.LEAVE:
        this._show_modal_leave(options.data, title_element);
        break;
      case z.ViewModel.ModalType.NEW_DEVICE:
        this._show_modal_new_device(options.data, title_element, message_element, action_element);
        break;
      case z.ViewModel.ModalType.REMOVE_DEVICE:
        this._show_modal_remove_device(options.data, title_element);
        break;
      case z.ViewModel.ModalType.TOO_MANY_MEMBERS:
        this._show_modal_too_many_members(options.data, message_element);
        break;
      case z.ViewModel.ModalType.UPLOAD_PARALLEL:
        this._show_modal_upload_parallel(options.data, title_element);
        break;
      case z.ViewModel.ModalType.UPLOAD_TOO_LARGE:
        this._show_modal_upload_too_large(options.data, title_element);
        break;
      case z.ViewModel.ModalType.TOO_LONG_MESSAGE:
        this._show_modal_message_too_long(options.data, message_element);
        break;
      default:
        this.logger.warn(`Modal of type '${type}' is not supported`);
    }

    const modal = new zeta.webapp.module.Modal(type, null, function() {
      $(type).find('.modal-close').off('click');

      $(type).find('.modal-action').off('click');

      $(type).find('.modal-secondary').off('click');

      modal.destroy();

      if (typeof options.close === 'function') {
        options.close();
      }
    });

    $(type).find('.modal-close').click(() => modal.hide());

    $(type).find('.modal-secondary').click(() => {
      modal.hide(() => {
        if (typeof options.secondary === 'function') {
          options.secondary();
        }
      });
    });

    $(type).find('.modal-action').click(function() {
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

  _show_modal_block(content, title_element, message_element) {
    title_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_block_conversation_headline,
        replace: {
          content: content,
          placeholder: '%@.name'
        }
      })
    );

    message_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_block_conversation_message,
        replace: {
          content: content,
          placeholder: '%@.name'
        }
      })
    );
  }

  _show_modal_call_full_conversation(content, message_element) {
    message_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_call_conversation_full_message,
        replace: {
          content: content,
          placeholder: '%no'
        }
      })
    );
  }

  _show_modal_call_full_voice_channel(content, message_element) {
    message_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_call_voice_channel_full_message,
        replace: {
          content: content,
          placeholder: '%no'
        }
      })
    );
  }

  /**
   * Show modal for second call.
   *
   * @note Modal supports z.calling.enum.CALL_STATE.INCOMING, z.calling.enum.CALL_STATE.ONGOING, z.calling.enum.CALL_STATE.OUTGOING
   * @private
   *
   * @param {z.calling.enum.CALL_STATE} call_state - Current call state
   * @param {jQuery} title_element - Title element
   * @param {jQuery} message_element - Message element
   * @returns {undefined} No return value
   */
  _show_modal_call_start_another(call_state, title_element, message_element) {
    const action_element = $(z.ViewModel.ModalType.CALL_START_ANOTHER).find('.modal-action');

    action_element.text(z.l10n.text(z.string[`modal_call_second_${call_state}_action`]));
    message_element.text(z.l10n.text(z.string[`modal_call_second_${call_state}_message`]));
    return title_element.text(z.l10n.text(z.string[`modal_call_second_${call_state}_headline`]));
  }

  _show_modal_clear(options, type) {
    if (options.conversation.is_group() && !options.conversation.removed_from_conversation()) {
      type = z.ViewModel.ModalType.CLEAR_GROUP;
    }

    const title_element = $(type).find('.modal-title');
    title_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_clear_conversation_headline,
        replace: {
          content: options.data,
          placeholder: '%@.name'
        }
      })
    );

    return type;
  }

  _show_modal_connected_device(devices) {
    const devices_element = $(z.ViewModel.ModalType.CONNECTED_DEVICE).find('.modal-connected-devices');

    devices_element.empty();

    devices.map(device => {
      $('<div>').text(`${moment(device.time).format('MMMM Do YYYY, HH:mm')} - UTC`).appendTo(devices_element);

      $('<div>').text(`${z.l10n.text(z.string.modal_connected_device_from)} ${device.model}`).appendTo(devices_element);
    });
  }

  _show_modal_leave(content, title_element) {
    title_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_leave_conversation_headline,
        replace: {
          content: content,
          placeholder: '%@.name'
        }
      })
    );
  }

  _show_modal_new_device(content, title_element, message_element, action_element) {
    let action_id, message_id;
    const joined_names = z.util.StringUtil.capitalize_first_char(
      z.util.LocalizerUtil.join_names(content.user_ets, z.string.Declension.NOMINATIVE)
    );

    let string_id;
    if (content.user_ets.length === 1) {
      string_id = content.user_ets[0].is_me
        ? z.string.modal_new_device_headline_you
        : z.string.modal_new_device_headline;
    } else {
      string_id = z.string.modal_new_device_headline_many;
    }

    title_element.text(
      z.localization.Localizer.get_text({
        id: string_id,
        replace: {
          content: joined_names,
          placeholder: content.user_ets.length === 1 ? '%@.name' : '%@.names'
        }
      })
    );

    switch (content.consent_type) {
      case z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL:
        message_id = z.string.modal_new_device_call_incoming;
        action_id = z.string.modal_new_device_call_accept;
        break;
      case z.ViewModel.MODAL_CONSENT_TYPE.OUTGOING_CALL:
        message_id = z.string.modal_new_device_call_outgoing;
        action_id = z.string.modal_new_device_call_anyway;
        break;
      default:
        message_id = z.string.modal_new_device_message;
        action_id = z.string.modal_new_device_send_anyway;
    }

    message_element.text(z.l10n.text(message_id));
    action_element.text(z.l10n.text(action_id));
  }

  _show_modal_remove_device(content, title_element) {
    title_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_remove_device_headline,
        replace: {
          content: content,
          placeholder: '%device_name'
        }
      })
    );
  }

  _show_modal_too_many_members(content, message_element) {
    message_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_too_many_members_message,
        replace: [
          {
            content: content.open_spots,
            placeholder: '%no'
          },
          {
            content: content.max,
            placeholder: '%max'
          }
        ]
      })
    );
  }

  _show_modal_upload_parallel(content, title_element) {
    title_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_uploads_parallel,
        replace: {
          content: content,
          placeholder: '%no'
        }
      })
    );
  }

  _show_modal_upload_too_large(content, title_element) {
    title_element.text(
      z.localization.Localizer.get_text({
        id: z.string.conversation_asset_upload_too_large,
        replace: {
          content: content,
          placeholder: '%no'
        }
      })
    );
  }

  _show_modal_message_too_long(content, message_element) {
    message_element.text(
      z.localization.Localizer.get_text({
        id: z.string.modal_too_long_message,
        replace: {
          content: content,
          placeholder: '%no'
        }
      })
    );
  }
};
