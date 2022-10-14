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
  UIEvent,
  useContext,
  useEffect,
  useState,
} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';
import {groupBy} from 'underscore';

import Giphy from 'Components/Giphy';
import InputBar from 'Components/InputBar';
import MessagesList from 'Components/MessagesList';
import {showDetailViewModal} from 'Components/Modals/DetailViewModal';
import {TitleBar} from 'Components/TitleBar';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {safeMailOpen, safeWindowOpen} from 'Util/SanitizationUtil';

import PrimaryModal from '../../components/Modals/PrimaryModal';
import {ConversationState} from '../../conversation/ConversationState';
import {Conversation as ConversationEntity} from '../../entity/Conversation';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {DecryptErrorMessage} from '../../entity/message/DecryptErrorMessage';
import {MemberMessage} from '../../entity/message/MemberMessage';
import {Message} from '../../entity/message/Message';
import {Text} from '../../entity/message/Text';
import {User} from '../../entity/User';
import {UserError} from '../../error/UserError';
import {isMouseEvent} from '../../guards/Mouse';
import {isServiceEntity} from '../../guards/Service';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {MotionDuration} from '../../motion/MotionDuration';
import {RightSidebarParams} from '../../page/AppMain';
import {PanelState} from '../../page/RightSidebar/RightSidebar';
import {RootContext} from '../../page/RootProvider';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';

type ReadMessageBuffer = {conversation: ConversationEntity; message: Message};

interface ConversationListProps {
  readonly initialMessage?: Message;
  readonly teamState: TeamState;
  readonly userState: UserState;
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams) => void;
  isRightSidebarOpen?: boolean;
}

const ConversationList: FC<ConversationListProps> = ({
  initialMessage,
  teamState,
  userState,
  openRightSidebar,
  isRightSidebarOpen = false,
}) => {
  const messageListLogger = getLogger('ConversationList');

  const mainViewModel = useContext(RootContext);

  const [isConversationLoaded, setIsConversationLoaded] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [isGiphyModalOpen, setIsGiphyModalOpen] = useState<boolean>(false);

  const [readMessagesBuffer, setReadMessagesBuffer] = useState<ReadMessageBuffer[]>([]);

  const conversationState = container.resolve(ConversationState);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {is1to1, isRequest} = useKoSubscribableChildren(activeConversation!, ['is1to1', 'isRequest']);
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

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

  if (!mainViewModel) {
    return null;
  }

  const {content: contentViewModel} = mainViewModel;
  const {conversationRepository, repositories} = contentViewModel;

  const openGiphy = (text: string) => {
    setInputValue(text);
    setIsGiphyModalOpen(true);
  };

  const closeGiphy = () => setIsGiphyModalOpen(false);

  const clickOnInvitePeople = (conversation: ConversationEntity): void => {
    openRightSidebar(PanelState.GUEST_OPTIONS, {entity: conversation});
  };

  const clickOnCancelRequest = (messageEntity: MemberMessage): void => {
    if (activeConversation) {
      const nextConversationEntity = conversationRepository.getNextConversation(activeConversation);
      mainViewModel.actions.cancelConnectionRequest(messageEntity.otherUser(), true, nextConversationEntity);
    }
  };

  const showUserDetails = (userEntity: User | ServiceEntity) => {
    const isSingleModeConversation = is1to1 || isRequest;

    const isUserEntity = !isServiceEntity(userEntity);
    if (
      activeConversation &&
      isUserEntity &&
      (userEntity.isDeleted || (isSingleModeConversation && !userEntity.isMe))
    ) {
      openRightSidebar(PanelState.CONVERSATION_DETAILS, {entity: activeConversation});

      return;
    }

    const panelId = userEntity.isService ? PanelState.GROUP_PARTICIPANT_SERVICE : PanelState.GROUP_PARTICIPANT_USER;

    openRightSidebar(panelId, {entity: userEntity});
  };

  const showParticipants = (participants: User[]) => {
    if (activeConversation) {
      openRightSidebar(PanelState.CONVERSATION_PARTICIPANTS, {entity: activeConversation, highlighted: participants});
    }
  };

  const showMessageDetails = (message: Message, showLikes = false) => {
    if (!is1to1) {
      openRightSidebar(PanelState.MESSAGE_DETAILS, {entity: message, showLikes});
    }
  };

  const handleClickOnMessage = (
    messageEntity: ContentMessage | Text,
    event: ReactMouseEvent | ReactKeyboardEvent<HTMLElement>,
  ) => {
    if (isMouseEvent(event) && event.button === 2) {
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
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
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
    const domain = mentionElement?.dataset.userDomain;

    if (userId) {
      (async () => {
        try {
          const userEntity = await repositories.user.getUserById({domain: domain || '', id: userId});
          showUserDetails(userEntity);
        } catch (error) {
          if (error instanceof UserError && error.type !== UserError.TYPE.USER_NOT_FOUND) {
            throw error;
          }
        }
      })();
    }

    // need to return `true` because knockout will prevent default if we return anything else (including undefined)
    return true;
  };

  const showDetail = async (messageEntity: ContentMessage, event: UIEvent): Promise<void> => {
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
        PrimaryModal.show(PrimaryModal.type.SESSION_RESET, {});
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

  return (
    <div id="conversation" className={cx('conversation', {loading: !isConversationLoaded})}>
      {activeConversation && (
        <>
          <TitleBar
            repositories={repositories}
            conversation={activeConversation}
            userState={userState}
            teamState={teamState}
            callActions={mainViewModel.calling.callActions}
            openRightSidebar={openRightSidebar}
            isRightSidebarOpen={isRightSidebarOpen}
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
            openGiphy={openGiphy}
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

      {isGiphyModalOpen && inputValue && (
        <Giphy giphyRepository={repositories.giphy} inputValue={inputValue} onClose={closeGiphy} />
      )}
    </div>
  );
};

export default ConversationList;
