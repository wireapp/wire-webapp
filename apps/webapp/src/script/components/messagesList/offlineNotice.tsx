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

import {offlineNoticeIconStyles, offlineNoticeLabelStyles} from './offlineNotice.styles';

import {useApplicationContext} from '../../page/rootProvider';
import {NoInternetIcon} from '../../uiKit/dataDisplay/icon/noInternetIcon';

export const OfflineNotice: FunctionComponent = () => {
  const {translate} = useApplicationContext();

  return (
    <div role="status" className="message-header system-message" data-uie-name="outbox-offline-notice">
      <div className="message-header-icon" aria-hidden="true">
        <NoInternetIcon css={offlineNoticeIconStyles} />
      </div>
      <p className="message-header-label" css={offlineNoticeLabelStyles}>
        {translate('outboxOfflineNotice')}
      </p>
    </div>
  );
};
