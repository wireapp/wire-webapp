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
import type {Conversation} from '../entity/Conversation';
import type {LegalHoldModalViewModel} from '../view_model/content/LegalHoldModalViewModel';
import NamedIcon from 'Components/NamedIcon';
import {registerReactComponent} from 'Util/ComponentUtil';

export interface LegalHoldDotProps {
  conversation?: Conversation;
  isPending?: boolean;
  large?: boolean;
  legalHoldModal?: LegalHoldModalViewModel;
}

const LegalHoldDot: React.FC<LegalHoldDotProps> = ({conversation, isPending, large, legalHoldModal}) => {
  const isInteractive = !!legalHoldModal;

  return (
    <div
      className={cx('legal-hold-dot', {
        'legal-hold-dot--active': !isPending,
        'legal-hold-dot--interactive': isInteractive,
        'legal-hold-dot--large': large,
      })}
      onClick={event => {
        event.stopPropagation();
        if (isInteractive) {
          if (isPending) {
            legalHoldModal.showRequestModal(true);
            return;
          }

          if (conversation) {
            legalHoldModal.showUsers(conversation);
            return;
          }

          legalHoldModal.showUsers();
        }
      }}
    >
      {isPending && <NamedIcon name="pending-icon" data-uie-name="legal-hold-dot-pending-icon" />}
    </div>
  );
};

export default LegalHoldDot;

registerReactComponent('legal-hold-dot', {
  component: LegalHoldDot,
  optionalParams: ['conversation', 'isPending', 'large', 'legalHoldModal'],
  template: '<div data-bind="react: {conversation, isPending: ko.unwrap(isPending), large, legalHoldModal}"></div>',
});
