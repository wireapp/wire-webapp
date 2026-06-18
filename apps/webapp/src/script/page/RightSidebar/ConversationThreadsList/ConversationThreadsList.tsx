/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {FC, useCallback, useMemo} from 'react';

import {Avatar} from 'Components/Avatar';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/icon';
import {openConversationThreadById} from 'Components/MessagesList/threading/openConversationThreadById';
import {
  buildConversationThreadRowViewModel,
  getThreadsForConversation,
  ThreadAuthorLabelData,
  useThreadIndexStore,
} from 'Components/MessagesList/threading/threadIndexStore';
import {ThreadsOutlineIcon} from 'Components/ThreadIcons';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {generateConversationThreadUrl} from 'src/script/router/routeGenerator';
import {setHistoryParam} from 'src/script/router/Router';
import {useAppMainState} from 'src/script/page/state';
import {formatTimeShort} from 'src/script/util/TimeUtil';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {t} from 'Util/localizerUtil';

import {
  authorLabel,
  avatarCell,
  avatarPlaceholder,
  closeButton,
  emptyState,
  headerSubtitle,
  headerTextBlock,
  headerTitle,
  lastReply,
  lastReplyAvatar,
  list,
  listItem,
  MAIN_AVATAR_SIZE,
  meta,
  metaSeparator,
  META_AVATAR_SIZE,
  nameRow,
  nameRowHeader,
  openButton,
  panelHeader,
  panelPage,
  preview,
  replyCount,
  rowContent,
  timestamp,
  titleIcon,
  unreadBadge,
} from './ConversationThreadsList.styles';

type ConversationThreadsListProps = {
  activeConversation: Conversation;
  messageRepository: MessageRepository;
  onClose: () => void;
  usersById?: Record<string, User>;
};

const getAuthorLabelsById = (usersById: Record<string, User> = {}): Record<string, ThreadAuthorLabelData | string> => {
  return Object.entries(usersById).reduce<Record<string, ThreadAuthorLabelData | string>>((accumulator, [id, user]) => {
    accumulator[id] = {
      displayName: user.name(),
      handle: user.handle,
      accentColor: user.accent_color(),
    };
    return accumulator;
  }, {});
};

export const ConversationThreadsList: FC<ConversationThreadsListProps> = ({
  activeConversation,
  messageRepository,
  onClose,
  usersById = {},
}) => {
  const threadsByKey = useThreadIndexStore(state => state.threadsByKey);
  const activeThreadRootMessage = useAppMainState(state => state.conversationThread.rootMessage);
  const openConversationThread = useAppMainState(state => state.conversationThread.open);

  const {display_name: conversationDisplayName} = useKoSubscribableChildren(activeConversation, ['display_name']);
  const authorLabelsById = useMemo(() => getAuthorLabelsById(usersById), [usersById]);

  const rows = useMemo(() => {
    const threads = getThreadsForConversation(useThreadIndexStore.getState(), activeConversation.id);
    const activeThreadId = activeThreadRootMessage?.threadId ?? activeThreadRootMessage?.id ?? null;

    return threads.map(thread => buildConversationThreadRowViewModel(thread, authorLabelsById, activeThreadId));
  }, [
    activeConversation.id,
    activeThreadRootMessage?.id,
    activeThreadRootMessage?.threadId,
    authorLabelsById,
    threadsByKey,
  ]);

  const conversationName = conversationDisplayName || activeConversation.display_name();
  const subtitle = `${rows.length} in ${conversationName}`;

  const openThread = useCallback(
    async (threadId: string) => {
      const opened = await openConversationThreadById({
        conversation: activeConversation,
        threadId,
        messageRepository,
        openConversationThread,
      });

      if (opened) {
        setHistoryParam(generateConversationThreadUrl(activeConversation.qualifiedId, threadId));
      }
    },
    [activeConversation, messageRepository, openConversationThread],
  );

  return (
    <div
      className="panel__page conversation-threads-list-panel"
      css={panelPage}
      data-uie-name="conversation-threads-list-panel"
    >
      <header css={panelHeader} className="conversation-threads-list-header">
        <div css={headerTextBlock}>
          <ThreadsOutlineIcon css={titleIcon} />
          <h2 css={headerTitle} data-uie-name="conversation-threads-title">
            Threads
            <p css={headerSubtitle} data-uie-name="conversation-threads-subtitle">
              {subtitle}
            </p>
          </h2>
        </div>
        <button
          type="button"
          css={closeButton}
          className="icon-button"
          data-uie-name="do-close"
          title={t('accessibility.rightPanel.close')}
          aria-label={t('accessibility.rightPanel.close')}
          onClick={onClose}
        >
          <Icon.CloseIcon />
        </button>
      </header>

      <FadingScrollbar className="panel__content panel__content--fill conversation-threads-list__content">
        {rows.length === 0 ? (
          <p css={emptyState}>No threads yet</p>
        ) : (
          <ul css={list} data-uie-name="conversation-threads-list">
            {rows.map(row => (
              <li key={row.thread.threadId} css={listItem(row.isActive)} data-uie-name="conversation-threads-list-item">
                {row.unreadCount > 0 && <span css={unreadBadge}>{row.unreadCount}</span>}
                <button
                  type="button"
                  css={openButton}
                  data-uie-name="conversation-threads-list-open-button"
                  onClick={() => void openThread(row.thread.threadId)}
                >
                  <div css={rowContent}>
                    {row.thread.rootMessageAuthorId && usersById[row.thread.rootMessageAuthorId] ? (
                      <div css={avatarCell}>
                        <Avatar
                          participant={usersById[row.thread.rootMessageAuthorId]}
                          avatarSize={MAIN_AVATAR_SIZE}
                          hideAvailabilityStatus
                          noBadge
                        />
                      </div>
                    ) : (
                      <span css={avatarPlaceholder} aria-hidden />
                    )}
                    <div css={nameRow}>
                      <div css={nameRowHeader}>
                        <span css={authorLabel}>{row.rootAuthorLabel}</span>
                        <time css={timestamp} dateTime={row.rootMessageTimestamp}>
                          {formatTimeShort(row.rootMessageTimestamp)}
                        </time>
                      </div>
                    </div>
                  </div>
                  <span css={preview}>{row.preview}</span>
                  <div css={meta}>
                    {row.thread.lastReplyAuthorId && usersById[row.thread.lastReplyAuthorId] && (
                      <span css={lastReplyAvatar}>
                        <Avatar
                          participant={usersById[row.thread.lastReplyAuthorId]}
                          avatarSize={META_AVATAR_SIZE}
                          hideAvailabilityStatus
                          noBadge
                        />
                      </span>
                    )}
                    <span css={replyCount}>{row.replyCount === 1 ? '1 reply' : `${row.replyCount} replies`}</span>
                    <span css={metaSeparator}>·</span>
                    <span css={lastReply}>Last reply {formatTimeShort(row.lastReplyAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </FadingScrollbar>
    </div>
  );
};
