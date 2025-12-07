/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {isValid} from 'date-fns';
import {ClientNotificationData} from 'Repositories/notification/PreferenceNotificationRepository';
import {escape} from 'underscore';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {formatLocale} from 'Util/TimeUtil';
import {noop} from 'Util/util';
import {createUuid} from 'Util/uuid';
import {create} from 'zustand';

import {
  ButtonAction,
  ModalContent,
  ModalItem,
  ModalOptions,
  ModalQueue,
  PrimaryModalType,
  Text,
} from './PrimaryModalTypes';

import {Config} from '../../../Config';

type PrimaryModalState = {
  errorMessage: string | null;
  queue: ModalQueue;
  currentModalContent: ModalContent;
  currentModalId: string | null;
  existsInQueue: (modalItem: ModalItem) => boolean;
  addToQueue: (modalItem: ModalItem) => void;
  removeFirstItemInQueue: () => void;
  replaceInQueue: (modalItem: ModalItem) => void;
  updateCurrentModalId: (nextCurrentModalId: string | null) => void;
  updateErrorMessage: (nextErrorMessage: string | null) => void;
  updateCurrentModalContent: (nextCurrentModaContent: ModalContent) => void;
};

const defaultContent: ModalContent = {
  checkboxLabel: '',
  closeBtnTitle: '',
  closeFn: noop,
  currentType: '',
  inputPlaceholder: '',
  message: '',
  messageHtml: '',
  modalUie: '',
  onBgClick: noop,
  primaryAction: {} as ButtonAction,
  secondaryAction: [],
  titleText: '',
  copyPassword: false,
};

const logger = getLogger('PrimaryModalState');

const usePrimaryModalState = create<PrimaryModalState>((set, get) => ({
  addToQueue: (modalItem: ModalItem) => set(state => ({...state, queue: [...state.queue, modalItem]})),
  currentModalContent: defaultContent,
  currentModalId: null,
  errorMessage: null,
  existsInQueue: (modalItem: ModalItem): boolean =>
    get().queue.findIndex(queueItem => queueItem.id === modalItem.id) !== -1,
  queue: [],
  removeFirstItemInQueue: () => set(state => ({...state, queue: state.queue.slice(1)})),
  replaceInQueue: (modalItem: ModalItem) =>
    set(state => ({
      ...state,
      queue: state.queue.map(queueItem => (queueItem.id === modalItem.id ? modalItem : queueItem)),
    })),
  updateCurrentModalContent: nextCurrentModaContent =>
    set(state => ({...state, currentModalContent: nextCurrentModaContent})),
  updateCurrentModalId: (nextCurrentModalId: string | null) =>
    set(state => ({...state, currentModalId: nextCurrentModalId})),
  updateErrorMessage: nextErrorMessage => set(state => ({...state, errorMessage: nextErrorMessage})),
}));

const addNewModalToQueue = (type: PrimaryModalType, options: ModalOptions, modalId = createUuid()): void => {
  const {currentModalId, existsInQueue, addToQueue, replaceInQueue} = usePrimaryModalState.getState();

  const alreadyOpen = modalId === currentModalId;
  if (alreadyOpen) {
    return showNextModalInQueue();
  }
  const newModal = {id: modalId, options, type};
  const found = modalId && existsInQueue(newModal);
  if (found) {
    replaceInQueue(newModal);
  } else {
    addToQueue(newModal);
  }

  showNextModalInQueue();
};

const showNextModalInQueue = (): void => {
  const {queue, currentModalId, removeFirstItemInQueue} = usePrimaryModalState.getState();
  if (currentModalId) {
    // we already have a modal open which is awaiting a manual user action
    return;
  }
  if (queue.length > 0) {
    const nextModalToShow = queue[0];
    const {type, options, id} = nextModalToShow;
    updateCurrentModalContent(type, options, id);
    removeFirstItemInQueue();
  }
};

