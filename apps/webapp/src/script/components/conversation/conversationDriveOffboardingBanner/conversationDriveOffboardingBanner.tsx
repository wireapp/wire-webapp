/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {FunctionComponent} from 'react';

import {bannerStyles} from './conversationDriveOffboardingBanner.styles';

import {useApplicationContext} from '../../../page/rootProvider';
import {InfoIcon} from '../../../uiKit/dataDisplay/icon/infoIcon';

export const ConversationDriveOffboardingBanner: FunctionComponent = () => {
  const {translate} = useApplicationContext();

  return (
    <div css={bannerStyles} role="status" data-uie-name="drive-offboarding-banner">
      <InfoIcon aria-hidden="true" />
      <span>
        <strong>{translate('conversationDriveOffboardingTitle')}</strong>{' '}
        {translate('conversationDriveOffboardingDescription')}
      </span>
    </div>
  );
};
