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

import {amplify} from 'amplify';

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {buildSupportUrl} from 'Util/UrlUtil';
import {noop, afterRender} from 'Util/util';
import {formatLocale} from 'Util/TimeUtil';

import {Config} from '../Config';
import {WebAppEvents} from '../event/WebApp';

const defaultContent = {
  checkboxLabel: '',
  closeFn: noop,
  currentType: null,
  inputPlaceholder: '',
  messageHtml: '',
  messageText: '',
  modalUie: '',
  onBgClick: noop,
  primaryAction: {},
  secondaryAction: [],
  titleText: '',
};

const States = {
  CLOSING: 'ModalState.CLOSING',
  NONE: 'ModalState.NONE',
  OPEN: 'ModalState.OPEN',
  READY: 'ModalState.READY',
};

const Types = {
  ACCOUNT_NEW_DEVICES: 'modal-account-new-devices',
  ACCOUNT_READ_RECEIPTS_CHANGED: 'modal-account-read-receipts-changed',
  ACKNOWLEDGE: 'modal-template-acknowledge',
  CONFIRM: 'modal-template-confirm',
  INPUT: 'modal-template-input',
  MULTI_ACTIONS: 'modal-multi-actions',
  OPTION: 'modal-template-option',
  PASSWORD: 'modal-template-password',
  SESSION_RESET: 'modal-session-reset',
};

export class ModalsViewModel {
  static get TYPE() {
    return Types;
  }

  constructor() {
    this.logger = getLogger('ModalsViewModel');
    this.elementId = 'modals';

    this.optionChecked = ko.observable(false);
    this.passwordValue = ko.observable('');
    this.inputValue = ko.observable('');
    this.inputFocus = ko.observable(false);
    this.content = ko.observable(defaultContent);
    this.state = ko.observable(States.NONE);
    this.queue = [];
    this.errorMessage = ko.observable('');
    this.actionEnabled = ko.pureComputed(() => !this.hasInput() || !!this.inputValue().trim().length);

    amplify.subscribe(WebAppEvents.WARNING.MODAL, this.showModal);
  }

  isModalVisible = () => this.state() === States.OPEN;

  showModal = (type, options, modalId) => {
    const found = modalId && this.queue.find(({id}) => id === modalId);
    const newModal = {id: modalId, options, type};
    if (found) {
      const foundIndex = this.queue.indexOf(found);
      this.queue[foundIndex] = newModal;
    } else {
      this.queue.push(newModal);
    }
    this.unqueue();
  };

  ready = () => {
    ko.applyBindings(this, document.getElementById(this.elementId));
    this.state(States.READY);
    this.unqueue();
  };

  unqueue = () => {
    if (this.state() === States.READY && this.queue.length) {
      const {type, options} = this.queue.shift();
      this._showModal(type, options);
    }
  };

