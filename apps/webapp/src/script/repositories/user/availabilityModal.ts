/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {Availability} from '@wireapp/protocol-messaging';

import {PrimaryModal} from 'Components/modals/primaryModal';
import type {Substitutions, TranslationKey} from 'Util/localizerUtil';
import {loadValue, storeValue} from 'Util/storageUtil';

const initialKey = 'hide_initial_modal';

type Translate = (
  key: TranslationKey,
  substitutions?: Substitutions,
  dangerousSubstitutions?: Record<string, string>,
  skipEscaping?: boolean,
) => string;

function showModal(storageKey: string, title: string, message: string, translate: Translate): void {
  const hideModal = loadValue(storageKey);
  if (!hideModal) {
    PrimaryModal.show(
      PrimaryModal.type.OPTION,
      {
        hideSecondary: true,
        preventClose: true,
        primaryAction: {
          action: (dontShowAgain?: boolean) => {
            if (dontShowAgain) {
              storeValue(storageKey, 'true');
            }
          },
          text: translate('modalAcknowledgeAction'),
        },
        text: {
          message,
          option: translate('modalAvailabilityDontShowAgain'),
          title,
          closeBtnLabel: translate('modalAvailabilityRemoveBtn'),
        },
      },
      'availability',
      translate,
    );
  }
}

export function showAvailabilityModal(availability: Availability.Type, translate: Translate): void {
  if (availability !== Availability.Type.NONE) {
    storeValue(initialKey, 'true');
  }
  switch (availability) {
    case Availability.Type.AWAY: {
      showModal(
        'hide_away_modal',
        translate('modalAvailabilityAwayTitle'),
        translate('modalAvailabilityAwayMessage'),
        translate,
      );
      break;
    }
    case Availability.Type.BUSY: {
      showModal(
        'hide_busy_modal',
        translate('modalAvailabilityBusyTitle'),
        translate('modalAvailabilityBusyMessage'),
        translate,
      );
      break;
    }
    case Availability.Type.AVAILABLE: {
      showModal(
        'hide_available_modal',
        translate('modalAvailabilityAvailableTitle'),
        translate('modalAvailabilityAvailableMessage'),
        translate,
      );
      break;
    }
    case Availability.Type.NONE: {
      showModal(
        'hide_none_modal',
        translate('modalAvailabilityNoneTitle'),
        translate('modalAvailabilityNoneMessage'),
        translate,
      );
    }
  }
}

export function showInitialModal(availability: Availability.Type, translate: Translate): void {
  const hideInitialModal = loadValue(initialKey);
  if (!hideInitialModal && availability !== Availability.Type.NONE) {
    showAvailabilityModal(availability, translate);
  }
}
