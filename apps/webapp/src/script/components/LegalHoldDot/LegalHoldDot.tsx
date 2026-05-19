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

import React from 'react';

import cx from 'classnames';

import * as Icon from 'Components/icon';
import {useLegalHoldModalState} from 'Components/modals/legalHoldModal/legalHoldModal.state';
import type {Conversation} from 'Repositories/entity/conversation';
import {t} from 'Util/localizerUtil';

interface LegalHoldDotProps {
  isInteractive?: boolean;
  className?: string;
  conversation?: Conversation;
  dataUieName?: string;
  isPending?: boolean;
  isMessage?: boolean;
  large?: boolean;
  showText?: boolean;
}

export const LegalHoldDot = ({
  isInteractive = false,
  conversation,
  isPending,
  isMessage = false,
  large,
  showText = false,
  className = '',
  dataUieName = 'legalHold-dot-pending-icon',
}: LegalHoldDotProps) => {
  const {showRequestModal, showUsers} = useLegalHoldModalState(state => state);

  const onClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (isPending === true) {
      showRequestModal(false, true);

      return;
    }

    showUsers(false, conversation);
  };

  return (
    <button
      id="legalHold-button-interactive"
      type="button"
      className="legalHold-dot-button legalHold-dot-button--interactive"
      onClick={onClick}
      data-uie-name={dataUieName}
      disabled={!isInteractive}
    >
      <span
        className={cx(
          'legalHold-dot',
          {
            'legalHold-dot--active': isPending !== true,
            'legalHold-dot--interactive': isInteractive,
            'legalHold-dot--large': large,
            'legalHold-dot--message': isMessage,
          },
          className,
        )}
      >
        {isPending === true && <Icon.PendingIcon className="pending-icon" />}
      </span>

      {showText && <span className="visibility-hidden legalHold-dot--text">{t('legalHoldHeadline')}</span>}
    </button>
  );
};
