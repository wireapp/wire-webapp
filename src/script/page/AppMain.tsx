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

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';
import {FC} from 'react';
import {container} from 'tsyringe';

import CallingContainer from 'Components/calling/CallingOverlayContainer';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import MainContent from './MainContent';
import {UserState} from '../user/UserState';
import {MainViewModel} from '../view_model/MainViewModel';
import LeftSidebar from './LeftSidebar';
import AppLock from './AppLock';
import WarningsContainer from '../view_model/WarningsContainer/WarningsContainer';
import RightSidebar from './RightSidebar';
import {TeamState} from '../team/TeamState';
import {PanelEntity, PanelState} from './RightSidebar/RightSidebar';
import {User} from '../entity/User';
import {useAppMainState} from './state';

export type RightSidebarParams = {
  entity: PanelEntity | null;
  showLikes?: boolean;
  highlighted?: User[];
};

interface AppProps {
  root: MainViewModel;
}

const AppMain: FC<AppProps> = ({root}) => {
  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);

  const {self: selfUser, isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);

  const rightSidebar = useAppMainState(state => state.rightSidebar);
  const currentState = rightSidebar.history.at(-1);

  const closeRightSidebar = () => {
    rightSidebar.clearHistory();
  };

  const toggleRightSidebar = (panelState: PanelState, params: RightSidebarParams) => {
    if (currentState !== panelState) {
      rightSidebar.goTo(panelState, params);

      return;
    }

    closeRightSidebar();
  };

  return (
    <StyledApp themeId={THEME_ID.DEFAULT} css={{backgroundColor: 'unset', height: '100%'}}>
      <main>
        <div id="app" className="app">
          <LeftSidebar listViewModel={root.list} selfUser={selfUser} isActivatedAccount={isActivatedAccount} />

          <MainContent
            contentViewModel={root.content}
            isRightSidebarOpen={!!currentState}
            openRightSidebar={toggleRightSidebar}
          />

          {currentState && (
            <RightSidebar
              currentEntity={rightSidebar.entity}
              repositories={root.content.repositories}
              actionsViewModel={root.actions}
              isFederated={root.isFederated}
              teamState={teamState}
              userState={userState}
            />
          )}
        </div>

        <AppLock clientRepository={root.content.repositories.client} />
        <WarningsContainer />

        <CallingContainer
          multitasking={root.multitasking}
          callingRepository={root.content.repositories.calling}
          mediaRepository={root.content.repositories.media}
        />

        {/*The order of these elements matter to show proper modals stack upon each other*/}
        <div id="user-modal-container"></div>
        <div id="primary-modal-container"></div>
      </main>
    </StyledApp>
  );
};

registerReactComponent('app-main', AppMain);

export default AppMain;
