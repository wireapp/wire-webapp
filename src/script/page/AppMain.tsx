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

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';
import {container} from 'tsyringe';

import {CallingContainer} from 'Components/calling/CallingOverlayContainer';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import {AppLock} from './AppLock';
import {LeftSidebar} from './LeftSidebar';
import {MainContent} from './MainContent';
import {RightSidebar} from './RightSidebar';
import {PanelEntity, PanelState} from './RightSidebar/RightSidebar';
import {RootProvider} from './RootProvider';
import {useAppMainState} from './state';

import {PrimaryModalComponent} from '../components/Modals/PrimaryModal/PrimaryModal';
import {User} from '../entity/User';
import {TeamState} from '../team/TeamState';
import {UserState} from '../user/UserState';
import {MainViewModel} from '../view_model/MainViewModel';
import {WarningsContainer} from '../view_model/WarningsContainer/WarningsContainer';

export type RightSidebarParams = {
  entity: PanelEntity | null;
  showLikes?: boolean;
  highlighted?: User[];
};

interface AppContainerProps {
  root: MainViewModel;
}

const AppContainer: FC<AppContainerProps> = ({root}) => {
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
      <RootProvider value={root}>
        <main>
          <div id="app" className="app">
            <LeftSidebar listViewModel={root.list} selfUser={selfUser} isActivatedAccount={isActivatedAccount} />

            <MainContent isRightSidebarOpen={!!currentState} openRightSidebar={toggleRightSidebar} />

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
          <PrimaryModalComponent />
        </main>
      </RootProvider>
    </StyledApp>
  );
};

registerReactComponent('app-container', AppContainer);

export {AppContainer};
