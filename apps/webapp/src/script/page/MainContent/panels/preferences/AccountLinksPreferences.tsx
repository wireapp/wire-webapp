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

import {useEffect, useState} from 'react';

import {type AccountLink} from '@wireapp/api-client/lib/user';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import * as Icon from 'Components/icon';
import {User} from 'Repositories/entity/User';
import type {UserRepository} from 'Repositories/user/userRepository';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {t} from 'Util/localizerUtil';

import {BioInput} from './accountPreferences/BioInput';
import {PreferencesPage} from './components/PreferencesPage';
import {PreferencesSection} from './components/PreferencesSection';

interface AccountLinksPreferencesProps {
  selfUser: User;
  userRepository: UserRepository;
}

const AccountLinksPreferences = ({selfUser, userRepository}: AccountLinksPreferencesProps) => {
  const {username} = useKoSubscribableChildren(selfUser, ['username']);
  const [links, setLinks] = useState<AccountLink[]>([]);
  const [bio, setBio] = useState<string>(selfUser.bio ?? '');
  const handle = selfUser.isFederated ? `@${username}@${selfUser.domain}` : `@${username}`;

  useEffect(() => {
    void userRepository.getUserLinks(handle).then(setLinks);
  }, [handle, userRepository]);

  return (
    <PreferencesPage title={t('preferencesAccountLinks')}>
      <div className="preferences-wrapper">
        <div className="preferences-account-name">
          <h3 className="heading-h3 text-center">{handle}</h3>
        </div>

        <div className="preferences-account-image">
          <Avatar participant={selfUser} avatarSize={AVATAR_SIZE.X_LARGE} />
        </div>

        <BioInput bio={bio} currentLinks={links} onBioSaved={setBio} userRepository={userRepository} />
      </div>

      <PreferencesSection hasSeparator title={t('preferencesAccountLinks')}>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {links.map(link => (
            <div key={link.url} css={{display: 'flex', flexDirection: 'column', padding: '8px 8px 12px'}}>
              <div css={{display: 'flex', alignItems: 'center', gap: 6}}>
                <span className="label preferences-label">{link.name}</span>
                {link.verified && <Icon.CheckIcon css={{width: 14, height: 14, color: 'var(--green-500)'}} />}
              </div>
              <a href={link.url} target="_blank" rel="noreferrer" css={{color: 'var(--accent-color)', fontSize: 14}}>
                {link.url}
              </a>
            </div>
          ))}
        </div>
      </PreferencesSection>
    </PreferencesPage>
  );
};

export {AccountLinksPreferences};
