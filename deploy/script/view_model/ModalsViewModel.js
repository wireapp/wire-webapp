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
  static get TYPE() {
    return {
      ACCOUNT_NEW_DEVICES: '.modal-account-new-devices',
      ACKNOWLEDGE: '.modal-template-acknowledge',
      CONFIRM: '.modal-template-confirm',
      INPUT: '.modal-template-input',
      OPTION: '.modal-template-option',
      SESSION_RESET: '.modal-session-reset',
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
   * @param {boolean} [options.preventClose] - Set to true to disable autoclose behavior
   * @param {Function} options.secondary - Called when secondary action in modal is triggered
   * @returns {undefined} No return value
   */
  showModal(type, options = {}) {
    const actionElement = $(type).find('.modal-action');
    const messageElement = $(type).find('.modal-text');
    const titleElement = $(type).find('.modal-title');

    switch (type) {
      case ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES:
        this._showModalAccountNewDevices(options.data);
        break;
      case ModalsViewModel.TYPE.ACKNOWLEDGE:
        this._showModalAcknowledge(options, titleElement, messageElement, actionElement);
        break;
      case ModalsViewModel.TYPE.CONFIRM:
        this._showModalConfirm(options, titleElement, messageElement, actionElement);
        break;
      case ModalsViewModel.TYPE.INPUT:
        this._showModalInput(options, titleElement, messageElement, actionElement);
        break;
      case ModalsViewModel.TYPE.OPTION:
        this._showModalOption(options, titleElement, messageElement, actionElement);
        break;
      default:
        this.logger.warn(`Modal of type '${type}' is not supported`);
    }

    const {preventClose = false, action: actionFn, close: closeFn, secondary: secondaryFn} = options;
    const modal = new z.ui.Modal(type, null, () => {
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

      if (typeof closeFn === 'function') {
        closeFn();
      }
    });

    $(type)
      .find('.modal-close')
      .click(() => modal.hide());

    $(type)
      .find('.modal-secondary')
      .click(() => {
        modal.hide(() => {
          if (typeof secondaryFn === 'function') {
            secondaryFn();
          }
        });
      });

    $(type)
      .find('.modal-action')
      .click(() => {
        if (typeof actionFn === 'function') {
          const checkbox = $(type).find('.modal-checkbox');
          const input = $(type).find('.modal-input');

          let parameter;
          if (checkbox.length) {
            parameter = checkbox.is(':checked');
            checkbox.prop('checked', false);
          } else if (input.length) {
            parameter = input.val();
            input.val('');
          }

          actionFn(parameter);
        }

        modal.hide();
      });

    if (!modal.isShown()) {
      this.logger.info(`Show modal of type '${type}'`);
    }

    modal.setAutoclose(!preventClose);
    modal.toggle();
  }

  _showModalAcknowledge(options, titleElement, messageElement, actionElement) {
    const {action: actionText, htmlMessage, message: messageText, title: titleText} = options.text;

    actionElement.text(actionText || z.l10n.text(z.string.modalAcknowledgeAction));
    if (htmlMessage) {
      messageElement.html(htmlMessage);
    } else {
      messageElement.text(messageText || '');
    }
    titleElement.text(titleText || z.l10n.text(z.string.modalAcknowledgeHeadline));

    if (options.warning !== false) {
      amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
    }
  }

  _showModalConfirm(options, titleElement, messageElement, actionElement) {
    const secondaryElement = $(ModalsViewModel.TYPE.CONFIRM).find('.modal-secondary');
    const {action: actionText, message: messageText, secondary, title: titleText} = options.text;

    const secondaryText = secondary || z.l10n.text(z.string.modalConfirmSecondary);

    actionElement.text(actionText || '');
    messageElement.text(messageText || '');
    secondaryElement.text(secondaryText);
    titleElement.text(titleText || '');

    if (options.warning !== false) {
      amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
    }
  }

  _showModalAccountNewDevices(devices) {
    const devicesElement = $(ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES).find('.modal-new-devices-list');

    devicesElement.empty();

    devices.map(device => {
      $('<div>')
        .text(`${moment(device.time).format('MMMM Do YYYY, HH:mm')} - UTC`)
        .appendTo(devicesElement);

      $('<div>')
        .text(`${z.l10n.text(z.string.modalAccountNewDevicesFrom)} ${device.model}`)
        .appendTo(devicesElement);
    });
  }

  _showModalOption(options, titleElement, messageElement, actionElement) {
    const secondaryElement = $(ModalsViewModel.TYPE.OPTION).find('.modal-secondary');
    const optionElement = $(ModalsViewModel.TYPE.OPTION).find('.modal-option-text');
    const {action: actionText, message: messageText, option: optionText, secondary, title: titleText} = options.text;

    const secondaryText = secondary || z.l10n.text(z.string.modalOptionSecondary);

    actionElement.text(actionText || '');
    messageElement.text(messageText || '');
    optionElement.text(optionText || '');
    secondaryElement.text(secondaryText);
    titleElement.text(titleText || '');

    if (options.warning !== false) {
      amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
    }
  }

  _showModalInput(options, titleElement, messageElement, actionElement) {
    const inputElement = $(ModalsViewModel.TYPE.INPUT).find('.modal-input');
    const {action: actionText, input: inputText, message: messageText, title: titleText} = options.text;

    actionElement.text(actionText || '');
    messageElement.text(messageText || '');
    inputElement.attr('placeholder', inputText || '');
    titleElement.text(titleText || '');

    if (options.warning !== false) {
      amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
    }
  }
};
