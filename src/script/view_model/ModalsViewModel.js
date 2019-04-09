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

import Logger from 'utils/Logger';
import moment from 'moment';

import {t} from 'utils/LocalizerUtil';

const noop = () => {};
const defaultContent = {
  actionFn: noop,
  actionText: '',
  checkboxLabel: '',
  closeFn: noop,
  currentType: null,
  inputPlaceholder: '',
  messageHtml: '',
  messageText: '',
  modalUie: '',
  onBgClick: noop,
  secondaryFn: noop,
  secondaryText: '',
  titleText: '',
};

export class ModalsViewModel {
  static get TYPE() {
    return {
      ACCOUNT_NEW_DEVICES: 'modal-account-new-devices',
      ACCOUNT_READ_RECEIPTS_CHANGED: 'modal-account-read-receipts-changed',
      ACKNOWLEDGE: 'modal-template-acknowledge',
      CONFIRM: 'modal-template-confirm',
      INPUT: 'modal-template-input',
      OPTION: 'modal-template-option',
      SESSION_RESET: 'modal-session-reset',
    };
  }

  constructor() {
    this.logger = Logger('ModalsViewModel');
    this.elementId = 'modals';

    this.isVisible = ko.observable(false);
    this.optionChecked = ko.observable(false);
    this.inputValue = ko.observable('');
    this.content = ko.observable(defaultContent);

    amplify.subscribe(z.event.WebApp.WARNING.MODAL, this.showModal);

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
  showModal = (type, options = {}) => {
    if (!Object.values(ModalsViewModel.TYPE).includes(type)) {
      return this.logger.warn(`Modal of type '${type}' is not supported`);
    }

    const {text = {}, preventClose = false, close = noop, action = noop, secondary = noop, data} = options;
    const content = {
      actionFn: action,
      actionText: text.action,
      checkboxLabel: text.option,
      closeFn: close,
      currentType: type,
      inputPlaceholder: text.input,
      messageHtml: text.htmlMessage,
      messageText: text.message,
      modalUie: type,
      onBgClick: preventClose ? noop : this.hide,
      secondaryFn: secondary,
      secondaryText: text.secondary,
      titleText: text.title,
    };

    switch (type) {
      case ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES:
        content.titleText = t('modalAccountNewDevicesHeadline');
        content.actionText = t('modalAcknowledgeAction');
        content.secondaryText = t('modalAccountNewDevicesSecondary');
        content.messageText = t('modalAccountNewDevicesMessage');
        const deviceList = data
          .map(device => {
            const deviceTime = moment(device.time).format('MMMM Do YYYY, HH:mm');
            const deviceModel = `${t('modalAccountNewDevicesFrom')} ${device.model}`;
            return `<div>${deviceTime} - UTC</div><div>${deviceModel}</div>`;
          })
          .join('');
        content.messageHtml = `<div class="modal__content__device-list">${deviceList}</div>`;
        break;
      case ModalsViewModel.TYPE.ACCOUNT_READ_RECEIPTS_CHANGED:
        content.actionText = t('modalAcknowledgeAction');
        content.titleText = data
          ? t('modalAccountReadReceiptsChangedOnHeadline')
          : t('modalAccountReadReceiptsChangedOffHeadline');
        content.messageText = t('modalAccountReadReceiptsChangedMessage');
        break;
      case ModalsViewModel.TYPE.ACKNOWLEDGE:
        content.actionText = text.action || t('modalAcknowledgeAction');
        content.titleText = text.title || t('modalAcknowledgeHeadline');
        content.messageText = !text.htmlMessage && text.message;
        break;
      case ModalsViewModel.TYPE.CONFIRM:
        content.secondaryText = t('modalConfirmSecondary');
        break;
      case ModalsViewModel.TYPE.INPUT:
      case ModalsViewModel.TYPE.OPTION:
        content.secondaryText = text.secondary || t('modalOptionSecondary');
        break;
      case ModalsViewModel.TYPE.SESSION_RESET:
        content.titleText = t('modalSessionResetHeadline');
        content.actionText = t('modalAcknowledgeAction');
        const supportLink = z.util.URLUtil.buildSupportUrl(z.config.SUPPORT.FORM.BUG);
        content.messageHtml = `${t(
          'modalSessionResetMessage1'
        )}<a href="${supportLink}"rel="nofollow noopener noreferrer" target="_blank">${t(
          'modalSessionResetMessageLink'
        )}</a>${t('modalSessionResetMessage2')}`;
    }
    this.content(content);
    this.isVisible(true);
  };

  hasInput = () => this.content().currentType === ModalsViewModel.TYPE.INPUT;
  hasOption = () => this.content().currentType === ModalsViewModel.TYPE.OPTION;

  confirm = () => {
    if (this.content().currentType === ModalsViewModel.TYPE.OPTION) {
      return this.content().actionFn(this.optionChecked());
    }
    if (this.content().currentType === ModalsViewModel.TYPE.INPUT) {
      return this.content().actionFn(this.inputValue());
    }
    this.content().actionFn();
  };

  doAction = () => {
    this.confirm();
    this.hide();
  };

  doSecondary = () => {
    this.content().secondaryFn();
    this.hide();
  };

  hide = () => {
    this.isVisible(false);
    this.content().closeFn();
  };

  onModalHidden = () => {
    this.content(defaultContent);
    this.inputValue('');
    this.optionChecked(false);
  };
}
