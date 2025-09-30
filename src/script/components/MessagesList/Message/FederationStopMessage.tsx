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

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {FederationStopMessage as FederationStopMessageEntity} from 'Repositories/entity/message/FederationStopMessage';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {MessageTime} from './MessageTime';
import {useMessageFocusedTabIndex} from './util';

interface FederationStopMessageProps {
  message: FederationStopMessageEntity;
  isMessageFocused: boolean;
}

const config = Config.getConfig();

const FederationStopMessage: React.FC<FederationStopMessageProps> = ({message, isMessageFocused}) => {
  const {timestamp} = useKoSubscribableChildren(message, ['timestamp']);
  const {id, domains} = message;
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);

  return (
    <div className="message-header">
      <div className="message-header-icon message-header-icon--svg">
        <div>
          <Icon.InfoIcon />
        </div>
      </div>
      <div
        className="message-header-label"
        data-uie-name="element-message-failed-to-add-users"
        data-uie-value={`domains-${domains.join('_')}`}
      >
        <span
          dangerouslySetInnerHTML={{
            __html:
              domains.length === 1
                ? t('federationDelete', {backendUrl: domains[0]})
                : t('federationConnectionRemove', {backendUrlOne: domains[0], backendUrlTwo: domains[1]}),
          }}
        />
        <Link
          css={{fontSize: 'var(--font-size-small)', marginLeft: 2}}
          tabIndex={messageFocusedTabIndex}
          targetBlank
          variant={LinkVariant.PRIMARY}
          href={config.URL.SUPPORT.FEDERATION_STOP}
          data-uie-name="go-stop-federation"
        >
          {t('offlineBackendLearnMore')}
        </Link>
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
