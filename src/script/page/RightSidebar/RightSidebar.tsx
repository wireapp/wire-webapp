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

import {FC} from 'react';
import {container} from 'tsyringe';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import ConversationDetails from './ConversationDetails';

import {ConversationState} from '../../conversation/ConversationState';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {PanelViewModel} from '../../view_model/PanelViewModel';

interface RightSidebarProps {
  contentViewModel: ContentViewModel;
  teamState: TeamState;
  userState: UserState;
}

const RightSidebar: FC<RightSidebarProps> = ({contentViewModel, teamState, userState}) => {
  const {
    conversation: conversationRepository,
    integration: integrationRepository,
    search: searchRepository,
    team: teamRepository,
  } = contentViewModel.repositories;

  const {actions: actionsViewModel, panel: panelViewModel} = contentViewModel.mainViewModel;
  const conversationState = container.resolve(ConversationState);

  const {isVisible, state} = useKoSubscribableChildren(panelViewModel, ['isVisible', 'state']);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {state === PanelViewModel.STATE.CONVERSATION_DETAILS && activeConversation && (
        <ConversationDetails
          activeConversation={activeConversation}
          actionsViewModel={actionsViewModel}
          conversationRepository={conversationRepository}
          integrationRepository={integrationRepository}
          panelViewModel={panelViewModel}
          searchRepository={searchRepository}
          teamRepository={teamRepository}
          teamState={teamState}
          userState={userState}
          isFederated={!!contentViewModel.isFederated}
          isVisible={isVisible}
        />
      )}
    </>
  );
};

export default RightSidebar;

registerReactComponent('right-sidebar', RightSidebar);
