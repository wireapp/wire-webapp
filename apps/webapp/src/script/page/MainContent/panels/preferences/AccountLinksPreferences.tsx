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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

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
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const handle = selfUser.isFederated ? `@${username}@${selfUser.domain}` : `@${username}`;

  useEffect(() => {
    void userRepository.getUserLinks(username).then(setLinks);
  }, [username, userRepository]);

  const saveLinks = async (updatedLinks: AccountLink[]) => {
    await userRepository.changeLinks(updatedLinks);
    setLinks(updatedLinks);
  };

  const addLink = async () => {
    if (!newName.trim() || !newUrl.trim()) {
      return;
    }

    const newLink: AccountLink = {name: newName.trim(), url: newUrl.trim(), verified: false};
    await saveLinks([...links, newLink]);
    setNewName('');
    setNewUrl('');
  };

  const removeLink = async (urlToRemove: string) => {
    await saveLinks(links.filter(link => link.url !== urlToRemove));
  };

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
        <div css={{display: 'flex', flexDirection: 'column'}}>
          {links.map(link => (
            <div
              key={link.url}
              css={{alignItems: 'center', display: 'flex', justifyContent: 'space-between', padding: '8px 8px 12px'}}
            >
              <div css={{display: 'flex', flexDirection: 'column'}}>
                <div css={{alignItems: 'center', display: 'flex', gap: 6}}>
                  <span className="label preferences-label">{link.name}</span>
                  {link.verified === true && (
                    <Icon.CheckIcon css={{color: 'var(--green-500)', height: 14, width: 14}} />
                  )}
                </div>
                <a href={link.url} target="_blank" rel="noreferrer" css={{color: 'var(--accent-color)', fontSize: 14}}>
                  {link.url}
                </a>
              </div>

              <button
                type="button"
                onClick={() => removeLink(link.url)}
                css={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--foreground-fade-40)',
                  cursor: 'pointer',
                  padding: 4,
                }}
                aria-label="Remove link"
              >
                <Icon.CloseIcon css={{height: 14, width: 14}} />
              </button>
            </div>
          ))}

          <div css={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12}}>
            <input
              type="text"
              placeholder={t('preferencesAccountName')}
              value={newName}
              onChange={event => setNewName(event.target.value)}
              css={{
                background: 'var(--input-background)',
                border: '1px solid var(--foreground-fade-16)',
                borderRadius: 4,
                color: 'var(--main-color)',
                fontSize: 14,
                padding: '8px 12px',
                width: '100%',
              }}
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={newUrl}
              onChange={event => setNewUrl(event.target.value)}
              css={{
                background: 'var(--input-background)',
                border: '1px solid var(--foreground-fade-16)',
                borderRadius: 4,
                color: 'var(--main-color)',
                fontSize: 14,
                padding: '8px 12px',
                width: '100%',
              }}
            />
            <Button
              type="button"
              variant={ButtonVariant.TERTIARY}
              onClick={addLink}
              disabled={!newName.trim() || !newUrl.trim()}
            >
              <Icon.PlusIcon css={{height: 14, marginRight: 6, width: 14}} />
              Add link
            </Button>
          </div>
        </div>
      </PreferencesSection>
    </PreferencesPage>
  );
};

export {AccountLinksPreferences};
