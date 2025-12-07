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
import * as Icon from 'Components/Icon';
import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import type {Conversation} from 'Repositories/entity/Conversation';
import {t} from 'Util/LocalizerUtil';

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
  dataUieName = 'legal-hold-dot-pending-icon',
}: LegalHoldDotProps) => {
  const {showRequestModal, showUsers} = useLegalHoldModalState(state => state);

  const onClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (isPending) {
      showRequestModal(false, true);

      return;
    }

    showUsers(false, conversation);
  };

  return (
    <button
      id="legal-hold-button-interactive"
      type="button"
      className="legal-hold-dot-button legal-hold-dot-button--interactive"
      onClick={onClick}
      data-uie-name={dataUieName}
      disabled={!isInteractive}
    >
      <span
        className={cx(
          'legal-hold-dot',
          {
            'legal-hold-dot--active': !isPending,
            'legal-hold-dot--interactive': isInteractive,
            'legal-hold-dot--large': large,
            'legal-hold-dot--message': isMessage,
          },
          className,
        )}
      >
        {isPending && <Icon.PendingIcon className="pending-icon" />}
      </span>

      {showText && <span className="visibility-hidden legal-hold-dot--text">{t('legalHoldHeadline')}</span>}
    </button>
  );
};
