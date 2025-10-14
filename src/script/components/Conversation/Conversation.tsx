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

import {UIEvent, useCallback, useEffect, useState} from 'react';

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {container} from 'tsyringe';

import {useMatchMedia} from '@wireapp/react-ui-kit';

import {CallingCell} from 'Components/calling/CallingCell';
import {Giphy} from 'Components/Giphy';
import {InputBar} from 'Components/InputBar';
import {MessageListWrapper} from 'Components/MessagesList/MessageListWrapper';
import {showDetailViewModal} from 'Components/Modals/DetailViewModal';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {TitleBar} from 'Components/TitleBar';
import {CallState} from 'Repositories/calling/CallState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation as ConversationEntity} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {DecryptErrorMessage} from 'Repositories/entity/message/DecryptErrorMessage';
import {MemberMessage} from 'Repositories/entity/message/MemberMessage';
import {Message} from 'Repositories/entity/message/Message';
import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isLastReceivedMessage} from 'Util/conversationMessages';
import {allowsAllFiles, getFileExtensionOrName, hasAllowedExtension} from 'Util/FileTypeUtil';
import {isHittingUploadLimit} from 'Util/isHittingUploadLimit';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {safeMailOpen, safeWindowOpen} from 'Util/SanitizationUtil';
import {formatBytes} from 'Util/util';

import {ConversationCells} from './ConversationCells/ConversationCells';
import {ConversationFileDropzone} from './ConversationFileDropzone/ConversationFileDropzone';
import {ConversationMessagesWrapper} from './ConversationMessagesWrapper/ConversationMessagesWrapper';
import {ConversationTabPanel} from './ConversationTabPanel/ConversationTabPanel';
import {ConversationTabs} from './ConversationTabs/ConversationTabs';
import {useReadReceiptSender} from './hooks/useReadReceipt';
import {ReadOnlyConversationMessage} from './ReadOnlyConversationMessage';
import {useFilesUploadDropzone} from './useFilesUploadDropzone/useFilesUploadDropzone';
import {checkFileSharingPermission} from './utils/checkFileSharingPermission';

import {UserError} from '../../error/UserError';
import {isMouseRightClickEvent, isAuxRightClickEvent} from '../../guards/Mouse';
import {isServiceEntity} from '../../guards/Service';
import {MotionDuration} from '../../motion/MotionDuration';
import {RightSidebarParams} from '../../page/AppMain';
import {PanelState} from '../../page/RightSidebar';
import {useMainViewModel} from '../../page/RootProvider';
import {ElementType, MessageDetails} from '../MessagesList/Message/ContentMessage/asset/TextMessageRenderer';

interface ConversationProps {
  readonly teamState: TeamState;
  selfUser: User;
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams, compareEntityId?: boolean) => void;
  isRightSidebarOpen?: boolean;
  reloadApp: () => void;
}

const CONFIG = Config.getConfig();

