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

import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {User} from '../../entity/User';
import {ListViewModel} from '../../view_model/ListViewModel';
import ConversationList from './ConversationList';
import Preferences from '../preferences/Preferences';

type TemporaryGuestConversationList = {
  listViewModel: ListViewModel;
  selfUser: User;
};

const TemporaryGuest: React.FC<TemporaryGuestConversationList> = ({selfUser, listViewModel}) => {
  const {state} = useKoSubscribableChildren(listViewModel, ['state']);

  switch (state) {
    case ListViewModel.STATE.TEMPORARY_GUEST:
      return (
        <ConversationList
          callingViewModel={listViewModel.callingViewModel}
          listViewModel={listViewModel}
          selfUser={selfUser}
        />
      );
    case ListViewModel.STATE.PREFERENCES:
      return (
        <Preferences contentViewModel={listViewModel.contentViewModel} listViewModel={listViewModel} isTemporaryGuest />
      );
  }
  return null;
};

export default TemporaryGuest;

registerStaticReactComponent('temporary-guest', TemporaryGuest);
