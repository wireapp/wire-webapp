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

import {useState, RefObject, FC, useRef} from 'react';

import {EmojiPicker} from 'Components/EmojiPicker/EmojiPicker';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {EmojiChar} from './EmojiChar';
import {reactionImgSize} from './EmojiChar.styles';

import {MessageActionsId} from '../MessageActions';
import {useMessageActionsState} from '../MessageActions.state';
import {messageActionsMenuButton, getActionsMenuCSS, getIconCSS} from '../MessageActions.styles';

const thumbsUpEmoji = '👍';
const likeEmoji = '❤️';
const INITIAL_CLIENT_X_POS = 0;
const INITIAL_CLIENT_Y_POS = 0;
export interface MessageReactionsProps {
  messageFocusedTabIndex: number;
  currentMsgActionName: string;
  toggleActiveMenu: (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  handleCurrentMsgAction: (actionName: string) => void;
  resetActionMenuStates: () => void;
  wrapperRef: RefObject<HTMLDivElement>;
  handleReactionClick: (emoji: string) => void;
}

const MessageReactions: FC<MessageReactionsProps> = ({
  messageFocusedTabIndex,
  currentMsgActionName,
  handleCurrentMsgAction,
  toggleActiveMenu,
  handleKeyDown,
  resetActionMenuStates,
  wrapperRef,
  handleReactionClick,
}) => {
  const isThumbUpAction = currentMsgActionName === MessageActionsId.THUMBSUP;
  const isLikeAction = currentMsgActionName === MessageActionsId.HEART;
  const [showEmojis, setShowEmojis] = useState(false);
  const {handleMenuOpen} = useMessageActionsState();
  const [clientX, setPOSX] = useState(INITIAL_CLIENT_X_POS);
  const [clientY, setPOSY] = useState(INITIAL_CLIENT_Y_POS);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const handleEmojiSelectionWithKeyboard = () => {
    if (showEmojis) {
      handleMenuOpen(false);
      setShowEmojis(false);
    }
    if (emojiButtonRef.current) {
      emojiButtonRef.current.focus();
    }
  };

  const handleOutsideClick = () => {
    resetActionMenuStates();
    setShowEmojis(false);
  };

  const handleReactionCurrentState = (actionName = '') => {
    const isActive = !!actionName;
    handleCurrentMsgAction(actionName);
    handleMenuOpen(isActive);
    setShowEmojis(isActive);
  };

  const handleEmojiBtnClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const selectedMsgActionName = event.currentTarget.dataset.uieName;
    if (currentMsgActionName === selectedMsgActionName) {
      // reset on double click
      handleReactionCurrentState('');
    } else if (selectedMsgActionName) {
      handleReactionCurrentState(selectedMsgActionName);
      showReactions(event.currentTarget.getBoundingClientRect());
    }
  };