const updateCurrentModalContent = (type: PrimaryModalType, options: ModalOptions = {}, id?: string): void => {
  if (!Object.values(PrimaryModalType).includes(type)) {
    return logger.warn(`Modal of type '${type}' is not supported`);
  }

  const {
    close = noop,
    closeOnConfirm = true,
    copyPassword,
    data,
    preventClose = false,
    primaryAction,
    secondaryAction,
    hideSecondary,
    hideCloseBtn = false,
    passwordOptional = false,
    text = {} as Text,
    confirmCancelBtnLabel,
    allButtonsFullWidth = false,
    primaryBtnFirst = false,
    closeOnSecondaryAction = true,
    size = 'small',
    container,
  } = options;

  const content = {
    checkboxLabel: text.option ?? '',
    closeBtnTitle: text.closeBtnLabel,
    closeFn: close,
    closeOnConfirm,
    copyPassword,
    currentType: type,
    inputPlaceholder: text.input ?? '',
    messageHtml: text.htmlMessage,
    message: text.message,
    modalUie: type,
    onBgClick: preventClose ? noop : removeCurrentModal,
    primaryAction: primaryAction ?? null,
    secondaryAction: secondaryAction ?? null,
    hideCloseBtn,
    titleText: text.title ?? '',
    passwordOptional,
    confirmCancelBtnLabel,
    allButtonsFullWidth,
    primaryBtnFirst,
    closeOnSecondaryAction,
    size,
    container,
  };

  switch (type) {
    case PrimaryModalType.ACCOUNT_NEW_DEVICES: {
      content.titleText = t('modalAccountNewDevicesHeadline');
      content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
      content.secondaryAction = {...secondaryAction, text: t('modalAccountNewDevicesSecondary')};
      const deviceList = (data as ClientNotificationData[]).map(device => {
        const deviceDate = new Date(device.time);
        const deviceTime = isValid(deviceDate) ? new Date(deviceDate) : new Date();
        const formattedDate = formatLocale(deviceTime, 'PP, p');
        const deviceModel = `${t('modalAccountNewDevicesFrom')} ${escape(device.model)}`;
        return (
          <>
            <div>{formattedDate} - UTC</div>
            <div>{deviceModel}</div>
          </>
        );
      });
      content.message = (
        <>
          <div className="modal__content__device-list">{deviceList}</div>
          {t('modalAccountNewDevicesMessage')}
        </>
      );
      break;
    }
    case PrimaryModalType.ACCOUNT_READ_RECEIPTS_CHANGED: {
      content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
      content.titleText = data
        ? t('modalAccountReadReceiptsChangedOnHeadline')
        : t('modalAccountReadReceiptsChangedOffHeadline');
      content.message = t('modalAccountReadReceiptsChangedMessage');
      break;
    }
    case PrimaryModalType.ACKNOWLEDGE: {
      content.primaryAction = {text: t('modalAcknowledgeAction'), ...primaryAction};
      content.titleText = text.title || t('modalAcknowledgeHeadline');
      content.message = (!text.htmlMessage && text.message) || '';
      break;
    }
    case PrimaryModalType.WITHOUT_TITLE: {
      content.primaryAction = {...primaryAction};
      content.message = (!text.htmlMessage && text.message) || '';
      break;
    }
    case PrimaryModalType.CONFIRM: {
      content.secondaryAction = {
        text: content.confirmCancelBtnLabel || t('modalConfirmSecondary'),
        ...content.secondaryAction,
      };
      break;
    }
    case PrimaryModalType.INPUT:
    case PrimaryModalType.PASSWORD:
    case PrimaryModalType.OPTION: {
      if (!hideSecondary) {
        content.secondaryAction = {text: t('modalOptionSecondary'), ...content.secondaryAction};
        content.modalUie = PrimaryModalType.OPTION;
      }
      break;
    }
    case PrimaryModalType.SESSION_RESET: {
      content.titleText = t('modalSessionResetHeadline');
      content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
      content.messageHtml = t(
        'modalSessionResetMessage',
        undefined,
        replaceLink(Config.getConfig().URL.SUPPORT.BUG_REPORT),
      );
      break;
    }
  }
  if (content.secondaryAction) {
    const updatedSecondaryAction = Array.isArray(content.secondaryAction)
      ? content.secondaryAction
      : [content.secondaryAction];
    // force it into array format
    const uieNames = ['do-secondary', 'do-tertiary', 'do-quaternary'];
    content.secondaryAction = updatedSecondaryAction.map((action, index) => {
      const uieName = uieNames[index] || 'do-remaining';
      return {...action, uieName};
    });
  }

  const {updateCurrentModalContent, updateCurrentModalId} = usePrimaryModalState.getState();
  updateCurrentModalContent(content);
  updateCurrentModalId(id ?? null);
};

const removeCurrentModal = (): void => {
  const {currentModalContent, updateCurrentModalId} = usePrimaryModalState.getState();

  currentModalContent?.closeFn();
  updateCurrentModalId(null);
};

export {usePrimaryModalState, defaultContent, addNewModalToQueue, showNextModalInQueue, removeCurrentModal};
