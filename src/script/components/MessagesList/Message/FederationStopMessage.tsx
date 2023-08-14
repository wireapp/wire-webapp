/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Icon} from 'Components/Icon';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';

import {MessageTime} from './MessageTime';

import {FederationStopMessage as FederationStopMessageEntity} from '../../../entity/message/FederationStopMessage';

export interface FederationStopMessageProps {
  message: FederationStopMessageEntity;
}

const FederationStopMessage: React.FC<FederationStopMessageProps> = ({message}) => {
  const {timestamp} = useKoSubscribableChildren(message, ['timestamp']);
  const {id, domains} = message;
  const link = replaceLink(Config.getConfig().URL.SUPPORT.BUG_REPORT);

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        <div>
          <Icon.Info />
        </div>
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-failed-to-add-users"
        data-uie-value={`domains-${domains.join('_')}`}
      >
        {domains.length === 1
          ? t('federationDelete', {backendUrl: domains[0]}, link)
          : t('federationDelete', {backendUrlOne: domains[0], backendUrlTwo: domains[1]}, link)}
      </div>
      <p className="message-body-actions">
        <MessageTime
          timestamp={timestamp}
          data-uie-uid={id}
          data-uie-name="item-message-failed-to-add-users-timestamp"
        />
      </p>
    </div>
  );
};

export {FederationStopMessage};
