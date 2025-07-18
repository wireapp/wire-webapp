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

import React from 'react';

import {ClientNotificationData} from 'Repositories/notification/PreferenceNotificationRepository';

export interface ButtonAction {
  action?: Function;
  runActionOnEnterClick?: Boolean;
  uieName?: string;
  text?: React.ReactNode;
  disabled?: boolean;
}

export interface Text {
  htmlMessage?: string;
  input?: string;
  message?: React.ReactNode;
  option?: string;
  title?: string;
  closeBtnLabel?: string;
}

export type ModalSize = 'small' | 'medium' | 'large';

export interface ModalOptions {
  close?: () => void;
  closeOnSecondaryAction?: boolean;
  closeOnConfirm?: boolean;
  /** Set to `true` to add a password copy to clipboard button */
  copyPassword?: boolean;
  /** Content needed for visualization on modal */
  data?: ClientNotificationData[] | boolean;
  hideSecondary?: boolean;
  /** Set to `true` to disable autoclose behavior */
  preventClose?: boolean;
  /** Called when action in modal is triggered */
  primaryAction?: ButtonAction;
  /** Called when secondary action in modal is triggered */
  secondaryAction?: ButtonAction[] | ButtonAction;
  hideCloseBtn?: boolean;
  text?: Text;
  passwordOptional?: boolean;
  confirmCancelBtnLabel?: string;
  allButtonsFullWidth?: boolean;
  primaryBtnFirst?: boolean;
  size?: ModalSize;
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
  GUEST_LINK_PASSWORD = 'modal-template-guest-link-password',
  JOIN_GUEST_LINK_PASSWORD = 'modal-template-join-guest-link-password',
  PASSWORD_ADVANCED_SECURITY = 'modal-template-password-advance',
  SESSION_RESET = 'modal-session-reset',
  WITHOUT_TITLE = 'modal-without-title',
  LOADING = 'modal-loading',
}

export interface ModalContent {
  checkboxLabel: string;
  closeBtnTitle?: string;
  closeFn: () => void;
  closeOnSecondaryAction?: boolean;
  closeOnConfirm?: boolean;
  copyPassword?: boolean;
  currentType: string | PrimaryModalType;
  inputPlaceholder: string;
  message: React.ReactNode;
  /** @deprecated please use `message` instead */
  messageHtml?: string;
  modalUie: string;
  onBgClick: () => void;
  primaryAction: ButtonAction | null;
  secondaryAction: ButtonAction[] | ButtonAction | null;
  titleText: string;
  hideCloseBtn?: boolean;
  passwordOptional?: boolean;
  allButtonsFullWidth?: boolean;
  primaryBtnFirst?: boolean;
  size?: ModalSize;
}

export type ModalItem = {id: string; options: ModalOptions; type: PrimaryModalType};

export type ModalQueue = ModalItem[];
