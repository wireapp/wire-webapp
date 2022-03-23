/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {t} from 'Util/LocalizerUtil';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ListState, ListViewModel} from '../../../view_model/ListViewModel';
import {Config} from '../../../Config';
import {getSupportUsernameUrl} from '../../../externalRoute';
import {User} from '../../../entity/User';
import {UserRepository} from '../../../user/UserRepository';

type PreferencesProps = {
  goHome: () => void;
  listViewModel: ListViewModel;
  selfUser: User;
  userRepository: UserRepository;
};

const Takeover: React.FC<PreferencesProps> = ({selfUser, listViewModel, userRepository, goHome}) => {
  const {name, username} = useKoSubscribableChildren(selfUser, ['name', 'username']);
  const brandName = Config.getConfig().BRAND_NAME;
  const supportUsernameUrl = getSupportUsernameUrl();
  const chooseUsername = (): void => {
    listViewModel.switchList(ListState.PREFERENCES);
  };

  const keepUsername = async () => {
    try {
      await userRepository.changeUsername(username);
      goHome();
    } catch (error) {
      listViewModel.switchList(ListState.PREFERENCES);
    }
  };

  return (
    <div id="takeover" className="takeover">
      <div className="takeover-names">
        <span className="takeover-names-name" data-uie-name="takeover-name">
          {name}
        </span>
        <span className="takeover-names-username label-username" data-uie-name="takeover-username">
          {username}
        </span>
      </div>
      <div className="takeover-actions">
        <span className="takeover-actions-sub">{t('takeoverSub', brandName)}</span>
        <a
          className="takeover-actions-link text-white"
          href={supportUsernameUrl}
          rel="nofollow noopener noreferrer"
          target="_blank"
        >
          {t('takeoverLink')}
        </a>
        <button
          className="button button-fluid"
          type="button"
          onClick={chooseUsername}
          data-uie-name="do-takeover-choose"
        >
          {t('takeoverButtonChoose')}
        </button>
        <button
          className="button button-fluid button-inverted text-white"
          type="button"
          onClick={keepUsername}
          data-uie-name="do-takeover-keep"
        >
          {t('takeoverButtonKeep')}
        </button>
      </div>
    </div>
  );
};

export default Takeover;
