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
import {styles} from 'Hooks/useCallGuard/useCallGuard.styles';
import {t} from 'Util/LocalizerUtil';

import {useWarningsState} from '../../view_model/WarningsContainer/WarningsState';
import {TYPE} from '../../view_model/WarningsContainer/WarningsTypes';

export const useCallGuard = () => {
  const warnings = useWarningsState(state => state.warnings);
  const visibleWarning = warnings[warnings.length - 1];

  const showCallNotEstablishedMessage = useCallback(() => {
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
      text: {
        message: (
          <span>
            {t('callNotEstablishedDescription')}
            <ul css={styles}>
              <li>{t('callNotEstablishedDescriptionPoint1')}</li>
              <li>{t('callNotEstablishedDescriptionPoint2')}</li>
              <li>{t('callNotEstablishedDescriptionPoint3')}</li>
            </ul>
          </span>
        ),
        title: t('callNotEstablishedTitle'),
      },
    });
  }, []);

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
