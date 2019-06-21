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

import {loadValue, storeValue} from 'Util/StorageUtil';
import {t} from 'Util/LocalizerUtil';

import {AvailabilityType} from './AvailabilityType';
import {modals, ModalsViewModel} from '../view_model/ModalsViewModel';

const initialKey = 'hide_initial_modal';

function showModal(storageKey, title, message) {
  const hideModal = loadValue(storageKey);
  if (!hideModal) {
    modals.showModal(
      ModalsViewModel.TYPE.OPTION,
      {
        hideSecondary: true,
        preventClose: true,
        primaryAction: {
          action: dontShowAgain => {
            if (dontShowAgain) {
              storeValue(storageKey, 'true');
            }
          },
          text: t('modalAcknowledgeAction'),
        },
        text: {
          message,
          option: t('modalAvailabilityDontShowAgain'),
          title,
        },
      },
      'availability'
    );
  }
}

export function showAvailabilityModal(availability) {
  if (availability !== AvailabilityType.NONE) {
    storeValue(initialKey, 'true');
  }
  switch (availability) {
    case AvailabilityType.AWAY: {
      showModal('hide_away_modal', t('modalAvailabilityAwayTitle'), t('modalAvailabilityAwayMessage'));
      break;
    }
    case AvailabilityType.BUSY: {
      showModal('hide_busy_modal', t('modalAvailabilityBusyTitle'), t('modalAvailabilityBusyMessage'));
      break;
    }
    case AvailabilityType.AVAILABLE: {
      showModal('hide_available_modal', t('modalAvailabilityAvailableTitle'), t('modalAvailabilityAvailableMessage'));
      break;
    }
    case AvailabilityType.NONE: {
      showModal('hide_none_modal', t('modalAvailabilityNoneTitle'), t('modalAvailabilityNoneMessage'));
    }
  }
}

export function showInitialModal(availability) {
  const hideInitialModal = loadValue(initialKey);
  if (!hideInitialModal && availability !== AvailabilityType.NONE) {
    showAvailabilityModal(availability);
  }
}
