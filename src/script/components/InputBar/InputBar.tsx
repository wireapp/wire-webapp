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

import {useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {LexicalEditor, $createTextNode, $insertNodes} from 'lexical';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ConversationClassifiedBar} from 'Components/ClassifiedBar/ClassifiedBar';
import {checkFileSharingPermission} from 'Components/Conversation/utils/checkFileSharingPermission';
import {EmojiPicker} from 'Components/EmojiPicker/EmojiPicker';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {useUserPropertyValue} from 'src/script/hooks/useUserProperty';
import {PROPERTIES_TYPE} from 'src/script/properties/PropertiesType';
import {EventName} from 'src/script/tracking/EventName';
import {CONVERSATION_TYPING_INDICATOR_MODE} from 'src/script/user/TypingIndicatorMode';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {MessageContent} from './common/messageContent/messageContent';
import {InputBarAvatar} from './InputBarAvatar/InputBarAvatar';
import {InputBarControls} from './InputBarControls/InputBarControls';
import {InputBarEditor} from './InputBarEditor/InputBarEditor';
import {PastedFileControls} from './PastedFileControls/PastedFileControls';
import {ReplyBar} from './ReplyBar/ReplyBar';
import {TypingIndicator} from './TypingIndicator';
import {useDraftState} from './useDraftState/useDraftState';
import {useEmojiPicker} from './useEmojiPicker/useEmojiPicker';
import {useFileHandling} from './useFileHandling/useFileHandling';
import {useFilePaste} from './useFilePaste/useFilePaste';
import {useFormatToolbar} from './useFormatToolbar/useFormatToolbar';
import {useGiphy} from './useGiphy/useGiphy';
import {useMessageHandling} from './useMessageHandling/useMessageHandling';
import {usePing} from './usePing/usePing';
import {useTypingIndicator} from './useTypingIndicator/useTypingIndicator';

import {Config} from '../../Config';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {MessageRepository} from '../../conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {User} from '../../entity/User';
import {EventRepository} from '../../event/EventRepository';
import {useAppMainState} from '../../page/state';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {SearchRepository} from '../../search/SearchRepository';
import {StorageRepository} from '../../storage';
import {TeamState} from '../../team/TeamState';

const CONFIG = {
  ...Config.getConfig(),
  PING_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
  GIPHY_TEXT_LENGTH: 256,
};

interface InputBarProps {
  readonly conversation: Conversation;
  readonly conversationRepository: ConversationRepository;
  readonly eventRepository: EventRepository;
  readonly messageRepository: MessageRepository;
  readonly openGiphy: (inputValue: string) => void;
  readonly propertiesRepository: PropertiesRepository;
  readonly searchRepository: SearchRepository;
  readonly storageRepository: StorageRepository;
  readonly teamState: TeamState;
  readonly selfUser: User;
  onShiftTab: () => void;
  uploadDroppedFiles: (droppedFiles: File[]) => void;
  uploadImages: (images: File[]) => void;
  uploadFiles: (files: File[]) => void;
}

