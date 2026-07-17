/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useCallback} from 'react';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {styles} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard.styles';
import type {Translate} from 'Util/localizerUtil';

import {useWarningsState} from '../../view_model/WarningsContainer/WarningsState';
import {TYPE} from '../../view_model/WarningsContainer/WarningsTypes';

export interface NoInternetCallGuardCopy {
  description: string;
  descriptionPoints: [string, string, string];
  title: string;
  translate: Translate;
}

export const showCallNotEstablishedModal = (noInternetCallGuardCopy: NoInternetCallGuardCopy) => {
  const {description, descriptionPoints, title, translate} = noInternetCallGuardCopy;
  const [firstDescriptionPoint, secondDescriptionPoint, thirdDescriptionPoint] = descriptionPoints;

  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        message: (
          <span>
            {description}
            <ul css={styles}>
              <li>{firstDescriptionPoint}</li>
              <li>{secondDescriptionPoint}</li>
              <li>{thirdDescriptionPoint}</li>
            </ul>
          </span>
        ),
        title,
      },
    },
    undefined,
    translate,
  );
};

export const useNoInternetCallGuard = (noInternetCallGuardCopy: NoInternetCallGuardCopy) => {
  const {description, descriptionPoints, title, translate} = noInternetCallGuardCopy;
  const [firstDescriptionPoint, secondDescriptionPoint, thirdDescriptionPoint] = descriptionPoints;
  const warnings = useWarningsState(state => state.warnings);
  const visibleWarning = warnings[warnings.length - 1];

  const showCallNotEstablishedMessage = useCallback(
    () => showCallNotEstablishedModal(noInternetCallGuardCopy),
    [description, firstDescriptionPoint, secondDescriptionPoint, thirdDescriptionPoint, title, translate],
  );

  return useCallback(
    (startCall: () => void) => {
      if (visibleWarning === TYPE.NO_INTERNET) {
        showCallNotEstablishedMessage();
        return;
      }
      startCall();
    },
    [visibleWarning, showCallNotEstablishedMessage],
  );
};
