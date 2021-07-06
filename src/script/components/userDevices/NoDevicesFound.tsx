/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../../Config';
import type {User} from '../../entity/User';
import {getPrivacyPolicyUrl} from '../../externalRoute';

interface NoDevicesFoundProps {
  noPadding: boolean;
  user: User;
}

const NoDevicesFound: React.FC<NoDevicesFoundProps> = ({user, noPadding}) => {
  const {name: userName} = useKoSubscribableChildren(user, ['name']);

  return (
    <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
      <div className="participant-devices__text-block panel__info-text" data-uie-name="status-devices-headline">
        {user
          ? t('participantDevicesOutdatedClientMessage', {
              brandName: Config.getConfig().BRAND_NAME,
              user: userName,
            })
          : ''}
      </div>
      <a
        className="participant-devices__link accent-text"
        href={getPrivacyPolicyUrl()}
        rel="nofollow noopener noreferrer"
        target="_blank"
      >
        {t('participantDevicesLearnMore')}
      </a>
    </div>
  );
};

export default NoDevicesFound;
