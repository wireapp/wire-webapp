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

import {FC, useEffect, useRef} from 'react';
import {container} from 'tsyringe';

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import ClassifiedBar from 'Components/input/ClassifiedBar';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {User} from '../../entity/User';
import {ActionsViewModel} from '../../view_model/ActionsViewModel';

interface ConnectRequestsProps {
  readonly actionsViewModel: ActionsViewModel;
  readonly userState: UserState;
  readonly teamState: TeamState;
}

const ConnectRequests: FC<ConnectRequestsProps> = ({
  actionsViewModel,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
}) => {
  const connectRequestsRefEnd = useRef<HTMLDivElement | null>(null);
  const temporaryConnectRequestsCount = useRef<number>(0);

  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {connectRequests} = useKoSubscribableChildren(userState, ['connectRequests']);

  const onIgnoreClick = (userEntity: User): void => {
    actionsViewModel.ignoreConnectionRequest(userEntity);
  };

  const onAcceptClick = async (userEntity: User): Promise<void> => {
    await actionsViewModel.acceptConnectionRequest(userEntity);

    const conversationEntity = await actionsViewModel.getOrCreate1to1Conversation(userEntity);

    if (connectRequests.indexOf(userEntity) === connectRequests.length - 1) {
      /**
       * In the connect request view modal, we show an overview of all incoming connection requests. When there are multiple open connection requests, we want that the user sees them all and can accept them one-by-one. When the last open connection request gets accepted, we want the user to switch to this conversation.
       */
      actionsViewModel.open1to1Conversation(conversationEntity);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (connectRequestsRefEnd.current) {
      connectRequestsRefEnd.current.scrollIntoView({behavior});
    }
  };

  useEffect(() => {
    if (temporaryConnectRequestsCount.current + 1 === connectRequests.length) {
      scrollToBottom('smooth');
    }

    temporaryConnectRequestsCount.current = connectRequests.length;
  }, [connectRequests]);

  useEffect(() => {
    scrollToBottom();
  }, []);

  return (
    <div className="connect-request-wrapper">
      <div id="connect-requests" className="connect-requests" style={{overflowY: 'scroll'}}>
        <div className="connect-requests-inner" style={{overflowY: 'hidden'}}>
          {connectRequests.map(connectRequest => (
            <div
              key={connectRequest.id}
              className="connect-request"
              data-uie-uid={connectRequest.id}
              data-uie-name="connect-request"
            >
              <div className="connect-request-name ellipsis">{connectRequest.name()}</div>

              <div className="connect-request-username label-username">{connectRequest.handle}</div>

              {classifiedDomains && <ClassifiedBar users={[connectRequest]} classifiedDomains={classifiedDomains} />}

              <Avatar
                className="connect-request-avatar avatar-no-filter cursor-default"
                participant={connectRequest}
                avatarSize={AVATAR_SIZE.X_LARGE}
                noBadge
                noFilter
              />

              <div className="button-group">
                <button
                  className="button button-inverted"
                  data-uie-name="do-ignore"
                  aria-label={t('connectionRequestIgnore')}
                  onClick={() => onIgnoreClick(connectRequest)}
                >
                  {t('connectionRequestIgnore')}
                </button>

                <button
                  className="button"
                  onClick={() => onAcceptClick(connectRequest)}
                  data-uie-name="do-accept"
                  aria-label={t('connectionRequestConnect')}
                >
                  {t('connectionRequestConnect')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="connect-request-list-end" ref={connectRequestsRefEnd} />
      </div>
    </div>
  );
};

export default ConnectRequests;

registerReactComponent('connect-requests', ConnectRequests);