  /**
   * Show modal
   *
   * @param {ModalsViewModel.TYPE} type Indicates which modal to show
   * @param {Object} [options={}] Information to configure modal
   * @param {Object} options.data Content needed for visualization on modal
   * @param {Function} options.action Called when action in modal is triggered
   * @param {boolean} [options.preventClose] Set to `true` to disable autoclose behavior
   * @param {Function} options.secondary Called when secondary action in modal is triggered
   * @returns {undefined} No return value
   */
  _showModal = (type, options = {}) => {
    if (!Object.values(Types).includes(type)) {
      return this.logger.warn(`Modal of type '${type}' is not supported`);
    }

    const {
      closeOnConfirm = true,
      close = noop,
      data,
      preventClose = false,
      primaryAction,
      secondaryAction,
      hideSecondary,
      showClose = false,
      text = {},
    } = options;
    const content = {
      checkboxLabel: text.option,
      closeFn: close,
      closeOnConfirm,
      currentType: type,
      inputPlaceholder: text.input,
      messageHtml: text.htmlMessage,
      messageText: text.message,
      modalUie: type,
      onBgClick: preventClose ? noop : this.hide,
      primaryAction,
      secondaryAction,
      showClose,
      titleText: text.title,
    };

    switch (type) {
      case Types.ACCOUNT_NEW_DEVICES: {
        content.titleText = t('modalAccountNewDevicesHeadline');
        content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
        content.secondaryAction = {...secondaryAction, text: t('modalAccountNewDevicesSecondary')};
        content.messageText = t('modalAccountNewDevicesMessage');
        const deviceList = data
          .map(device => {
            const deviceTime = formatLocale(device.time || new Date(), 'PP, p');
            const deviceModel = `${t('modalAccountNewDevicesFrom')} ${device.model}`;
            return `<div>${deviceTime} - UTC</div><div>${deviceModel}</div>`;
          })
          .join('');
        content.messageHtml = `<div class="modal__content__device-list">${deviceList}</div>`;
        break;
      }
      case Types.ACCOUNT_READ_RECEIPTS_CHANGED: {
        content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
        content.titleText = data
          ? t('modalAccountReadReceiptsChangedOnHeadline')
          : t('modalAccountReadReceiptsChangedOffHeadline');
        content.messageText = t('modalAccountReadReceiptsChangedMessage');
        break;
      }
      case Types.ACKNOWLEDGE: {
        content.primaryAction = {text: t('modalAcknowledgeAction'), ...primaryAction};
        content.titleText = text.title || t('modalAcknowledgeHeadline');
        content.messageText = !text.htmlMessage && text.message;
        break;
      }
      case Types.CONFIRM: {
        content.secondaryAction = {...content.secondaryAction, text: t('modalConfirmSecondary')};
        break;
      }
      case Types.INPUT:
      case Types.PASSWORD:
      case Types.OPTION: {
        if (!hideSecondary) {
          content.secondaryAction = {text: t('modalOptionSecondary'), ...content.secondaryAction};
        }
        break;
      }
      case Types.SESSION_RESET: {
        content.titleText = t('modalSessionResetHeadline');
        content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
        const supportLink = buildSupportUrl(Config.getConfig().SUPPORT.FORM.BUG);
        content.messageHtml = t(
          'modalSessionResetMessage',
          {},
          {'/link': '</a>', link: `<a href="${supportLink}"rel="nofollow noopener noreferrer" target="_blank">`},
        );
        break;
      }
      case Types.MULTI_ACTIONS: {
        // no additional actions needed for now
      }
    }
    if (content.secondaryAction) {
      // force it into array format
      const uieNames = ['do-secondary', 'do-tertiary', 'do-quaternary'];
      content.secondaryAction = [].concat(content.secondaryAction).map((action, index) => {
        const uieName = uieNames[index] || 'do-remaining';
        return {...action, uieName};
      });
    }
    this.content(content);
    this.state(States.OPEN);
    afterRender(() => this.inputFocus(true));
  };

  hasPassword = () => this.content().currentType === Types.PASSWORD;
  hasInput = () => this.content().currentType === Types.INPUT;
  hasOption = () => this.content().currentType === Types.OPTION;
  hasMultipleSecondary = () => this.content().currentType === Types.MULTI_ACTIONS;

  confirm = () => {
    const action = this.content().primaryAction.action;
    if (typeof action === 'function') {
      if (this.content().currentType === Types.OPTION) {
        return action(this.optionChecked());
      }
      if (this.content().currentType === Types.INPUT) {
        return action(this.inputValue());
      }
      if (this.content().currentType === Types.PASSWORD) {
        return action(this.passwordValue());
      }
      action();
    }
  };

  doAction = (action, closeAfter, skipValidation = false) => {
    if (!skipValidation && !this.actionEnabled()) {
      return;
    }
    if (typeof action === 'function') {
      action();
    }
    if (closeAfter) {
      this.hide();
    }
  };

  hide = () => {
    this.inputFocus(false);
    this.state(States.CLOSING);
    this.content().closeFn();
  };

  onModalHidden = () => {
    this.content(defaultContent);
    this.inputValue('');
    this.passwordValue('');
    this.errorMessage('');
    this.optionChecked(false);
    this.state(States.READY);
    this.unqueue();
  };
}

export const modals = new ModalsViewModel();