export const InputBar = ({
  conversation,
  conversationRepository,
  eventRepository,
  messageRepository,
  openGiphy,
  propertiesRepository,
  searchRepository,
  storageRepository,
  selfUser,
  teamState,
  onShiftTab,
  uploadDroppedFiles,
  uploadImages,
  uploadFiles,
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
    ]);
  const {isOutgoingRequest, isIncomingRequest} = useKoSubscribableChildren(connection!, [
    'isOutgoingRequest',
    'isIncomingRequest',
  ]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<LexicalEditor | null>(null);
  const [messageContent, setMessageContent] = useState<MessageContent>({text: ''});

  const {rightSidebar} = useAppMainState.getState();
  const lastItem = rightSidebar.history.length - 1;
  const currentState = rightSidebar.history[lastItem];
  const isRightSidebarOpen = !!currentState;

  const inputPlaceholder = messageTimer ? t('tooltipConversationEphemeral') : t('tooltipConversationInputPlaceholder');

  const isConnectionRequest = isOutgoingRequest || isIncomingRequest;
  const hasLocalEphemeralTimer = isSelfDeletingMessagesEnabled && !!localMessageTimer && !hasGlobalMessageTimer;
  const isTypingRef = useRef(false);

  const isMessageFormatButtonsFlagEnabled = CONFIG.FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;

  const shouldReplaceEmoji = useUserPropertyValue<boolean>(
    () => propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE),
    WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE,
  );

  const {typingIndicatorMode} = useKoSubscribableChildren(propertiesRepository, ['typingIndicatorMode']);
  const isTypingIndicatorEnabled = typingIndicatorMode === CONVERSATION_TYPING_INDICATOR_MODE.ON;

  const formatToolbar = useFormatToolbar();

  const draftState = useDraftState({
    conversation,
    storageRepository,
    messageRepository,
    editorRef,
  });

  const {
    editedMessage,
    replyMessageEntity,
    isEditing,
    isReplying,
    handleSendMessage,
    cancelMessageEditing,
    cancelMessageReply,
    editMessage,
  } = useMessageHandling({
    conversation,
    conversationRepository,
    eventRepository,
    messageRepository,
    editorRef,
    onResetDraftState: draftState.resetDraftState,
    onSaveDraft: (replyId?: string) =>
      draftState.saveDraftState(
        JSON.stringify(editorRef.current?.getEditorState().toJSON()),
        messageContent.text,
        replyId,
      ),
  });

  const fileHandling = useFileHandling({
    uploadDroppedFiles,
  });

  const emojiPicker = useEmojiPicker({
    wrapperRef,
    onEmojiPicked: emoji => {
      editorRef.current?.update(() => {
        $insertNodes([$createTextNode(emoji)]);
      });
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.INPUT.EMOJI_MODAL.EMOJI_PICKED);
    },
  });

  const ping = usePing({
    conversation,
    messageRepository,
    is1to1,
    maxUsersWithoutAlert: CONFIG.FEATURE.MAX_USERS_TO_PING_WITHOUT_ALERT,
    enablePingConfirmation: CONFIG.FEATURE.ENABLE_PING_CONFIRMATION,
  });

  const giphy = useGiphy({
    text: messageContent.text,
    maxLength: CONFIG.GIPHY_TEXT_LENGTH,
    isMessageFormatButtonsFlagEnabled,
    openGiphy,
  });

  useTypingIndicator({
    isEnabled: isTypingIndicatorEnabled,
    text: messageContent.text,
    onTypingChange: isTyping => {
      isTypingRef.current = isTyping;
      if (isTyping) {
        void conversationRepository.sendTypingStart(conversation);
      } else {
        void conversationRepository.sendTypingStop(conversation);
      }
    },
  });

  useFilePaste(checkFileSharingPermission(fileHandling.handlePasteFiles));

  const getMentionCandidates = (search?: string | null) => {
    const candidates = conversation.participating_user_ets().filter(userEntity => !userEntity.isService);
    return typeof search === 'string' ? searchRepository.searchUserInSet(search, candidates) : candidates;
  };

  const showMarkdownPreview = useUserPropertyValue<boolean>(
    () => propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.MARKDOWN_PREVIEW),
    WebAppEvents.PROPERTIES.UPDATE.INTERFACE.MARKDOWN_PREVIEW,
  );

  const handleSend = () => {
    if (fileHandling.pastedFile) {
      fileHandling.sendPastedFile();
    } else {
      const messageTrimmedStart = messageContent.text.trimStart();
      const text = messageTrimmedStart.trimEnd();
      const isMessageTextTooLong = text.length > CONFIG.MAXIMUM_MESSAGE_LENGTH;

      if (isMessageTextTooLong) {
        showWarningModal(
          t('modalConversationMessageTooLongHeadline'),
          t('modalConversationMessageTooLongMessage', {number: CONFIG.MAXIMUM_MESSAGE_LENGTH}),
        );
        return;
      }

      void handleSendMessage(text, messageContent.mentions ?? []);
    }
  };

  const conversationInputBarClassName = 'conversation-input-bar';
  const showAvatar = !!messageContent.text.length;

  return (
    <div ref={emojiPicker.ref}>
      <div
        id={conversationInputBarClassName}
        className={cx(conversationInputBarClassName, {'is-right-panel-open': isRightSidebarOpen})}
        aria-live="assertive"
      >
        {isTypingIndicatorEnabled && <TypingIndicator conversationId={conversation.id} />}

        {classifiedDomains && !isConnectionRequest && (
          <ConversationClassifiedBar conversation={conversation} classifiedDomains={classifiedDomains} />
        )}

        {isReplying && !isEditing && replyMessageEntity && (
          <ReplyBar replyMessageEntity={replyMessageEntity} onCancel={() => cancelMessageReply(false)} />
        )}

        <div className="input-bar-container">
          {showAvatar && <InputBarAvatar selfUser={selfUser} />}

          {!isSelfUserRemoved && !fileHandling.pastedFile && (
            <InputBarEditor
              editorRef={editorRef}
              inputPlaceholder={inputPlaceholder}
              hasLocalEphemeralTimer={hasLocalEphemeralTimer}
              showMarkdownPreview={showMarkdownPreview}
              formatToolbar={formatToolbar}
              onSetup={editor => {
                editorRef.current = editor;
              }}
              onEscape={() => {
                if (editedMessage) {
                  cancelMessageEditing(true);
                } else if (replyMessageEntity) {
                  cancelMessageReply();
                }
              }}
              onArrowUp={() => {
                if (messageContent.text.length === 0) {
                  editMessage(conversation.getLastEditableMessage());
                }
              }}
              onShiftTab={onShiftTab}
              onBlur={() => isTypingRef.current && conversationRepository.sendTypingStop(conversation)}
              onUpdate={setMessageContent}
              onSend={handleSend}
              getMentionCandidates={getMentionCandidates}
              saveDraftState={draftState.saveDraftState}
              loadDraftState={draftState.loadDraftState}
              replaceEmojis={shouldReplaceEmoji}
            >
              <InputBarControls
                conversation={conversation}
                isFileSharingSendingEnabled={isFileSharingSendingEnabled}
                pingDisabled={ping.isPingDisabled}
                messageContent={messageContent}
                isEditing={isEditing}
                isMessageFormatButtonsFlagEnabled={isMessageFormatButtonsFlagEnabled}
                showMarkdownPreview={showMarkdownPreview}
                showGiphyButton={giphy.showGiphyButton}
                formatToolbar={formatToolbar}
                emojiPicker={emojiPicker}
                onEscape={() => {
                  if (editedMessage) {
                    cancelMessageEditing(true);
                  } else if (replyMessageEntity) {
                    cancelMessageReply();
                  }
                }}
                onClickPing={ping.handlePing}
                onGifClick={giphy.handleGifClick}
                onSelectFiles={uploadFiles}
                onSelectImages={uploadImages}
                onSend={handleSend}
              />
            </InputBarEditor>
          )}

          {fileHandling.pastedFile && (
            <PastedFileControls
              pastedFile={fileHandling.pastedFile}
              onClear={fileHandling.clearPastedFile}
              onSend={fileHandling.sendPastedFile}
            />
          )}
        </div>
      </div>
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
