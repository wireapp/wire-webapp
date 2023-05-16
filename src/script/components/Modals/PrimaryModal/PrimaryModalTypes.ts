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

import {ClientNotificationData} from '../../../notification/PreferenceNotificationRepository';

export interface Action {
  action?: Function;
  uieName?: string;
  text?: string;
}

export interface Text {
  htmlMessage?: string;
  input?: string;
  message?: string;
  option?: string;
  title?: string;
  closeBtnLabel?: string;
}

export interface ModalOptions {
  close?: () => void;
  closeOnConfirm?: boolean;
  /** Content needed for visualization on modal */
  data?: ClientNotificationData[] | boolean;
  hideSecondary?: boolean;
  /** Set to `true` to disable autoclose behavior */
  preventClose?: boolean;
  /** Called when action in modal is triggered */
  primaryAction?: Action;
  /** Called when secondary action in modal is triggered */
  secondaryAction?: Action[] | Action;
  showClose?: boolean;
  text?: Text;
}

export enum PrimaryModalType {
  ACCOUNT_NEW_DEVICES = 'modal-account-new-devices',
  ACCOUNT_READ_RECEIPTS_CHANGED = 'modal-account-read-receipts-changed',
  ACKNOWLEDGE = 'modal-template-acknowledge',
  CONFIRM = 'modal-template-confirm',
  INPUT = 'modal-template-input',
  MULTI_ACTIONS = 'modal-multi-actions',
  OPTION = 'modal-template-option',
  PASSWORD = 'modal-template-password',
  SESSION_RESET = 'modal-session-reset',
  WITHOUT_TITLE = 'modal-without-title',
}

export interface ModalContent {
  checkboxLabel: string;
  closeFn: () => void;
  closeOnConfirm?: boolean;
  currentType: string;
  inputPlaceholder: string;
  messageHtml: string;
  messageText: string;
  modalUie: string;
  onBgClick: () => void;
  primaryAction: Action | null;
  secondaryAction: Action[] | Action | null;
  titleText: string;
  closeBtnTitle?: string;
  showClose?: boolean;
}

export type ModalItem = {id: string; options: ModalOptions; type: PrimaryModalType};

export type ModalQueue = ModalItem[];
