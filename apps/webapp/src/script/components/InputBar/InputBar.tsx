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

import {useCallback, useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {ConversationClassifiedBar} from 'Components/ClassifiedBar/ClassifiedBar';
import {useFileUploadState} from 'Components/Conversation/useFilesUploadState/useFilesUploadState';
import {EmojiPicker} from 'Components/EmojiPicker/EmojiPicker';
import {useUserPropertyValue} from 'Hooks/useUserProperty';
import {LexicalEditor, $createTextNode, $insertNodes} from 'lexical';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {StorageRepository} from 'Repositories/storage';
import {TeamState} from 'Repositories/team/TeamState';
import {EventName} from 'Repositories/tracking/EventName';
import {CONVERSATION_TYPING_INDICATOR_MODE} from 'Repositories/user/TypingIndicatorMode';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {WebAppEvents} from '@wireapp/webapp-events';

import {MessageContent} from './common/messageContent/messageContent';
import {FilePreviews} from './FilePreviews/FilePreviews';
import {InputBarContainer} from './InputBarContainer/InputBarContainer';
import {InputBarControls} from './InputBarControls/InputBarControls';
import {InputBarEditor} from './InputBarEditor/InputBarEditor';
import {PastedFileControls} from './PastedFileControls/PastedFileControls';
import {ReplyBar} from './ReplyBar/ReplyBar';
import {TypingIndicator} from './TypingIndicator';
import {useEmojiPicker} from './useEmojiPicker/useEmojiPicker';
import {useFileHandling} from './useFileHandling/useFileHandling';
import {useFormatToolbar} from './useFormatToolbar/useFormatToolbar';
import {useGiphy} from './useGiphy/useGiphy';
import {useMessageHandling} from './useMessageHandling/useMessageHandling';
import {usePing} from './usePing/usePing';
import {useTypingIndicator} from './useTypingIndicator/useTypingIndicator';

import {Config} from '../../Config';

const CONFIG = {
  ...Config.getConfig(),
  PING_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
  GIPHY_TEXT_LENGTH: 256,
};

interface InputBarProps {
  readonly conversation: Conversation;
  readonly conversationRepository: ConversationRepository;
  readonly cellsRepository: CellsRepository;
  readonly eventRepository: EventRepository;
  readonly messageRepository: MessageRepository;
  readonly openGiphy: (inputValue: string) => void;
  readonly propertiesRepository: PropertiesRepository;
  readonly searchRepository: SearchRepository;
  readonly storageRepository: StorageRepository;
  readonly teamState: TeamState;
  readonly selfUser: User;
  readonly isCellsEnabled: boolean;
  onShiftTab: () => void;
  uploadDroppedFiles: (droppedFiles: File[]) => void;
  uploadImages: (images: File[]) => void;
  uploadFiles: (files: File[]) => void;
  uploadPastedFiles: (file: File) => void;
  onCellImageUpload: () => void;
  onCellAssetUpload: () => void;
}

export const InputBar = ({
  conversation,
  conversationRepository,
  cellsRepository,
  eventRepository,
  messageRepository,
  openGiphy,
  propertiesRepository,
  searchRepository,
  storageRepository,
  selfUser,
  teamState = container.resolve(TeamState),
  isCellsEnabled,
  onShiftTab,
  uploadDroppedFiles,
  uploadImages,
  uploadFiles,
  uploadPastedFiles,
  onCellImageUpload,
  onCellAssetUpload,
}: InputBarProps) => {
  const {classifiedDomains, isSelfDeletingMessagesEnabled, isFileSharingSendingEnabled} = useKoSubscribableChildren(
    teamState,
    ['classifiedDomains', 'isSelfDeletingMessagesEnabled', 'isFileSharingSendingEnabled'],
  );
  const {connection, localMessageTimer, messageTimer, hasGlobalMessageTimer, isSelfUserRemoved, is1to1} =
    useKoSubscribableChildren(conversation, [
      'connection',
      'localMessageTimer',
      'messageTimer',
      'hasGlobalMessageTimer',
      'isSelfUserRemoved',
      'is1to1',
      'cellsState',
    ]);
  const {isOutgoingRequest, isIncomingRequest} = useKoSubscribableChildren(connection!, [
    'isOutgoingRequest',
    'isIncomingRequest',
  ]);

  const {getFiles} = useFileUploadState();
  const files = getFiles({conversationId: conversation.id});

  const wrapperRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<LexicalEditor | null>(null);

  const {typingIndicatorMode} = useKoSubscribableChildren(propertiesRepository, ['typingIndicatorMode']);
  const isTypingIndicatorEnabled = typingIndicatorMode === CONVERSATION_TYPING_INDICATOR_MODE.ON;

  /** The messageContent represents the message being edited.
   * It's directly derived from the editor state
   */
  const [messageContent, setMessageContent] = useState<MessageContent>({text: ''});

  const formatToolbar = useFormatToolbar();

  const emojiPicker = useEmojiPicker({
    wrapperRef,
    onEmojiPicked: emoji => {
      editorRef.current?.update(() => {
        $insertNodes([$createTextNode(emoji)]);
      });
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.INPUT.EMOJI_MODAL.EMOJI_PICKED);
    },
  });

  const inputPlaceholder = messageTimer ? t('tooltipConversationEphemeral') : t('tooltipConversationInputPlaceholder');

  const isConnectionRequest = isOutgoingRequest || isIncomingRequest;
  const hasLocalEphemeralTimer = isSelfDeletingMessagesEnabled && !!localMessageTimer && !hasGlobalMessageTimer;
  const isTypingRef = useRef(false);

  const shouldReplaceEmoji = useUserPropertyValue<boolean>(
    () => propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE),
    WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE,
  );

  const getMentionCandidates = useCallback(
    (search?: string | null) => {
      const candidates = conversation.participating_user_ets().filter(userEntity => !userEntity.isService);
      return typeof search === 'string' ? searchRepository.searchUserInSet(search, candidates) : candidates;
    },
    [conversation, searchRepository],
  );

  useTypingIndicator({
    isEnabled: isTypingIndicatorEnabled,
    text: messageContent.text,
    onTypingChange: useCallback(
      isTyping => {
        isTypingRef.current = isTyping;
        if (isTyping) {
          void conversationRepository.sendTypingStart(conversation);
        } else {
          void conversationRepository.sendTypingStop(conversation);
        }
      },
      [conversationRepository, conversation],
    ),
  });

  const fileHandling = useFileHandling({
    uploadDroppedFiles,
    uploadImages,
    isFileNameKept: isCellsEnabled,
  });

  const showMarkdownPreview = useUserPropertyValue<boolean>(
    () => propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.MARKDOWN_PREVIEW),
    WebAppEvents.PROPERTIES.UPDATE.INTERFACE.MARKDOWN_PREVIEW,
  );

  const {
    editedMessage,
    replyMessageEntity,
    isEditing,
    isReplying,
    sendMessage,
    cancelSending,
    cancelMesssageEditing,
    cancelMessageReply,
    editMessage,
    draftState,
    generateQuote,
    isSending,
    isSendingDisabled,
  } = useMessageHandling({
    messageContent,
    conversation,
    conversationRepository,
    cellsRepository,
    storageRepository,
    eventRepository,
    messageRepository,
    editorRef,
    pastedFile: fileHandling.pastedFile,
    sendPastedFile: fileHandling.sendPastedFile,
  });

  if (fileHandling.pastedFile && !!isCellsEnabled) {
    uploadPastedFiles(fileHandling.pastedFile);
    fileHandling.clearPastedFile();
  }

  const ping = usePing({
    conversation,
    messageRepository,
    is1to1,
  });

  const giphy = useGiphy({
    text: messageContent.text,
    maxLength: CONFIG.GIPHY_TEXT_LENGTH,
    openGiphy,
    generateQuote,
    messageRepository,
    conversation,
    cancelMesssageEditing,
  });

  const handleSendMessage = useCallback(() => {
    if (isSendingDisabled) {
      return;
    }

    void sendMessage();
  }, [isSendingDisabled, sendMessage]);

  const showAvatar = !!messageContent.text.length;

  return (
    <div ref={wrapperRef}>
      <InputBarContainer>
        {isTypingIndicatorEnabled && <TypingIndicator conversationId={conversation.id} />}

        {classifiedDomains && !isConnectionRequest && (
          <ConversationClassifiedBar conversation={conversation} classifiedDomains={classifiedDomains} />
        )}

        {isReplying && !isEditing && replyMessageEntity && (
          <ReplyBar replyMessageEntity={replyMessageEntity} onCancel={() => cancelMessageReply(false)} />
        )}

        <div
          className={cx(`conversation-input-bar__input input-bar-container`, {
            [`conversation-input-bar__input--editing`]: isEditing,
            'input-bar-container--with-toolbar': formatToolbar.open && showMarkdownPreview,
            'input-bar-container--with-files': !!files.length,
          })}
        >
          {!isOutgoingRequest && (
            <>
              <div className="input-bar-avatar">
                {showAvatar && (
                  <Avatar
                    className="cursor-default"
                    participant={selfUser}
                    avatarSize={AVATAR_SIZE.X_SMALL}
                    hideAvailabilityStatus
                  />
                )}
              </div>
              {!isSelfUserRemoved && !fileHandling.pastedFile && (
                <InputBarEditor
                  editorRef={editorRef}
                  editedMessage={editedMessage}
                  inputPlaceholder={inputPlaceholder}
                  hasLocalEphemeralTimer={hasLocalEphemeralTimer}
                  showMarkdownPreview={showMarkdownPreview}
                  formatToolbar={formatToolbar}
                  onSetup={editor => {
                    editorRef.current = editor;
                  }}
                  onEscape={cancelSending}
                  onArrowUp={() => {
                    if (messageContent.text.length === 0) {
                      editMessage(conversation.getLastEditableMessage());
                    }
                  }}
                  onShiftTab={onShiftTab}
                  onBlur={() => isTypingRef.current && conversationRepository.sendTypingStop(conversation)}
                  onUpdate={setMessageContent}
                  onSend={handleSendMessage}
                  getMentionCandidates={getMentionCandidates}
                  saveDraftState={draftState.save}
                  loadDraftState={draftState.load}
                  replaceEmojis={shouldReplaceEmoji}
                >
                  {!!files.length && <FilePreviews files={files} conversationQualifiedId={conversation.qualifiedId} />}
                  <InputBarControls
                    conversation={conversation}
                    isCellsFeatureEnabled={isCellsEnabled}
                    isFileSharingSendingEnabled={isFileSharingSendingEnabled}
                    pingDisabled={ping.isPingDisabled}
                    messageContent={messageContent}
                    isEditing={isEditing}
                    isSendingDisabled={isSendingDisabled}
                    showMarkdownPreview={showMarkdownPreview}
                    showGiphyButton={giphy.showGiphyButton}
                    formatToolbar={formatToolbar}
                    emojiPicker={emojiPicker}
                    onEscape={cancelSending}
                    onClickPing={ping.handlePing}
                    onGifClick={giphy.handleGifClick}
                    onSelectFiles={uploadFiles}
                    onSelectImages={uploadImages}
                    onSend={handleSendMessage}
                    isSending={isSending}
                    onCellImageUpload={onCellImageUpload}
                    onCellAssetUpload={onCellAssetUpload}
                  />
                </InputBarEditor>
              )}
            </>
          )}

          {fileHandling.pastedFile && !isCellsEnabled && (
            <PastedFileControls
              pastedFile={fileHandling.pastedFile}
              onClear={fileHandling.clearPastedFile}
              onSend={fileHandling.sendPastedFile}
            />
          )}
        </div>
      </InputBarContainer>
      {emojiPicker.open ? (
        <EmojiPicker
          posX={emojiPicker.position.x}
          posY={emojiPicker.position.y}
          onKeyPress={emojiPicker.handleClose}
          resetActionMenuStates={emojiPicker.handleClose}
          wrapperRef={emojiPicker.ref}
          handleReactionClick={emojiPicker.handlePick}
        />
      ) : null}
    </div>
  );
};
