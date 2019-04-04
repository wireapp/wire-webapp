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
export class ModalsViewModel {
  static get TYPE() {
    return {
      ACCOUNT_NEW_DEVICES: '.modal-account-new-devices',
      ACCOUNT_READ_RECEIPTS_CHANGED: '.modal-account-read-receipts-changed',
      ACKNOWLEDGE: '.modal-template-acknowledge',
      CONFIRM: '.modal-template-confirm',
      INPUT: '.modal-template-input',
      OPTION: '.modal-template-option',
      SESSION_RESET: '.modal-session-reset',
    };
  }

  constructor() {
    this.logger = Logger('ModalsViewModel');
    this.elementId = 'modals';

    this.currentType = ko.observable(null);

    this.titleText = ko.observable();
    this.actionText = ko.observable();
    this.secondaryText = ko.observable();
    this.messageText = ko.observable();
    this.inputText = ko.observable();
    this.messageHtml = ko.observable();
    this.optionText = ko.observable();
    this.modalUie = ko.observable();
    this.isVisible = ko.observable(false);
    this.onBgClick = ko.observable(noop);
    this.inputValue = ko.observable('');
    this.optionChecked = ko.observable(false);

    this.actionFn = noop;
    this.secondaryFn = noop;
    this.closeFn = noop;
    this.TYPE = ModalsViewModel.TYPE;

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
    this.titleText(text.title);
    this.actionText(text.action);
    this.secondaryText(text.secondary);
    this.messageText(text.message);
    this.inputText(text.input);
    this.messageHtml(text.htmlMessage);
    this.optionText(text.option);
    this.currentType(type);
    this.onBgClick(preventClose ? noop : this.hide);
    this.isVisible(true);
    this.actionFn = action;
    this.secondaryFn = secondary;
    this.closeFn = close;

    switch (type) {
      case ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES:
        this.modalUie('modal-account-new-devices');
        this.titleText(t('modalAccountNewDevicesHeadline'));
        this.actionText(t('modalAcknowledgeAction'));
        this.secondaryText(t('modalAccountNewDevicesSecondary'));
        this.messageText(t('modalAccountNewDevicesMessage'));
        const deviceList = data
          .map(device => {
            const deviceTime = moment(device.time).format('MMMM Do YYYY, HH:mm');
            const deviceModel = `${t('modalAccountNewDevicesFrom')} ${device.model}`;
            return `<div>${deviceTime} - UTC</div><div>${deviceModel}</div>`;
          })
          .join('');
        this.messageHtml(`<div class="modal__content__device-list">${deviceList}</div>`);
        break;
      case ModalsViewModel.TYPE.ACCOUNT_READ_RECEIPTS_CHANGED:
        this.modalUie('modal-account-new-devices');
        this.actionText(t('modalAcknowledgeAction'));
        this.titleText(
          data ? t('modalAccountReadReceiptsChangedOnHeadline') : t('modalAccountReadReceiptsChangedOffHeadline')
        );
        break;
      case ModalsViewModel.TYPE.ACKNOWLEDGE:
        this.modalUie('modal-account-new-devices');
        this.actionText(text.action || t('modalAcknowledgeAction'));
        this.titleText(text.title || t('modalAcknowledgeHeadline'));
        this.messageText(!text.htmlMessage && text.message);
        break;
      case ModalsViewModel.TYPE.CONFIRM:
        this.modalUie('modal-account-new-devices');
        this.secondaryText(t('modalConfirmSecondary'));
        break;
      case ModalsViewModel.TYPE.INPUT:
        this.modalUie('modal-account-new-devices');
        break;
      case ModalsViewModel.TYPE.OPTION:
        this.modalUie('modal-account-new-devices');
        this.secondaryText(text.secondary || t('modalOptionSecondary'));
        break;
      case ModalsViewModel.TYPE.SESSION_RESET:
        this.titleText(t('modalSessionResetHeadline'));
        this.actionText(t('modalAcknowledgeAction'));
        const supportLink = z.util.URLUtil.buildSupportUrl(z.config.SUPPORT.FORM.BUG);
        this.messageHtml(
          `${t(
            'modalSessionResetMessage1'
          )}<a href="${supportLink}"rel="nofollow noopener noreferrer" target="_blank">${t(
            'modalSessionResetMessageLink'
          )}</a>${t('modalSessionResetMessage2')}`
        );
    }
  };

  confirm = () => {
    if (this.currentType() === ModalsViewModel.TYPE.OPTION) {
      return this.actionFn(this.optionChecked());
    }
    if (this.currentType() === ModalsViewModel.TYPE.INPUT) {
      return this.actionFn(this.inputValue());
    }
  };

  doAction = () => {
    this.confirm();
    this.hide();
  };

  doSecondary = () => {
    this.secondaryFn();
    this.hide();
  };

  hide = () => {
    this.isVisible(false);
    this.closeFn();
  };

  onModalHidden = () => {
    this.currentType(null);
    this.titleText(null);
    this.actionText(null);
    this.secondaryText(null);
    this.messageText(null);
    this.inputText(null);
    this.messageHtml(null);
    this.optionText(null);
    this.modalUie('');
    this.onBgClick(noop);
    this.actionFn = noop;
    this.secondaryFn = noop;
    this.closeFn = noop;
    this.inputValue('');
    this.optionChecked(false);
  };
}
