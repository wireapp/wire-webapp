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

import create from 'zustand';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {Action, ModalContent, ModalItem, ModalOptions, ModalQueue, WarningModalType, Text} from './WarningModalTypes';
import {getLogger} from 'Util/Logger';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';
import {formatLocale} from 'Util/TimeUtil';
import {ClientNotificationData} from '../../../notification/PreferenceNotificationRepository';
import {Config} from '../../../Config';
import {createRandomUuid} from 'Util/util';

type WarningModalState = {
  errorMessage: string | null;
  queue: ModalQueue;
  currentModalContent: ModalContent | null;
  currentModalId: string | null;
  existsInQueue: (modalItem: ModalItem) => boolean;
  addToQueue: (modalItem: ModalItem) => void;
  removeFirstItemInQueue: () => void;
  replaceInQueue: (modalItem: ModalItem) => void;
  updateCurrentModalId: (nextCurrentModalId: string | null) => void;
  updateErrorMessage: (nextErrorMessage: string | null) => void;
  updateCurrentModalContent: (nextCurrentModaContent: ModalContent | null) => void;
};

const defaultContent: ModalContent = {
  checkboxLabel: '',
  closeBtnTitle: '',
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

const logger = getLogger('WarningModalState');

const useWarningModalState = create<WarningModalState>((set, get) => ({
  addToQueue: (modalItem: ModalItem) => set(state => ({...state, queue: [...state.queue, modalItem]})),
  currentModalContent: defaultContent,
  currentModalId: null,
  errorMessage: null,
  existsInQueue: (modalItem: ModalItem): boolean =>
    get().queue.findIndex(queueItem => queueItem.id === modalItem.id) !== -1,
  queue: [],
  removeFirstItemInQueue: () => set(state => ({...state, queue: state.queue.slice(1)})),
  replaceInQueue: (modalItem: ModalItem) =>
    set(state => {
      const updatedQueue = [...state.queue];
      const index = updatedQueue.findIndex(queueItem => queueItem.id === modalItem.id);
      updatedQueue[index] = modalItem;
      return {...state, queue: updatedQueue};
    }),
  updateCurrentModalContent: nextCurrentModaContent =>
    set(state => ({...state, currentModalContent: nextCurrentModaContent})),
  updateCurrentModalId: (nextCurrentModalId: string | null) =>
    set(state => ({...state, currentModalId: nextCurrentModalId})),
  updateErrorMessage: nextErrorMessage => set(state => ({...state, errorMessage: nextErrorMessage})),
}));

const onIncmoingModalEvent = (type: WarningModalType, options: ModalOptions, modalId = createRandomUuid()) => {
  const {currentModalId, existsInQueue, addToQueue, replaceInQueue} = useWarningModalState.getState();

  const alreadyOpen = modalId && modalId === currentModalId;
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

const showNextModalInQueue = () => {
  const {queue, removeFirstItemInQueue} = useWarningModalState.getState();
  if (queue.length > 0) {
    const nextModalToShow = queue[0];
    const {type, options, id} = nextModalToShow;
    updateCurrentModalContent(type, options, id);
    removeFirstItemInQueue();
  }
};

const updateCurrentModalContent = (type: WarningModalType, options: ModalOptions = {}, id?: string): void => {
  if (!Object.values(WarningModalType).includes(type)) {
    return logger.warn(`Modal of type '${type}' is not supported`);
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
    checkboxLabel: text.option ?? null,
    closeBtnTitle: text.closeBtnLabel,
    closeFn: close,
    closeOnConfirm,
    currentType: type,
    inputPlaceholder: text.input ?? null,
    messageHtml: text.htmlMessage ?? null,
    messageText: text.message ?? null,
    modalUie: type,
    onBgClick: preventClose ? noop : removeCurrentModal,
    primaryAction: primaryAction ?? null,
    secondaryAction: secondaryAction ?? null,
    showClose,
    titleText: text.title ?? null,
  };

  switch (type) {
    case WarningModalType.ACCOUNT_NEW_DEVICES: {
      content.titleText = t('modalAccountNewDevicesHeadline');
      content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
      content.secondaryAction = {...secondaryAction, text: t('modalAccountNewDevicesSecondary')};
      content.messageText = t('modalAccountNewDevicesMessage');
      const deviceList = (data as ClientNotificationData[])
        .map(device => {
          const deviceTime = formatLocale(device.time || new Date(), 'PP, p');
          const deviceModel = `${t('modalAccountNewDevicesFrom')} ${escape(device.model)}`;
          return `<div>${deviceTime} - UTC</div><div>${deviceModel}</div>`;
        })
        .join('');
      content.messageHtml = `<div class="modal__content__device-list">${deviceList}</div>`;
      break;
    }
    case WarningModalType.ACCOUNT_READ_RECEIPTS_CHANGED: {
      content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
      content.titleText = data
        ? t('modalAccountReadReceiptsChangedOnHeadline')
        : t('modalAccountReadReceiptsChangedOffHeadline');
      content.messageText = t('modalAccountReadReceiptsChangedMessage');
      break;
    }
    case WarningModalType.ACKNOWLEDGE: {
      content.primaryAction = {text: t('modalAcknowledgeAction'), ...primaryAction};
      content.titleText = text.title || t('modalAcknowledgeHeadline');
      content.messageText = (!text.htmlMessage && text.message) || null;
      break;
    }
    case WarningModalType.CONFIRM: {
      content.secondaryAction = {text: t('modalConfirmSecondary'), ...content.secondaryAction};
      break;
    }
    case WarningModalType.INPUT:
    case WarningModalType.PASSWORD:
    case WarningModalType.OPTION: {
      if (!hideSecondary) {
        content.secondaryAction = {text: t('modalOptionSecondary'), ...content.secondaryAction};
      }
      break;
    }
    case WarningModalType.SESSION_RESET: {
      content.titleText = t('modalSessionResetHeadline');
      content.primaryAction = {...primaryAction, text: t('modalAcknowledgeAction')};
      content.messageHtml = t('modalSessionResetMessage', {}, replaceLink(Config.getConfig().URL.SUPPORT.BUG_REPORT));
      break;
    }
  }
  if (content.secondaryAction) {
    const updatedSecondaryAction = Array.isArray(secondaryAction) ? secondaryAction : [secondaryAction];
    // force it into array format
    const uieNames = ['do-secondary', 'do-tertiary', 'do-quaternary'];
    content.secondaryAction = updatedSecondaryAction.map((action, index) => {
      const uieName = uieNames[index] || 'do-remaining';
      return {...action, uieName};
    });
  }

  const {updateCurrentModalContent, updateCurrentModalId} = useWarningModalState.getState();
  updateCurrentModalContent(content);
  updateCurrentModalId(id ?? null);
};

const removeCurrentModal = () => {
  const {currentModalContent, updateCurrentModalId} = useWarningModalState.getState();

  currentModalContent?.closeFn();
  updateCurrentModalId(null);
};

amplify.subscribe(WebAppEvents.WARNING.MODAL, onIncmoingModalEvent);

export {useWarningModalState, defaultContent, showNextModalInQueue, removeCurrentModal};
