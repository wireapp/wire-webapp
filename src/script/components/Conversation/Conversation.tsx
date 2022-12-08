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

import {FC, UIEvent, useCallback, useEffect, useState} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';
import {groupBy} from 'underscore';

import {useMatchMedia} from '@wireapp/react-ui-kit';

import {CallingCell} from 'Components/calling/CallingCell';
import {Giphy} from 'Components/Giphy';
import {InputBar} from 'Components/InputBar';
import {useDropFiles} from 'Components/InputBar/hooks/useDropFiles';
import {MessagesList} from 'Components/MessagesList';
import {showDetailViewModal} from 'Components/Modals/DetailViewModal';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {TitleBar} from 'Components/TitleBar';
import {CallState} from 'src/script/calling/CallState';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {allowsAllFiles, getFileExtensionOrName, hasAllowedExtension} from 'Util/FileTypeUtil';
import {isHittingUploadLimit} from 'Util/isHittingUploadLimit';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {safeMailOpen, safeWindowOpen} from 'Util/SanitizationUtil';
import {formatBytes, incomingCssClass, removeAnimationsClass} from 'Util/util';

import {ConversationState} from '../../conversation/ConversationState';
import {Conversation as ConversationEntity} from '../../entity/Conversation';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {DecryptErrorMessage} from '../../entity/message/DecryptErrorMessage';
import {MemberMessage} from '../../entity/message/MemberMessage';
import {Message} from '../../entity/message/Message';
import {Text} from '../../entity/message/Text';
import {User} from '../../entity/User';
import {UserError} from '../../error/UserError';
import {isMouseRightClickEvent, isAuxRightClickEvent} from '../../guards/Mouse';
import {isServiceEntity} from '../../guards/Service';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {MotionDuration} from '../../motion/MotionDuration';
import {RightSidebarParams} from '../../page/AppMain';
import {PanelState} from '../../page/RightSidebar';
import {useMainViewModel} from '../../page/RootProvider';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {ElementType, MessageDetails} from '../MessagesList/Message/ContentMessage/asset/TextMessageRenderer';

type ReadMessageBuffer = {conversation: ConversationEntity; message: Message};

interface ConversationProps {
  readonly initialMessage?: Message;
  readonly teamState: TeamState;
  readonly userState: UserState;
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams, compareEntityId?: boolean) => void;
  isRightSidebarOpen?: boolean;
}

const CONFIG = Config.getConfig();

