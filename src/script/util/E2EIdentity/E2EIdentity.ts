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

import {container} from 'tsyringe';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ModalOptions, PrimaryModalType} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {Config} from 'src/script/Config';
import {Core} from 'src/script/service/CoreSingleton';
import {t} from 'Util/LocalizerUtil';
import {supportsMLS} from 'Util/util';

const shouldUseE2EI = () => supportsMLS() && Config.getConfig().FEATURE.ENABLE_E2EI;

const delayE2EI = (gracePeriodInMS: number) => {
  console.log('delay init in grace period');
};
const enrollE2EI = (discoveryUrl: string) => {
  const core = container.resolve(Core);
  void core.startE2EIEnrollment(discoveryUrl);
};

type NotifyUserAboutE2EIParams = {
  primaryCallback: () => void;
  secondaryCallback: () => void;
  showSecondary: boolean;
};
const notifyUserAboutE2EI = ({primaryCallback, secondaryCallback, showSecondary}: NotifyUserAboutE2EIParams) => {
  const modalOptions: ModalOptions = {
    primaryAction: {
      action: primaryCallback,
      text: t('acme.settingsChanged.button.primary'),
    },
    text: {
      closeBtnLabel: t('acme.settingsChanged.button.close'),
      htmlMessage: t('acme.settingsChanged.paragraph'),
      title: t('acme.settingsChanged.headline.alt'),
    },
    preventClose: true,
    showClose: false,
  };
  if (showSecondary) {
    modalOptions.secondaryAction = {
      action: secondaryCallback,
      text: t('acme.settingsChanged.button.secondary'),
    };
  }
  const modalType: PrimaryModalType = showSecondary ? PrimaryModal.type.CONFIRM : PrimaryModal.type.ACKNOWLEDGE;

  console.log(showSecondary, modalOptions);

  PrimaryModal.show(modalType, modalOptions);
};

interface InitE2EIParams {
  gracePeriodInMS: number;
  discoveryUrl: string;
}

export const initE2EI = ({discoveryUrl, gracePeriodInMS}: InitE2EIParams) => {
  if (shouldUseE2EI() || true) {
    notifyUserAboutE2EI({
      showSecondary: gracePeriodInMS > 0,
      primaryCallback: () => enrollE2EI(discoveryUrl),
      secondaryCallback: () => delayE2EI(gracePeriodInMS),
    });
  }
};
