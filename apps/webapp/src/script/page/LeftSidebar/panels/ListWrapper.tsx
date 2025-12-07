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

import React, {memo, ReactElement, ReactNode} from 'react';

import {css} from '@emotion/react';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import {useConnectionQuality} from 'src/script/hooks/useConnectionQuality';
import {throttle} from 'underscore';
import {t} from 'Util/LocalizerUtil';
import {isScrollable, isScrolledBottom, isScrolledTop} from 'Util/scroll-helpers';

const scrollStyle = css`
  flex: 1 1 auto;
  min-height: 150px;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
`;

const style = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: overlay;
  position: relative;
`;

interface LeftListWrapperProps {
  /** A react element that will be inserted after the header but before the list */
  before?: ReactElement;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: ReactElement;
  header?: string;
  headerElement?: ReactNode;
  headerUieName?: string;
  id: string;
  onClose?: () => void;
  hasHeader?: boolean;
  conversationsFilter?: string;
  conversationListRef?: HTMLElement | null;
  setConversationListRef?: (element: HTMLElement) => void;
}

const ListWrapper = memo(
  ({
    id,
    header,
    sidebar,
    headerElement,
    onClose,
    children,
    hasHeader = true,
    footer,
    before,
    headerUieName,
    conversationListRef,
    setConversationListRef,
  }: LeftListWrapperProps) => {
    const calculateBorders = throttle((element: HTMLElement) => {
      window.requestAnimationFrame(() => {
        if (element.offsetHeight <= 0 || !isScrollable(element)) {
          element.classList.remove('left-list-center-border-bottom', 'conversations-center-border-top');
          return;
        }

        element.classList.toggle('left-list-center-border-top', !isScrolledTop(element));
        element.classList.toggle('left-list-center-border-bottom', !isScrolledBottom(element));
      });
    }, 100);

    function initBorderedScroll(element: HTMLElement | null) {
      if (!element) {
        return;
      }

      if (element !== conversationListRef) {
        setConversationListRef?.(element);
      }

      calculateBorders(element);
      element.addEventListener('scroll', () => calculateBorders(element));
    }

    const {isSlow} = useConnectionQuality();

    return (
      <>
        {sidebar}
        {children !== null ? (
          <div id={id} className={`left-list-${id} ${id}`} css={style}>
            {hasHeader && (
              <header className={`left-list-header left-list-header-${id}`} data-uie-name="conversation-list-header">
                {isSlow && (
                  <p className="slow-connection-indicator">
                    <Icon.NetworkIcon />
                    <span>{t('internetConnectionSlow')}</span>
                  </p>
                )}
                <div className="left-list-header-title-wrapper">
                  {headerElement || (
                    <>
                      <h2 className="left-list-header-text" data-uie-name={headerUieName}>
                        {header}
                      </h2>

                      {onClose && (
                        <button
                          type="button"
                          className="left-list-header-close-button button-icon-large"
                          onClick={onClose}
                          title={t('tooltipSearchClose')}
                          data-uie-name={`do-close-${id}`}
                        >
                          <Icon.CloseIcon />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </header>
            )}

            {before ?? null}

            <FadingScrollbar
              role="list"
              aria-label={t('accessibility.conversation.sectionLabel')}
              css={scrollStyle}
              ref={initBorderedScroll}
            >
              {children}
            </FadingScrollbar>

            {footer ?? null}
          </div>
        ) : null}
      </>
    );
  },
);

ListWrapper.displayName = 'ListWrapper';

export {ListWrapper};
