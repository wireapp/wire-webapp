/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {noop} from 'noop-esm';

import {pendingOfflineMessagesFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {useOutboxOffline} from '../../../../hooks/useOutboxOffline';
import {useApplicationContext} from '../../../../page/rootProvider';
import * as Icon from '../../../icon';

interface PingButtonProps {
  onClick: () => void;
  isDisabled: boolean;
}

export const PingButton: FunctionComponent<PingButtonProps> = ({isDisabled, onClick}: PingButtonProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const isOffline = useOutboxOffline(isFeatureToggleEnabled(pendingOfflineMessagesFeatureToggleName));
  const label = isOffline
    ? translate('outboxNotAvailableOffline', {feature: translate('tooltipConversationPing')})
    : translate('tooltipConversationPing');

  return (
    <button
      className="input-bar-control"
      type="button"
      onClick={isOffline ? noop : onClick}
      disabled={isDisabled}
      aria-disabled={isOffline || undefined}
      title={label}
      aria-label={label}
      data-uie-name="do-ping"
    >
      <Icon.PingIcon width={14} height={14} />
    </button>
  );
};
