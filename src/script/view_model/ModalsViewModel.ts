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
import {escape} from 'underscore';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {noop, afterRender} from 'Util/util';
import {formatLocale} from 'Util/TimeUtil';
import {onEscKey, offEscKey, isEnterKey, isSpaceKey} from 'Util/KeyboardUtil';

import {Config} from '../Config';
import type {ClientEntity} from '../client/ClientEntity';

interface Content {
  checkboxLabel: string;
  closeFn: Function;
  closeOnConfirm?: boolean;
  currentType: string;
  inputPlaceholder: string;
  messageHtml: string;
  messageText: string;
  modalUie: string;
  onBgClick: Function;
  primaryAction: Action;
  secondaryAction: Action[] | Action;
  titleText: string;
}

interface Action {
  action?: Function;
  text?: string;
}

interface Text {
  htmlMessage?: string;
  input?: string;
  message?: string;
  option?: string;
  title?: string;
}

interface ModalOptions {
  close?: Function;
  closeOnConfirm?: boolean;
  /** Content needed for visualization on modal */
  data?: ClientEntity[] | boolean;
  hideSecondary?: boolean;
  /** Set to `true` to disable autoclose behavior */
  preventClose?: boolean;
  /** Called when action in modal is triggered */
  primaryAction?: Action;
  /** Called when secondary action in modal is triggered */
  secondaryAction?: Action;
  showClose?: boolean;
  text?: Text;
}

const defaultContent: Content = {
  checkboxLabel: '',
  closeFn: noop,
  currentType: null,
  inputPlaceholder: '',
  messageHtml: '',
  messageText: '',
  modalUie: '',
  onBgClick: noop,
  primaryAction: {} as Action,
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
  logger: Logger;
  elementId: 'modals';
  optionChecked: ko.Observable<boolean>;
  passwordValue: ko.Observable<string>;
  inputValue: ko.Observable<string>;
  inputFocus: ko.Observable<boolean>;
  content: ko.Observable<Content>;
  state: ko.Observable<string>;
  currentId: ko.Observable<string>;
  queue: {id: string; options: ModalOptions; type: string}[];
  errorMessage: ko.Observable<string>;
  actionEnabled: ko.PureComputed<boolean>;

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
    this.currentId = ko.observable(null);
    this.queue = [];
    this.errorMessage = ko.observable('');
    this.actionEnabled = ko.pureComputed(() => !this.hasInput() || !!this.inputValue().trim().length);

    amplify.subscribe(WebAppEvents.WARNING.MODAL, this.showModal);
  }

  isModalVisible = () => this.state() === States.OPEN;

  showModal = (type: string, options: ModalOptions, modalId: string) => {
    const alreadyOpen = modalId && modalId === this.currentId();
    if (alreadyOpen) {
      return this.unqueue();
    }
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
      const {type, options, id} = this.queue.shift();
      this._showModal(type, options, id);
    }
  };

  /**
   * Show modal
   *
   * @param type Indicates which modal to show
   * @param id The optional ID of another modal to prevent multiple instances
   */
  private readonly _showModal = (type: string, options: ModalOptions = {} as ModalOptions, id?: string): void => {
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
      text = {} as Text,
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
        const deviceList = ((data as unknown) as ClientEntity[])
          .map(device => {
            const deviceTime = formatLocale(device.time || new Date(), 'PP, p');
            const deviceModel = `${t('modalAccountNewDevicesFrom')} ${escape(device.model)}`;
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
        content.secondaryAction = {text: t('modalConfirmSecondary'), ...content.secondaryAction};
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
        content.messageHtml = t(
          'modalSessionResetMessage',
          {},
          {
            '/link': '</a>',
            link: `<a href="${
              Config.getConfig().URL.SUPPORT.BUG_REPORT
            }"rel="nofollow noopener noreferrer" target="_blank">`,
          },
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
      (content.secondaryAction as Action[]) = [].concat(content.secondaryAction).map((action, index) => {
        const uieName = uieNames[index] || 'do-remaining';
        return {...action, uieName};
      }) as Action[];
    }
    this.content(content);
    this.state(States.OPEN);
    this.currentId(id);
    if (!preventClose) {
      onEscKey(this.hide);
    }
    window.addEventListener('keydown', this.handleEnterKey);
    afterRender(() => this.inputFocus(true));
  };

  handleEnterKey = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).tagName === 'BUTTON') {
      if (isSpaceKey(event) || isEnterKey(event)) {
        (event.target as HTMLElement).click();
      }
      event.stopPropagation();
      event.preventDefault();
    } else if (isEnterKey(event)) {
      this.doAction(this.confirm, this.content().closeOnConfirm);
    }
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

  doAction = (action: Function, closeAfter: boolean, skipValidation = false) => {
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
    offEscKey(this.hide);
    window.removeEventListener('keydown', this.handleEnterKey);
    this.inputFocus(false);
    this.state(States.CLOSING);
    this.content().closeFn();
    this.currentId(null);
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
