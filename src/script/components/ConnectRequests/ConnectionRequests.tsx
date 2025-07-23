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

import {useContext, useEffect, useRef} from 'react';

import {container} from 'tsyringe';

import {Button, ButtonVariant, IconButton, IconButtonVariant, useMatchMedia} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {UserClassifiedBar} from 'Components/ClassifiedBar/ClassifiedBar';
import {UnverifiedUserWarning} from 'Components/Modals/UserModal';
import {UserName} from 'Components/UserName';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {RootContext} from '../../page/RootProvider';

interface ConnectRequestsProps {
  readonly userState: UserState;
  readonly teamState: TeamState;
}

export const ConnectRequests = ({
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
}: ConnectRequestsProps) => {
  const connectRequestsRefEnd = useRef<HTMLDivElement | null>(null);
  const temporaryConnectRequestsCount = useRef<number>(0);

  const mainViewModel = useContext(RootContext);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {connectRequests: unsortedConnectionRequests} = useKoSubscribableChildren(userState, ['connectRequests']);
  const connectionRequests = unsortedConnectionRequests.sort((user1, user2) => {
    const user1Connection = user1.connection();
    const user2Connection = user2.connection();

    if (!user1Connection || !user2Connection) {
      return 0;
    }

    return new Date(user1Connection.lastUpdate).getTime() - new Date(user2Connection.lastUpdate).getTime();
  });

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia('max-width: 640px');

  const {setCurrentView} = useAppMainState(state => state.responsiveView);

  const {setCurrentTab: setCurrentSidebarTab} = useSidebarStore();

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (connectRequestsRefEnd.current) {
      connectRequestsRefEnd.current.scrollIntoView({behavior});
    }
  };

  useEffect(() => {
    if (temporaryConnectRequestsCount.current + 1 === connectionRequests.length) {
      scrollToBottom('smooth');
    }

    temporaryConnectRequestsCount.current = connectionRequests.length;
  }, [connectionRequests]);

  useEffect(() => {
    scrollToBottom();
  }, []);

  if (!mainViewModel) {
    return null;
  }

  const actionsViewModel = mainViewModel.actions;

  const onIgnoreClick = (userEntity: User): void => {
    actionsViewModel.ignoreConnectionRequest(userEntity);
  };

  const onAcceptClick = async (userEntity: User) => {
    await actionsViewModel.acceptConnectionRequest(userEntity);

    const conversationEntity = await actionsViewModel.getOrCreate1to1Conversation(userEntity);

    if (connectionRequests.length === 1) {
      /**
       * In the connect request view modal, we show an overview of all incoming connection requests. When there are multiple open connection requests, we want that the user sees them all and can accept them one-by-one. When the last open connection request gets accepted, we want the user to switch to this conversation.
       */
      setCurrentSidebarTab(SidebarTabs.RECENT);
      return actionsViewModel.open1to1Conversation(conversationEntity);
    }
  };

  return (
    <div className="connect-request-wrapper">
      <div id="connect-requests" className="connect-requests" style={{overflowY: 'scroll'}}>
        <div className="connect-requests-inner" style={{overflowY: 'hidden'}}>
          {smBreakpoint && (
            <div css={{width: '100%'}}>
              <IconButton
                variant={IconButtonVariant.SECONDARY}
                className="connect-requests-icon-back icon-back"
                css={{marginBottom: 0}}
                onClick={() => setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR)}
              />
            </div>
          )}
          {connectionRequests.map(connectRequest => (
            <div
              key={connectRequest.id}
              className="connect-request"
              data-uie-uid={connectRequest.id}
              data-uie-name="connect-request"
            >
              <div className="connect-request-name ellipsis">
                <UserName user={connectRequest} />
              </div>

              <div className="connect-request-username label-username">{connectRequest.handle}</div>

              {classifiedDomains && (
                <UserClassifiedBar users={[connectRequest]} classifiedDomains={classifiedDomains} />
              )}

              <Avatar
                className="connect-request-avatar avatar-no-filter cursor-default"
                participant={connectRequest}
                avatarSize={AVATAR_SIZE.X_LARGE}
                noBadge
                noFilter
                hideAvailabilityStatus
              />

              <UnverifiedUserWarning />

              <div className="connect-request-button-group">
                <Button
                  variant={ButtonVariant.SECONDARY}
                  data-uie-name="do-ignore"
                  aria-label={t('connectionRequestIgnore')}
                  onClick={() => onIgnoreClick(connectRequest)}
                >
                  {t('connectionRequestIgnore')}
                </Button>

                <Button
                  onClick={() => onAcceptClick(connectRequest)}
                  data-uie-name="do-accept"
                  aria-label={t('connectionRequestConnect')}
                >
                  {t('connectionRequestConnect')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="connect-request-list-end" ref={connectRequestsRefEnd} />
      </div>
    </div>
  );
};
