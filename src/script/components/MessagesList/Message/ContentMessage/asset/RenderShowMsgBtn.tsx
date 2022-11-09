/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import cx from 'classnames';

import {Icon} from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface ShowMsgBtnProps {
  showFullText: boolean;
  isCurrentConversationFocused: boolean;
  setShowFullText: (showMore: boolean) => void;
}

export const RenderShowMsgBtn: React.FC<ShowMsgBtnProps> = ({
  showFullText,
  isCurrentConversationFocused,
  setShowFullText,
}) => {
  return (
    <>
      <button
        type="button"
        className="button-reset-default message-quote__text__show-more"
        onClick={() => setShowFullText(!showFullText)}
        data-uie-name="do-show-more-quote"
        tabIndex={isCurrentConversationFocused ? 0 : -1}
      >
        <span>{showFullText ? t('replyQuoteShowLess') : t('replyQuoteShowMore')}</span>
        <Icon.Disclose
          className={cx('disclose-icon', {
            'upside-down': showFullText,
          })}
        />
      </button>
    </>
  );
};