export const Conversation: FC<ConversationProps> = ({
  initialMessage,
  teamState,
  userState,
  openRightSidebar,
  isRightSidebarOpen = false,
}) => {
  const messageListLogger = getLogger('ConversationList');

  const mainViewModel = useMainViewModel();
  const {content: contentViewModel} = mainViewModel;
  const {conversationRepository, repositories} = contentViewModel;

  const [isConversationLoaded, setIsConversationLoaded] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [isGiphyModalOpen, setIsGiphyModalOpen] = useState<boolean>(false);

  const [readMessagesBuffer, setReadMessagesBuffer] = useState<ReadMessageBuffer[]>([]);

  const conversationState = container.resolve(ConversationState);
  const callState = container.resolve(CallState);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {classifiedDomains, isFileSharingSendingEnabled} = useKoSubscribableChildren(teamState, [
    'classifiedDomains',
    'isFileSharingSendingEnabled',
  ]);
  const {is1to1, isRequest} = useKoSubscribableChildren(activeConversation!, ['is1to1', 'isRequest']);
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  const {inTeam} = useKoSubscribableChildren(selfUser, ['inTeam']);

  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);
  const [isMsgElementsFocusable, setMsgElementsFocusable] = useState(true);

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia('max-width: 640px');

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

  /**
   * higher order function to check if file sharing is enabled.
   * If not enabled, it will show a warning modal else will return the given callback
   *
   * @param callback - function to be called if file sharing is enabled
   */
  const checkFileSharingPermission = useCallback(
    <T extends (...args: any[]) => void>(callback: T): T | (() => void) => {
      if (isFileSharingSendingEnabled) {
        return callback;
      }
      return () => {
        showWarningModal(
          t('conversationModalRestrictedFileSharingHeadline'),
          t('conversationModalRestrictedFileSharingDescription'),
        );
      };
    },
    [isFileSharingSendingEnabled],
  );

  const uploadImages = useCallback(
    (images: File[]) => {
      if (!activeConversation) {
        return;
      }

      if (isHittingUploadLimit(images, repositories.asset)) {
        return;
      }

      for (const image of Array.from(images)) {
        const isImageTooLarge = image.size > CONFIG.MAXIMUM_IMAGE_FILE_SIZE;

        if (isImageTooLarge) {
          const isGif = image.type === 'image/gif';
          const maxSize = CONFIG.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;

          showWarningModal(
            t(isGif ? 'modalGifTooLargeHeadline' : 'modalPictureTooLargeHeadline'),
            t(isGif ? 'modalGifTooLargeMessage' : 'modalPictureTooLargeMessage', maxSize),
          );

          return;
        }
      }

      repositories.message.uploadImages(activeConversation, images);
    },
    [activeConversation, repositories.asset, repositories.message],
  );

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (!activeConversation) {
        return;
      }

      const fileArray = Array.from(files);

      if (!allowsAllFiles()) {
        for (const file of fileArray) {
          if (!hasAllowedExtension(file.name)) {
            conversationRepository.injectFileTypeRestrictedMessage(
              activeConversation,
              selfUser,
              false,
              getFileExtensionOrName(file.name),
            );

            return;
          }
        }
      }

      const uploadLimit = inTeam ? CONFIG.MAXIMUM_ASSET_FILE_SIZE_TEAM : CONFIG.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;

      if (!isHittingUploadLimit(files, repositories.asset)) {
        for (const file of fileArray) {
          const isFileTooLarge = file.size > uploadLimit;

          if (isFileTooLarge) {
            const fileSize = formatBytes(uploadLimit);
            showWarningModal(t('modalAssetTooLargeHeadline'), t('modalAssetTooLargeMessage', fileSize));

            return;
          }
        }

        repositories.message.uploadFiles(activeConversation, files);
      }
    },
    [activeConversation, conversationRepository, inTeam, repositories.asset, repositories.message, selfUser],
  );

  const uploadDroppedFiles = useCallback(
    (droppedFiles: File[]) => {
      const images: File[] = [];
      const files: File[] = [];

      if (!isHittingUploadLimit(droppedFiles, repositories.asset)) {
        Array.from(droppedFiles).forEach(file => {
          const isSupportedImage = CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);

          if (isSupportedImage) {
            images.push(file);
          } else {
            files.push(file);
          }
        });

        uploadImages(images);
        uploadFiles(files);
      }
    },
    [repositories.asset, uploadFiles, uploadImages],
  );

  const {handleFileDrop} = useDropFiles(checkFileSharingPermission(uploadDroppedFiles));

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

  const showUserDetails = async (userEntity: User | ServiceEntity) => {
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

    const serviceEntity = userEntity.isService && (await repositories.integration.getServiceFromUser(userEntity));

    if (serviceEntity) {
      openRightSidebar(panelId, {entity: {...serviceEntity, id: userEntity.id}}, true);
    } else {
      openRightSidebar(panelId, {entity: userEntity}, true);
    }
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

  const handleEmailClick = (event: Event, messageDetails: MessageDetails) => {
    safeMailOpen(messageDetails.href!);
    event.preventDefault();
    return false;
  };

  const handleMarkdownLinkClick = (event: MouseEvent | KeyboardEvent, messageDetails: MessageDetails) => {
    if (isAuxRightClickEvent(event)) {
      // Default browser behavior on right click
      return true;
    }
    const href = messageDetails.href!;
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      primaryAction: {
        action: () => safeWindowOpen(href),
        text: t('modalOpenLinkAction'),
      },
      text: {
        message: t('modalOpenLinkMessage', href, {}, true),
        title: t('modalOpenLinkTitle'),
      },
    });
    event.preventDefault();
    return false;
  };

  const userMentionClick = (messageDetails: MessageDetails) => {
    const userId = messageDetails.userId;
    const domain = messageDetails.userDomain;

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
  };

  const handleClickOnMessage = (
    messageEntity: ContentMessage | Text,
    event: MouseEvent | KeyboardEvent,
    elementType: ElementType,
    messageDetails: MessageDetails = {
      href: '',
      userId: '',
      userDomain: '',
    },
  ) => {
    if (isMouseRightClickEvent(event)) {
      // Default browser behavior on right click
      return true;
    }

    switch (elementType) {
      case 'email':
        handleEmailClick(event, messageDetails);
        break;
      case 'markdownLink':
        handleMarkdownLinkClick(event, messageDetails);
        break;
      case 'mention':
        userMentionClick(messageDetails);
        break;
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

    let shouldSendReadReceipt = false;

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

  const wrapperRefHandler = (element: HTMLElement | null) => {
    removeAnimationsClass(element);
    handleFileDrop(element);
  };

  return (
    <div
      id="conversation"
      className={cx('conversation', {[incomingCssClass]: isConversationLoaded, loading: !isConversationLoaded})}
      ref={wrapperRefHandler}
      key={activeConversation?.id}
    >
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

          {activeCalls.map(call => {
            const conversation = conversationState.findConversation(call.conversationId);
            const callingViewModel = mainViewModel.calling;
            const callingRepository = callingViewModel.callingRepository;

            if (!conversation || !smBreakpoint) {
              return null;
            }

            return (
              <div className="calling-cell" key={conversation.id}>
                <CallingCell
                  classifiedDomains={classifiedDomains}
                  call={call}
                  callActions={callingViewModel.callActions}
                  callingRepository={callingRepository}
                  conversation={conversation}
                  multitasking={callingViewModel.multitasking}
                />
              </div>
            );
          })}

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
            isMsgElementsFocusable={isMsgElementsFocusable}
            setMsgElementsFocusable={setMsgElementsFocusable}
          />

          <InputBar
            conversationEntity={activeConversation}
            conversationRepository={repositories.conversation}
            eventRepository={repositories.event}
            messageRepository={repositories.message}
            openGiphy={openGiphy}
            propertiesRepository={repositories.properties}
            searchRepository={repositories.search}
            storageRepository={repositories.storage}
            teamState={teamState}
            userState={userState}
            onShiftTab={() => setMsgElementsFocusable(false)}
            uploadDroppedFiles={uploadDroppedFiles}
            uploadImages={uploadImages}
            uploadFiles={uploadFiles}
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
