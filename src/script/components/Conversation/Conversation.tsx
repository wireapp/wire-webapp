/* eslint-disable */
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

import {
  FC,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useContext,
  useEffect,
  useState,
} from 'react';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {groupBy} from 'underscore';
import cx from 'classnames';

import TitleBar from 'Components/TitleBar';
import MessagesList from 'Components/MessagesList';
import InputBar from 'Components/InputBar';
import Giphy from 'Components/Giphy';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {Conversation as ConversationEntity} from '../../entity/Conversation';

import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {PanelViewModel} from '../../view_model/PanelViewModel';
import {MemberMessage} from '../../entity/message/MemberMessage';
import {User} from '../../entity/User';
import {Message} from '../../entity/message/Message';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {Text} from '../../entity/message/Text';
import {safeMailOpen, safeWindowOpen} from 'Util/SanitizationUtil';
import {ModalsViewModel} from '../../view_model/ModalsViewModel';
import {t} from 'Util/LocalizerUtil';
import {UserError} from '../../error/UserError';
import {DecryptErrorMessage} from '../../entity/message/DecryptErrorMessage';
import {MotionDuration} from '../../motion/MotionDuration';
import {getLogger} from 'Util/Logger';
import {RootContext} from '../../page/RootProvider';
import {showDetailViewModal} from 'Components/Modals/DetailViewModal';

type ReadMessageBuffer = {conversation: ConversationEntity; message: Message};

interface ConversationListProps {
  initialMessage?: Message;
  readonly teamState: TeamState;
  readonly userState: UserState;
}

