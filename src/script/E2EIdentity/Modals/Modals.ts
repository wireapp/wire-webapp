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

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ModalOptions, PrimaryModalType} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {Config} from 'src/script/Config';
import {replaceLink, t} from 'Util/LocalizerUtil';

const hideSecondaryBtn = {hideSecondary: true};
const hideCloseBtn = {hideCloseBtn: true, preventClose: true};

export enum ModalType {
  ENROLL = 'enroll',
  ERROR = 'error',
  SUCCESS = 'success',
  LOADING = 'loading',
  CERTIFICATE_RENEWAL = 'certificate_renewal',
  SELF_CERTIFICATE_REVOKED = 'self_certificate_revoked',
  SNOOZE_REMINDER = 'snooze_reminder',
  DOWNLOAD_PATH_CHANGED = 'download_path_changed',
}

interface GetModalOptions {
  type: ModalType;
  primaryActionFn?: () => void;
  secondaryActionFn?: () => void;
  hideSecondary?: boolean;
  hidePrimary?: boolean;
  hideClose?: boolean;
  extraParams?: {
    /** time left to remind the user again (only for enroll and renewal modal types). */
    delayTime?: string;

    /** Flag indicating if this is a renewal action */
    isRenewal?: boolean;

    /** Flag indicating if the grace period is over (only for enroll, renew or error modals) */
    isGracePeriodOver?: boolean;
  };
}
export const getModalOptions = ({
  type,
  primaryActionFn,
  secondaryActionFn,
  hidePrimary = false,
  hideSecondary = false,
  hideClose = true,
  extraParams,
}: GetModalOptions) => {
  if (!secondaryActionFn) {
    hideSecondary = true;
  }
  let options: ModalOptions = {};
  let modalType: PrimaryModalType = PrimaryModal.type.CONFIRM;
  const replaceLearnMore = replaceLink('learnMore');
  const svgHtml = `
  <div style="margin-bottom: 24px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M60 32V7.48786L32 0L4 8V32C4 48 16.0287 60.3908 32 64C48.1374 60.3908 60 48 60 32ZM52 21.3829L27.4086 48L12 31.3842L16.9238 26.0013L27.4086 37.2342L47.0762 16L52 21.3829Z" fill="#1D7833"/>
      </svg>
  </div>
  `;

  const supportUrl = Config.getConfig().URL.SUPPORT.E2EI_VERIFICATION_CERTIFICATE;

  const gracePeriodOverParagraph = t(
    'acme.settingsChanged.gracePeriodOver.paragraph',
    {url: supportUrl},
    {
      br: '<br>',
      ...replaceLearnMore,
    },
  );

  const settingsChangedParagraph = t(
    'acme.settingsChanged.paragraph',
    {url: supportUrl},
    {
      br: '<br>',
      ...replaceLearnMore,
    },
  );

  switch (type) {
    case ModalType.ENROLL:
      options = {
        text: {
          closeBtnLabel: t('acme.settingsChanged.button.close'),
          htmlMessage: extraParams?.isGracePeriodOver ? gracePeriodOverParagraph : settingsChangedParagraph,
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

    case ModalType.CERTIFICATE_RENEWAL:
      options = {
        text: {
          closeBtnLabel: t('acme.renewCertificate.button.close'),
          htmlMessage: extraParams?.isGracePeriodOver
            ? t('acme.renewCertificate.gracePeriodOver.paragraph', {url: supportUrl})
            : t('acme.renewCertificate.paragraph', {url: supportUrl}),
          title: t('acme.renewCertificate.headline.alt'),
        },
        primaryAction: {
          action: primaryActionFn,
          text: t('acme.renewCertificate.button.primary'),
        },
        secondaryAction: {
          action: secondaryActionFn,
          text: t('acme.renewCertificate.button.secondary'),
        },
        ...hideCloseBtn,
      };
      modalType =
        hideSecondary || secondaryActionFn === undefined ? PrimaryModal.type.ACKNOWLEDGE : PrimaryModal.type.CONFIRM;
      break;

    case ModalType.SELF_CERTIFICATE_REVOKED:
      options = {
        text: {
          htmlMessage: t('acme.selfCertificateRevoked.text'),
          title: t('acme.selfCertificateRevoked.title'),
        },
        primaryAction: {
          action: primaryActionFn,
          text: t('acme.selfCertificateRevoked.button.primary'),
        },
        confirmCancelBtnLabel: t('acme.selfCertificateRevoked.button.cancel'),
        allButtonsFullWidth: true,
        primaryBtnFirst: true,
      };
      modalType = PrimaryModal.type.CONFIRM;
      break;

    case ModalType.SNOOZE_REMINDER:
      options = {
        text: {
          closeBtnLabel: t('acme.settingsChanged.button.close'),
          htmlMessage: t('acme.remindLater.paragraph', {
            delayTime: extraParams?.delayTime ?? 0,
            url: supportUrl,
          }),
          title: t('acme.settingsChanged.headline.alt'),
        },
        primaryAction: {
          action: primaryActionFn,
          text: t('acme.remindLater.button.primary'),
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
          htmlMessage: extraParams?.isGracePeriodOver
            ? t('acme.error.gracePeriod.paragraph', undefined, {br: '<br>'})
            : t('acme.error.paragraph', undefined, {br: '<br>'}),
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
        hideSecondary || secondaryActionFn === undefined ? PrimaryModal.type.ACKNOWLEDGE : PrimaryModal.type.CONFIRM;
      break;

    case ModalType.LOADING:
      options = {
        text: {
          title: extraParams?.isRenewal ? t('acme.renewal.inProgress.headline') : t('acme.inProgress.headline'),
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
          htmlMessage: `<div style="text-align: center">${svgHtml}${
            extraParams?.isRenewal
              ? t('acme.renewal.done.paragraph', {url: supportUrl})
              : t('acme.done.paragraph', {url: supportUrl})
          }</div>`,
          title: extraParams?.isRenewal ? t('acme.renewal.done.headline') : t('acme.done.headline'),
        },
        primaryAction: {
          action: primaryActionFn,
          text: t('acme.done.button'),
        },
        secondaryAction: {
          action: secondaryActionFn,
          text: t('acme.done.button.secondary'),
        },
        ...hideCloseBtn,
      };
      modalType = PrimaryModal.type.ACKNOWLEDGE;
      break;

    case ModalType.DOWNLOAD_PATH_CHANGED:
      options = {
        hideCloseBtn: true,
        preventClose: true,
        text: {
          htmlMessage: t('featureConfigChangeModalDownloadPathEnabled'),

          title: t('featureConfigChangeModalDownloadPathHeadline', {
            brandName: Config.getConfig().BRAND_NAME,
          }),
        },
        primaryAction: {
          action: () => {
            amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
          },
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
