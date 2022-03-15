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
import {ListViewModel, ListState} from '../../view_model/ListViewModel';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {TransitionGroup, CSSTransition} from 'react-transition-group';
import Preferences from './panels/Preferences';
import ArchiveList from './panels/ArchiveList';
import {ConversationRepository} from '../../conversation/ConversationRepository';

type PreferencesProps = {
  contentViewModel: ContentViewModel;
  conversationRepository: ConversationRepository;
  listViewModel: ListViewModel;
};
const Animated: React.FC = ({children, ...rest}) => {
  return (
    <CSSTransition classNames="fade-in-out" timeout={{enter: 700, exit: 300}} {...rest}>
      {children}
    </CSSTransition>
  );
};

const LeftSidebar: React.FC<PreferencesProps> = ({listViewModel, conversationRepository}) => {
  const {state} = useKoSubscribableChildren(listViewModel, ['state']);
  let content = <></>;
  switch (state) {
    case ListState.PREFERENCES:
      content = (
        <Preferences contentViewModel={listViewModel.contentViewModel} listViewModel={listViewModel}></Preferences>
      );
      break;

    case ListState.ARCHIVE:
      content = (
        <ArchiveList
          answerCall={listViewModel.answerCall}
          conversationRepository={conversationRepository}
          listViewModel={listViewModel}
          conversationState={undefined}
        ></ArchiveList>
      );
  }
  return (
    <TransitionGroup>
      <Animated key={state}>{content}</Animated>
    </TransitionGroup>
  );
};

export default LeftSidebar;

registerStaticReactComponent('left-sidebar', LeftSidebar);