export const Conversation = ({
  teamState,
  selfUser,
  openRightSidebar,
  isRightSidebarOpen = false,
  reloadApp,
}: ConversationProps) => {
  const messageListLogger = getLogger('ConversationList');

  const isVirtualizedMessagesListEnabled = CONFIG.FEATURE.ENABLE_VIRTUALIZED_MESSAGES_LIST;

  const mainViewModel = useMainViewModel();
  const {content: contentViewModel} = mainViewModel;
  const {conversationRepository, repositories} = contentViewModel;

  const [isConversationLoaded, setIsConversationLoaded] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [isGiphyModalOpen, setIsGiphyModalOpen] = useState<boolean>(false);

  const conversationState = container.resolve(ConversationState);
  const callState = container.resolve(CallState);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, [
    'classifiedDomains',
    'isFileSharingSendingEnabled',
  ]);

  const {is1to1, isRequest, isReadOnlyConversation, isSelfUserRemoved} = useKoSubscribableChildren(
    activeConversation!,
    [
      'is1to1',
      'isRequest',
      'readOnlyState',
      'participating_user_ets',
      'connection',
      'isReadOnlyConversation',
      'isSelfUserRemoved',
    ],
  );

  const inTeam = teamState.isInTeam(selfUser);

  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);

  const [isMsgElementsFocusable, setMsgElementsFocusable] = useState(true);

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia('max-width: 640px');

  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const {addReadReceiptToBatch} = useReadReceiptSender(repositories.message);

  useEffect(() => {
    if (!isVirtualizedMessagesListEnabled) {
      // When the component is mounted we want to make sure its conversation entity's last message is marked as visible
      // not to display the jump to last message button initially
      activeConversation?.isLastMessageVisible(true);
    }
  }, [activeConversation, isVirtualizedMessagesListEnabled]);

  const uploadImages = useCallback(
    (images: File[]) => {
      if (!activeConversation || isHittingUploadLimit(images, repositories.asset)) {
        return;
      }

      for (const image of Array.from(images)) {
        const isImageTooLarge = image.size > CONFIG.MAXIMUM_IMAGE_FILE_SIZE;

        if (isImageTooLarge) {
          const isGif = image.type === 'image/gif';
          const bytesMultiplier = 1024;
          const maxSize = CONFIG.MAXIMUM_IMAGE_FILE_SIZE / bytesMultiplier / bytesMultiplier;

          return showWarningModal(
            t(isGif ? 'modalGifTooLargeHeadline' : 'modalPictureTooLargeHeadline'),
            t(isGif ? 'modalGifTooLargeMessage' : 'modalPictureTooLargeMessage', {number: maxSize}),
          );
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
            showWarningModal(t('modalAssetTooLargeHeadline'), t('modalAssetTooLargeMessage', {number: fileSize}));

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
          const isSupportedImage = (CONFIG.ALLOWED_IMAGE_TYPES as ReadonlyArray<string>).includes(file.type);

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

    openRightSidebar(panelId, {entity: serviceEntity || userEntity}, true);
  };

  const showParticipants = (participants: User[]) => {
    if (activeConversation) {
      openRightSidebar(PanelState.CONVERSATION_PARTICIPANTS, {entity: activeConversation, highlighted: participants});
    }
  };

  const showMessageDetails = (message: Message, showReactions = false) => {
    if (!is1to1) {
      openRightSidebar(PanelState.MESSAGE_DETAILS, {entity: message, showReactions}, true);
    }
  };

  const showMessageReactions = (message: Message, showReactions = true) => {
    openRightSidebar(PanelState.MESSAGE_DETAILS, {entity: message, showReactions}, true);
  };

  const handleEmailClick = (event: Event, messageDetails: MessageDetails) => {
    safeMailOpen(messageDetails.href!);
    event.preventDefault();
    return false;
  };

  const handleMarkdownLinkClick = (event: MouseEvent | KeyboardEvent, messageDetails: MessageDetails) => {
    const href = messageDetails.href!;
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      primaryAction: {
        action: () => safeWindowOpen(href),
        text: t('modalOpenLinkAction'),
      },
      text: {
        htmlMessage: t('modalOpenLinkMessage', {link: href}, {}, true),
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
    event: MouseEvent | KeyboardEvent,
    elementType: ElementType,
    messageDetails: MessageDetails = {
      href: '',
      userId: '',
      userDomain: '',
    },
  ) => {
    if (isMouseRightClickEvent(event) || isAuxRightClickEvent(event)) {
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
      selfUser,
    });
  };

  const onSessionResetClick = async (messageEntity: DecryptErrorMessage): Promise<void> => {
    const resetProgress = () => {
      setTimeout(() => {
        PrimaryModal.show(PrimaryModal.type.SESSION_RESET, {});
      }, MotionDuration.LONG);
    };

    try {
      if (messageEntity.fromDomain && activeConversation) {
        await repositories.message.resetSession(
          {domain: messageEntity.fromDomain, id: messageEntity.from},
          messageEntity.clientId,
          activeConversation,
        );
        resetProgress();
      }
    } catch (error) {
      messageListLogger.warn('Error while trying to reset session', error);
      resetProgress();
    }
  };

  const updateConversationLastRead = (conversationEntity: ConversationEntity, messageEntity?: Message): void => {
    const conversationLastRead = conversationEntity.last_read_timestamp();
    const lastKnownTimestamp = conversationEntity.getLastKnownTimestamp(repositories.serverTime.toServerTimestamp());
    const needsUpdate = conversationLastRead < lastKnownTimestamp;

    // if no message provided it means we need to jump to the last message
    if (needsUpdate && (!messageEntity || isLastReceivedMessage(messageEntity, conversationEntity))) {
      conversationEntity.setTimestamp(lastKnownTimestamp, ConversationEntity.TIMESTAMP_TYPE.LAST_READ);
      repositories.message.markAsRead(conversationEntity);
    }
  };

  const getInViewportCallback = useCallback(
    (conversationEntity: ConversationEntity, messageEntity: Message) => {
      const messageTimestamp = messageEntity.timestamp();

      const callbacks: Function[] = [];

      if (!messageEntity.isEphemeral()) {
        const isCreationMessage = messageEntity.isMember() && messageEntity.isCreation();
        if (conversationEntity.is1to1() && isCreationMessage) {
          repositories.integration.addProviderNameToParticipant((messageEntity as MemberMessage).otherUser());
        }
      }

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
          conversationEntity.isGroupOrChannel() &&
          (conversationEntity.inTeam() ||
            conversationEntity.isGuestRoom() ||
            conversationEntity.isGuestAndServicesRoom())
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
          callbacks.push(() => addReadReceiptToBatch(conversationEntity, messageEntity));
        }
      }

      return () => {
        const trigger = () => callbacks.forEach(callback => callback());

        return document.hasFocus() ? trigger() : window.addEventListener('focus', () => trigger(), {once: true});
      };
    },
    [addReadReceiptToBatch, repositories.conversation, repositories.integration, updateConversationLastRead],
  );

  const isFileTabActive = activeTabIndex === 1;

  const isCellsEnabled =
    Config.getConfig().FEATURE.ENABLE_CELLS && activeConversation?.cellsState() !== CONVERSATION_CELLS_STATE.DISABLED;

  const {getRootProps, getInputProps, openAllFilesView, openImageFilesView, handlePastedFile, isDragAccept} =
    useFilesUploadDropzone({
      isTeam: inTeam,
      cellsRepository: repositories.cells,
      conversation: activeConversation,
      isCellsEnabled: isCellsEnabled,
      isDisabled: isFileTabActive,
    });

  return (
    <ConversationFileDropzone
      isDragAccept={isDragAccept}
      isCellsEnabled={isCellsEnabled}
      isConversationLoaded={isConversationLoaded}
      activeConversationId={activeConversation?.id}
      onFileDropped={checkFileSharingPermission(uploadDroppedFiles)}
      rootProps={getRootProps()}
      inputProps={getInputProps()}
    >
      {activeConversation && (
        <>
          <TitleBar
            repositories={repositories}
            conversation={activeConversation}
            selfUser={selfUser}
            teamState={teamState}
            callActions={mainViewModel.calling.callActions}
            openRightSidebar={openRightSidebar}
            isRightSidebarOpen={isRightSidebarOpen}
            isReadOnlyConversation={isReadOnlyConversation || isSelfUserRemoved}
            withBottomDivider={!isCellsEnabled}
          />

          {isCellsEnabled && (
            <>
              <ConversationTabs
                activeTabIndex={activeTabIndex}
                onIndexChange={setActiveTabIndex}
                conversationQualifiedId={activeConversation.qualifiedId}
              />
              <ConversationTabPanel id="files" isActive={isFileTabActive}>
                {isFileTabActive && (
                  <ConversationCells
                    activeConversation={activeConversation}
                    userRepository={repositories.user}
                    cellsRepository={repositories.cells}
                    conversationRepository={conversationRepository}
                  />
                )}
              </ConversationTabPanel>
            </>
          )}

          <ConversationMessagesWrapper isCellsEnabled={isCellsEnabled} isPanelHidden={isFileTabActive}>
            {activeCalls.map(call => {
              const {conversation} = call;
              const callingViewModel = mainViewModel.calling;
              const callingRepository = callingViewModel.callingRepository;

              if (!smBreakpoint) {
                return null;
              }

              return (
                <CallingCell
                  key={conversation.id}
                  classifiedDomains={classifiedDomains}
                  call={call}
                  callActions={callingViewModel.callActions}
                  callingRepository={callingRepository}
                  propertiesRepository={repositories.properties}
                />
              );
            })}

            <MessageListWrapper
              conversation={activeConversation}
              selfUser={selfUser}
              conversationRepository={conversationRepository}
              assetRepository={repositories.asset}
              messageRepository={repositories.message}
              messageActions={mainViewModel.actions}
              invitePeople={clickOnInvitePeople}
              cancelConnectionRequest={clickOnCancelRequest}
              showUserDetails={showUserDetails}
              showMessageDetails={showMessageDetails}
              showMessageReactions={showMessageReactions}
              showParticipants={showParticipants}
              showImageDetails={showDetail}
              resetSession={onSessionResetClick}
              onClickMessage={handleClickOnMessage}
              isConversationLoaded={isConversationLoaded}
              onLoading={loading => setIsConversationLoaded(!loading)}
              getVisibleCallback={getInViewportCallback}
              isMsgElementsFocusable={isMsgElementsFocusable}
              setMsgElementsFocusable={setMsgElementsFocusable}
              isRightSidebarOpen={isRightSidebarOpen}
              updateConversationLastRead={updateConversationLastRead}
            />

            {isConversationLoaded &&
              !isSelfUserRemoved &&
              (isReadOnlyConversation ? (
                <ReadOnlyConversationMessage reloadApp={reloadApp} conversation={activeConversation} />
              ) : (
                <InputBar
                  key={activeConversation?.id}
                  conversation={activeConversation}
                  conversationRepository={repositories.conversation}
                  cellsRepository={repositories.cells}
                  eventRepository={repositories.event}
                  messageRepository={repositories.message}
                  openGiphy={openGiphy}
                  propertiesRepository={repositories.properties}
                  searchRepository={repositories.search}
                  storageRepository={repositories.storage}
                  teamState={teamState}
                  selfUser={selfUser}
                  isCellsEnabled={isCellsEnabled}
                  onShiftTab={() => setMsgElementsFocusable(false)}
                  uploadDroppedFiles={uploadDroppedFiles}
                  uploadImages={uploadImages}
                  uploadFiles={uploadFiles}
                  uploadPastedFiles={handlePastedFile}
                  onCellImageUpload={openImageFilesView}
                  onCellAssetUpload={openAllFilesView}
                />
              ))}

            <div className="conversation-loading">
              <div className="icon-spinner spin accent-text"></div>
            </div>
          </ConversationMessagesWrapper>
        </>
      )}

      {isGiphyModalOpen && inputValue && (
        <Giphy giphyRepository={repositories.giphy} inputValue={inputValue} onClose={closeGiphy} />
      )}
    </ConversationFileDropzone>
  );
};
