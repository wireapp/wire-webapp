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

import Icon from 'Components/Icon';
import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import type {Conversation} from '../entity/Conversation';
import type {LegalHoldModalViewModel} from '../view_model/content/LegalHoldModalViewModel';

export interface LegalHoldDotProps {
  className?: string;
  conversation?: Conversation;
  dataUieName?: string;
  isPending?: boolean;
  isMessage?: boolean;
  large?: boolean;
  showText?: boolean;
  legalHoldModal?: LegalHoldModalViewModel;
}

const LegalHoldDot: React.FC<LegalHoldDotProps> = ({
  conversation,
  isPending,
  isMessage = false,
  large,
  legalHoldModal,
  showText = false,
  className = '',
  dataUieName = 'legal-hold-dot-pending-icon',
}) => {
  const isInteractive = !!legalHoldModal;
  const onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isInteractive) {
      if (isPending) {
        legalHoldModal.showRequestModal(true);
        return;
      }

      legalHoldModal.showUsers(conversation);
    }
  };

  return (
    <button type="button" className="legal-hold-dot-button" onClick={onClick} data-uie-name={dataUieName}>
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
        {isPending && <Icon.Pending className="pending-icon" />}
      </span>
      {showText && <span className="visibility-hidden legal-hold-dot--text">{t('legalHoldHeadline')}</span>}
    </button>
  );
};

export default LegalHoldDot;

registerReactComponent('legal-hold-dot', LegalHoldDot);
