/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ModalOptions, PrimaryModalType} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {t} from 'Util/LocalizerUtil';

const hideSecondaryBtn = {hideSecondary: true};
const hideCloseBtn = {hideCloseBtn: true, preventClose: true};

export enum ModalType {
  ENROLL = 'enroll',
  ERROR = 'error',
  SUCCESS = 'success',
  LOADING = 'loading',
}

interface GetModalOptions {
  type: ModalType;
  primaryActionFn?: () => void;
  secondaryActionFn?: () => void;
  hideSecondary?: boolean;
  hidePrimary?: boolean;
  hideClose?: boolean;
}
export const getModalOptions = ({
  type,
  primaryActionFn,
  secondaryActionFn,
  hidePrimary = false,
  hideSecondary = false,
  hideClose = true,
}: GetModalOptions) => {
  if (!secondaryActionFn) {
    hideSecondary = true;
  }
  let options: ModalOptions = {};
  let modalType: PrimaryModalType = PrimaryModal.type.CONFIRM;
  switch (type) {
    case ModalType.ENROLL:
      options = {
        text: {
          closeBtnLabel: t('acme.settingsChanged.button.close'),
          htmlMessage: t('acme.settingsChanged.paragraph'),
          title: t('acme.settingsChanged.headline.alt'),
        },
        primaryAction: {
          action: primaryActionFn,
          text: t('acme.settingsChanged.button.primary'),
        },
        secondaryAction: {
          action: secondaryActionFn,
          text: t('acme.settingsChanged.button.secondary'),
        },
        ...hideCloseBtn,
      };
      modalType =
        hideSecondary || secondaryActionFn === undefined ? PrimaryModal.type.ACKNOWLEDGE : PrimaryModal.type.CONFIRM;
      break;

    case ModalType.ERROR:
      options = {
        text: {
          closeBtnLabel: t('acme.error.button.close'),
          htmlMessage: t('acme.error.paragraph'),
          title: t('acme.error.headline'),
        },
        primaryAction: {
          action: primaryActionFn,
          text: t('acme.error.button.primary'),
        },
        secondaryAction: {
          action: secondaryActionFn,
          text: t('acme.error.button.secondary'),
        },
      };
      modalType =
        hideSecondary || secondaryActionFn === undefined ? PrimaryModal.type.CONFIRM : PrimaryModal.type.ACKNOWLEDGE;
      break;

    case ModalType.LOADING:
      options = {
        text: {
          title: t('acme.inProgress.headline'),
        },
        ...hideCloseBtn,
      };
      // Needs to be changed to Loading spinner Modal
      modalType = PrimaryModalType.LOADING;
      break;

    case ModalType.SUCCESS:
      options = {
        text: {
          closeBtnLabel: t('acme.done.button.close'),
          htmlMessage: t('acme.done.paragraph'),
          title: t('acme.done.headline'),
        },
        primaryAction: {
          action: primaryActionFn,
          text: t('acme.done.button'),
        },
      };
      modalType = PrimaryModal.type.ACKNOWLEDGE;
      break;
  }

  if (hideClose) {
    options = {
      ...options,
      ...hideCloseBtn,
    };
  }

  if (hideSecondary || secondaryActionFn === undefined) {
    delete options.secondaryAction;
    options = {
      ...options,
      ...hideSecondaryBtn,
    };
  }

  if (hidePrimary) {
    delete options.primaryAction;
  }

  return {modalOptions: options, modalType};
};
