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
import {CSSTransition, SwitchTransition} from 'react-transition-group';
import {css} from '@emotion/core';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {container} from 'tsyringe';

import {ListViewModel, ListState} from '../../view_model/ListViewModel';
import {User} from '../../entity/User';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {AssetRepository} from '../../assets/AssetRepository';
import {PropertiesRepository} from '../../properties/PropertiesRepository';

import Preferences from './panels/Preferences';
import Archive from './panels/Archive';
import Background from './Background';
import Conversations from './panels/Conversations';
import TemporaryGuestConversations from './panels/TemporatyGuestConversations';

type PreferencesProps = {
  assetRepository?: AssetRepository;
  conversationRepository: ConversationRepository;
  listViewModel: ListViewModel;
  propertiesRepository: PropertiesRepository;
  selfUser: User;
};
const Animated: React.FC = ({children, ...rest}) => {
  return (
    <CSSTransition classNames="fade-in-out" timeout={{enter: 700, exit: 300}} {...rest}>
      {children}
    </CSSTransition>
  );
};

const LeftSidebar: React.FC<PreferencesProps> = ({
  listViewModel,
  conversationRepository,
  propertiesRepository,
  assetRepository = container.resolve(AssetRepository),
  selfUser,
}) => {
  const {state} = useKoSubscribableChildren(listViewModel, ['state']);
  let content = <span></span>;
  const switchList = (list: ListState) => listViewModel.switchList(list);
  const goHome = () => {
    return selfUser.isTemporaryGuest()
      ? listViewModel.switchList(ListViewModel.STATE.TEMPORARY_GUEST)
      : listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);
  };

  switch (state) {
    case ListState.CONVERSATIONS:
      content = (
        <Conversations
          listViewModel={listViewModel}
          conversationRepository={conversationRepository}
          propertiesRepository={propertiesRepository}
          switchList={switchList}
          selfUser={selfUser}
        />
      );
      break;
    case ListState.PREFERENCES:
      content = (
        <Preferences
          contentViewModel={listViewModel.contentViewModel}
          listViewModel={listViewModel}
          onClose={goHome}
        ></Preferences>
      );
      break;

    case ListState.ARCHIVE:
      content = (
        <Archive
          answerCall={listViewModel.answerCall}
          conversationRepository={conversationRepository}
          listViewModel={listViewModel}
          onClose={goHome}
        ></Archive>
      );
      break;

    case ListState.TEMPORARY_GUEST:
      content = (
        <TemporaryGuestConversations
          callingViewModel={listViewModel.callingViewModel}
          listViewModel={listViewModel}
          selfUser={selfUser}
        />
      );
      break;
  }
  return (
    <>
      <Background selfUser={selfUser} assetRepository={assetRepository} />
      <SwitchTransition css={css({height: '100%'})}>
        <Animated key={state}>{content}</Animated>
      </SwitchTransition>
    </>
  );
};

export default LeftSidebar;

registerStaticReactComponent('left-sidebar', LeftSidebar);