  const handleEmojiKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const selectedMsgActionName = event.currentTarget.dataset.uieName;
    handleKeyDown(event);
    if (isSpaceOrEnterKey(event.key)) {
      if (currentMsgActionName === selectedMsgActionName) {
        // reset on double click
        handleReactionCurrentState('');
      } else if (selectedMsgActionName) {
        handleReactionCurrentState(selectedMsgActionName);
        showReactions(event.currentTarget.getBoundingClientRect());
      }
    }
  };

  const showReactions = (rect: DOMRect) => {
    setPOSX(rect.x);
    setPOSY(rect.y);
  };

  const handleMsgActionClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const actionType = event.currentTarget.dataset.uieName;
    switch (actionType) {
      case MessageActionsId.EMOJI:
        handleEmojiBtnClick(event);
        break;
      case MessageActionsId.THUMBSUP:
        toggleActiveMenu(event);
        handleReactionClick(thumbsUpEmoji);
        break;
      case MessageActionsId.HEART:
        toggleActiveMenu(event);
        handleReactionClick(likeEmoji);
        break;
    }
  };

  const handleMsgActionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const actionType = event.currentTarget.dataset.uieName;
    switch (actionType) {
      case MessageActionsId.EMOJI:
        handleEmojiKeyDown(event);
        break;
      case MessageActionsId.THUMBSUP:
        handleKeyDown(event);
        break;
      case MessageActionsId.HEART:
        handleKeyDown(event);
        break;
    }
  };

  const emojiSize = 15;
  return (
    <>
      <button
        css={{
          ...messageActionsMenuButton(),
          ...getIconCSS,
          ...getActionsMenuCSS(isThumbUpAction),
        }}
        aria-label={t('accessibility.messageActionsMenuThumbsUp')}
        data-uie-name={MessageActionsId.THUMBSUP}
        aria-pressed={isThumbUpAction}
        type="button"
        tabIndex={messageFocusedTabIndex}
        onClick={handleMsgActionClick}
        onKeyDown={handleMsgActionKeyDown}
      >
        <EmojiChar emoji={thumbsUpEmoji} size={emojiSize} />
      </button>
      <button
        css={{
          ...messageActionsMenuButton(),
          ...getIconCSS,
          ...getActionsMenuCSS(isLikeAction),
        }}
        aria-label={t('accessibility.messageActionsMenuLike')}
        data-uie-name={MessageActionsId.HEART}
        aria-pressed={isLikeAction}
        type="button"
        tabIndex={messageFocusedTabIndex}
        onClick={handleMsgActionClick}
        onKeyDown={handleMsgActionKeyDown}
      >
        <EmojiChar emoji={likeEmoji} size={emojiSize} />
      </button>
      <button
        css={{
          ...messageActionsMenuButton(),
          ...getIconCSS,
          ...getActionsMenuCSS(currentMsgActionName === MessageActionsId.EMOJI),
        }}
        aria-label={t('accessibility.messageActionsMenuEmoji')}
        data-uie-name={MessageActionsId.EMOJI}
        type="button"
        tabIndex={messageFocusedTabIndex}
        onClick={handleMsgActionClick}
        onKeyDown={handleMsgActionKeyDown}
        ref={emojiButtonRef}
      >
        <svg css={reactionImgSize} viewBox="0 0 23 23" fill="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M19.4908 9.20192C19.7806 10.0821 19.9375 11.0227 19.9375 12C19.9375 16.936 15.936 20.9375 11 20.9375C6.06396 20.9375 2.0625 16.936 2.0625 12C2.0625 7.06396 6.06396 3.0625 11 3.0625C11.9773 3.0625 12.9179 3.21935 13.7981 3.50925C13.8958 2.80497 14.1389 2.1472 14.4963 1.56728C13.3979 1.19934 12.2222 1 11 1C4.92487 1 0 5.92487 0 12C0 18.0751 4.92487 23 11 23C17.0751 23 22 18.0751 22 12C22 10.7778 21.8007 9.6021 21.4327 8.50372C20.8528 8.86105 20.195 9.10423 19.4908 9.20192ZM11 18.875C7.67393 18.875 4.89952 16.5131 4.26253 13.375H17.7375C17.1005 16.5131 14.3261 18.875 11 18.875ZM15.7764 14.75C12.0833 14.75 6.24584 14.7695 6.24584 14.7695C6.5442 15.2807 6.92214 15.7378 7.36161 16.125H14.6384C15.4473 15.4123 15.7764 14.75 15.7764 14.75ZM13.75 10.625C14.5094 10.625 15.125 10.0094 15.125 9.25C15.125 8.49061 14.5094 7.875 13.75 7.875C12.9906 7.875 12.375 8.49061 12.375 9.25C12.375 10.0094 12.9906 10.625 13.75 10.625ZM9.625 9.25C9.625 10.0094 9.00939 10.625 8.25 10.625C7.49061 10.625 6.875 10.0094 6.875 9.25C6.875 8.49061 7.49061 7.875 8.25 7.875C9.00939 7.875 9.625 8.49061 9.625 9.25Z"
            fill="#34373D"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M15.5835 3.64687V4.40312H18.2304V7.05H18.9866V4.40312H21.6335V3.64687H18.9866V1H18.2304V3.64687H15.5835Z"
            fill="#34373D"
            stroke="#34373D"
            strokeWidth="1.25"
          />
        </svg>
      </button>
      {showEmojis ? (
        <EmojiPicker
          posX={clientX}
          posY={clientY}
          onKeyPress={handleEmojiSelectionWithKeyboard}
          resetActionMenuStates={handleOutsideClick}
          wrapperRef={wrapperRef}
          handleReactionClick={handleReactionClick}
        />
      ) : null}
    </>
  );
};

export {MessageReactions};