const ConversationList: FC<ConversationListProps> = ({initialMessage, teamState, userState}) => {
  const messageListLogger = getLogger('ConversationList');

  const contentViewModel = useContext(RootContext);

  if (!contentViewModel) {
    return null;
  }

  const [isConversationLoaded, setIsConversationLoaded] = useState<boolean>(false);
  const [readMessagesBuffer, setReadMessagesBuffer] = useState<ReadMessageBuffer[]>([]);

  const {conversationRepository, repositories, mainViewModel, legalHoldModal} = contentViewModel;
  const conversationState = conversationRepository.getConversationState();

  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {is1to1, isRequest} = useKoSubscribableChildren(activeConversation!, ['is1to1', 'isRequest']);
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

  const clickOnInvitePeople = (conversation: ConversationEntity): void => {
    mainViewModel.panel.togglePanel(PanelViewModel.STATE.GUEST_OPTIONS, {entity: conversation});
  };

  const clickOnCancelRequest = (messageEntity: MemberMessage): void => {
    if (activeConversation) {
      const nextConversationEntity = conversationRepository.getNextConversation(activeConversation);
      mainViewModel.actions.cancelConnectionRequest(messageEntity.otherUser(), true, nextConversationEntity);
    }
  };

  const showUserDetails = (userEntity: User) => {
    // what do do with unwrap (?)
    // userEntity = ko.unwrap(userEntity);
    const isSingleModeConversation = is1to1 || isRequest;

    if (activeConversation && (userEntity.isDeleted || (isSingleModeConversation && !userEntity.isMe))) {
      return mainViewModel.panel.togglePanel(PanelViewModel.STATE.CONVERSATION_DETAILS, {
        entity: activeConversation,
      });
    }

    const params = {entity: userEntity};
    const panelId = userEntity.isService
      ? PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE
      : PanelViewModel.STATE.GROUP_PARTICIPANT_USER;

    mainViewModel.panel.togglePanel(panelId, params);
  };

  const showParticipants = (participants: User[]) => {
    if (activeConversation) {
      mainViewModel.panel.togglePanel(PanelViewModel.STATE.CONVERSATION_PARTICIPANTS, {
        entity: activeConversation,
        highlighted: participants,
      });
    }
  };

  const showMessageDetails = (message: Message, showLikes = false) => {
    if (!is1to1) {
      mainViewModel.panel.togglePanel(PanelViewModel.STATE.MESSAGE_DETAILS, {
        entity: message,
        showLikes,
      });
    }
  };

  const handleClickOnMessage = (messageEntity: ContentMessage | Text, event: ReactMouseEvent) => {
    if (event.button === 2) {
      // Default browser behavior on right click
      return true;
    }

    const emailTarget = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-email-link]');
    if (emailTarget) {
      safeMailOpen(emailTarget.href);
      event.preventDefault();
      return false;
    }

    const linkTarget = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-md-link]');
    if (linkTarget) {
      const href = linkTarget.href;
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        primaryAction: {
          action: () => {
            safeWindowOpen(href);
          },
          text: t('modalOpenLinkAction'),
        },
        text: {
          message: t('modalOpenLinkMessage', href, {}, true),
          title: t('modalOpenLinkTitle'),
        },
      });
      event.preventDefault();
      return false;
    }

    const hasMentions = messageEntity instanceof Text && messageEntity.mentions().length;
    const mentionElement = hasMentions
      ? (event.target as HTMLElement).closest<HTMLSpanElement>('.message-mention')
      : undefined;
    const userId = mentionElement?.dataset.userId;
    const domain = mentionElement?.dataset.domain;

    if (userId && domain) {
      (async () => {
        try {
          const userEntity = await repositories.user.getUserById({domain, id: userId});
          showUserDetails(userEntity);
          //  TODO: Fix type
        } catch (error: any) {
          if (error.type !== UserError.TYPE.USER_NOT_FOUND) {
            throw error;
          }
        }
      })();
    }

    // need to return `true` because knockout will prevent default if we return anything else (including undefined)
    return true;
  };

  const showDetail = async (
    messageEntity: ContentMessage,
    event: ReactMouseEvent | ReactKeyboardEvent,
  ): Promise<void> => {
    if (messageEntity.isExpired() || event.currentTarget.classList.contains('image-asset--no-image')) {
      return;
    }

    showDetailViewModal({
      assetRepository: repositories.asset,
      conversationRepository: repositories.conversation,
      currentMessageEntity: messageEntity,
      messageRepository: repositories.message,
    });
  };

  const onSessionResetClick = async (messageEntity: DecryptErrorMessage): Promise<void> => {
    const resetProgress = () => {
      setTimeout(() => {
        messageEntity.is_resetting_session(false);
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.SESSION_RESET);
      }, MotionDuration.LONG);
    };

    messageEntity.is_resetting_session(true);

    try {
      if (messageEntity.fromDomain && activeConversation) {
        await repositories.message.resetSession(
          {domain: messageEntity.fromDomain, id: messageEntity.from},
          messageEntity.client_id,
          activeConversation,
        );
        resetProgress();
      }
    } catch (error) {
      messageListLogger.warn('Error while trying to reset session', error);
      resetProgress();
    }
  };

  const isLastReceivedMessage = (messageEntity: Message, conversationEntity: ConversationEntity): boolean => {
    return !!messageEntity.timestamp() && messageEntity.timestamp() >= conversationEntity.last_event_timestamp();
  };

  const updateConversationLastRead = (conversationEntity: ConversationEntity, messageEntity: Message): void => {
    const conversationLastRead = conversationEntity.last_read_timestamp();
    const lastKnownTimestamp = conversationEntity.getLastKnownTimestamp(repositories.serverTime.toServerTimestamp());
    const needsUpdate = conversationLastRead < lastKnownTimestamp;

    if (needsUpdate && isLastReceivedMessage(messageEntity, conversationEntity)) {
      conversationEntity.setTimestamp(lastKnownTimestamp, ConversationEntity.TIMESTAMP_TYPE.LAST_READ);
      repositories.message.markAsRead(conversationEntity);
    }
  };

  const getInViewportCallback = (
    conversationEntity: ConversationEntity,
    messageEntity: Message,
  ): (() => void) | undefined => {
    const messageTimestamp = messageEntity.timestamp();
    const callbacks: Function[] = [];

    if (!messageEntity.isEphemeral()) {
      const isCreationMessage = messageEntity.isMember() && messageEntity.isCreation();
      if (conversationEntity.is1to1() && isCreationMessage) {
        repositories.integration.addProviderNameToParticipant((messageEntity as MemberMessage).otherUser());
      }
    }

    const sendReadReceipt = () => {
      // add the message in the buffer of read messages (actual read receipt will be sent in the next batch)
      setReadMessagesBuffer(prevState => [...prevState, {conversation: conversationEntity, message: messageEntity}]);
    };

    const updateLastRead = () => {
      conversationEntity.setTimestamp(messageEntity.timestamp(), ConversationEntity.TIMESTAMP_TYPE.LAST_READ);
    };

    const startTimer = async () => {
      if (messageEntity.conversation_id === conversationEntity.id) {
        repositories.conversation.checkMessageTimer(messageEntity as ContentMessage);
      }
    };

    if (messageEntity.isEphemeral()) {
      callbacks.push(startTimer);
    }

    const isUnreadMessage = messageTimestamp > conversationEntity.last_read_timestamp();
    const isNotOwnMessage = !messageEntity.user().isMe;

    let shouldSendReadReceipt = true;

    if (messageEntity.expectsReadConfirmation) {
      if (conversationEntity.is1to1()) {
        shouldSendReadReceipt = repositories.conversation.expectReadReceipt(conversationEntity);
      } else if (
        conversationEntity.isGroup() &&
        (conversationEntity.inTeam() || conversationEntity.isGuestRoom() || conversationEntity.isGuestAndServicesRoom())
      ) {
        shouldSendReadReceipt = true;
      }
    }

    if (isLastReceivedMessage(messageEntity, conversationEntity)) {
      callbacks.push(() => updateConversationLastRead(conversationEntity, messageEntity));
    }

    if (isUnreadMessage && isNotOwnMessage) {
      callbacks.push(updateLastRead);
      if (shouldSendReadReceipt) {
        callbacks.push(sendReadReceipt);
      }
    }

    if (!callbacks.length) {
      return undefined;
    }

    return () => {
      const trigger = () => callbacks.forEach(callback => callback());

      return document.hasFocus() ? trigger() : window.addEventListener('focus', () => trigger(), {once: true});
    };
  };

  useEffect(() => {
    if (readMessagesBuffer.length) {
      const groupedMessagesTest = groupBy(
        readMessagesBuffer,
        ({conversation, message}) => conversation.id + message.from,
      );

      Object.values(groupedMessagesTest).forEach(readMessagesBatch => {
        const poppedMessage = readMessagesBatch.pop();

        if (poppedMessage) {
          const {conversation, message: firstMessage} = poppedMessage;
          const otherMessages = readMessagesBatch.map(({message}) => message);
          repositories.message.sendReadReceipt(conversation, firstMessage, otherMessages);
        }
      });

      setReadMessagesBuffer([]);
    }
  }, [readMessagesBuffer.length]);

  return (
    <div id="conversation" className={cx('conversation', {loading: !isConversationLoaded})}>
      {activeConversation && (
        <>
          <TitleBar
            conversation={activeConversation}
            userState={userState}
            teamState={teamState}
            callActions={mainViewModel.calling.callActions}
            panelViewModel={mainViewModel.panel}
            callingRepository={repositories.calling}
            legalHoldModal={legalHoldModal}
          />

          <MessagesList
            conversation={activeConversation}
            selfUser={selfUser}
            initialMessage={initialMessage}
            conversationRepository={conversationRepository}
            messageRepository={repositories.message}
            messageActions={mainViewModel.actions}
            invitePeople={clickOnInvitePeople}
            cancelConnectionRequest={clickOnCancelRequest}
            showUserDetails={showUserDetails}
            showMessageDetails={showMessageDetails}
            showParticipants={showParticipants}
            showImageDetails={showDetail}
            resetSession={onSessionResetClick}
            onClickMessage={handleClickOnMessage}
            onLoading={loading => setIsConversationLoaded(!loading)}
            getVisibleCallback={getInViewportCallback}
            isLastReceivedMessage={isLastReceivedMessage}
          />

          <InputBar
            conversationEntity={activeConversation}
            assetRepository={repositories.asset}
            conversationRepository={repositories.conversation}
            eventRepository={repositories.event}
            messageRepository={repositories.message}
            propertiesRepository={repositories.properties}
            searchRepository={repositories.search}
            storageRepository={repositories.storage}
            teamState={teamState}
            userState={userState}
          />

          <div className="conversation-loading">
            <div className="icon-spinner spin accent-text"></div>
          </div>
        </>
      )}

      <Giphy giphyRepository={repositories.giphy} />
    </div>
  );
};

export default ConversationList;
