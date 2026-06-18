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

import {PreferencesPage} from './components/PreferencesPage';
import {PreferencesSection} from './components/PreferencesSection';

const MOCK_BIO = 'Software engineer at Wire. Building secure communication tools for everyone.';

interface AccountLinksPreferencesProps {
  selfUser: User;
  userRepository: UserRepository;
}

const AccountLinksPreferences = ({selfUser, userRepository}: AccountLinksPreferencesProps) => {
  const {username: handle} = useKoSubscribableChildren(selfUser, ['username']);
  const [links, setLinks] = useState<AccountLink[]>([]);

  const {id, domain} = selfUser;

  useEffect(() => {
    void userRepository.getUserLinks({id, domain}).then(setLinks);
  }, [id, domain, userRepository]);

  return (
    <PreferencesPage title={t('preferencesAccountLinks')}>
      <PreferencesSection>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0 24px'}}>
          <Avatar participant={selfUser} avatarSize={AVATAR_SIZE.X_LARGE} />
          <div style={{textAlign: 'center'}}>
            <div style={{fontWeight: 600, fontSize: 16}}>{handle}</div>
            <div
              style={{
                marginTop: 6,
                color: 'var(--foreground-fade-40)',
                fontSize: 14,
                maxWidth: 320,
                lineHeight: 1.4,
              }}
            >
              {MOCK_BIO}
            </div>
          </div>
        </div>
      </PreferencesSection>

      <PreferencesSection>
        <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
          {links.map(link => (
            <li key={link.url} style={{padding: '12px 0', borderBottom: '1px solid var(--foreground-fade-8)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <a href={link.url} target="_blank" rel="noreferrer" style={{color: 'var(--accent-color)'}}>
                  {link.name}
                </a>
                {link.verified && <Icon.CheckIcon style={{width: 14, height: 14, color: 'var(--green-500)'}} />}
              </div>
            </li>
          ))}
        </ul>
      </PreferencesSection>
    </PreferencesPage>
  );
};

export {AccountLinksPreferences};
