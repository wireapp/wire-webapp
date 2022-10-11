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

import React, {ReactElement} from 'react';

import {css} from '@emotion/react';
import {throttle} from 'underscore';

import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import {isScrollable, isScrolledBottom, isScrolledTop} from 'Util/scroll-helpers';

import {initFadingScrollbar} from '../../../ui/fadingScrollbar';

type LeftListWrapperProps = {
  /** A react element that will be inserted after the header but before the list */
  before?: ReactElement;
  children: React.ReactNode;
  footer?: ReactElement;
  header?: string;
  headerElement?: ReactElement;
  headerUieName?: string;
  id: string;
  onClose?: () => void;
};

const scrollStyle = css`
  position: relative;
  flex: 1 1 auto;
  min-height: 150px;
  overflow-x: hidden;
  overflow-y: auto;
`;

const style = css`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: overlay;
`;

const ListWrapper: React.FC<LeftListWrapperProps> = ({
  id,
  header,
  headerElement,
  onClose,
  children,
  footer,
  before,
  headerUieName,
}) => {
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
    calculateBorders(element);
    element.addEventListener('scroll', () => calculateBorders(element));
  }

  return (
    <div id={id} className={`left-list-${id} ${id}`} css={style}>
      <section className={`left-list-header left-list-header-${id}`}>
        {headerElement ? (
          headerElement
        ) : (
          <>
            <span className="left-list-header-text" data-uie-name={headerUieName}>
              {header}
            </span>
            <button
              type="button"
              className="left-list-header-close-button button-icon-large"
              onClick={onClose}
              title={t('tooltipSearchClose')}
              data-uie-name={`do-close-${id}`}
            >
              <Icon.Close />
            </button>
          </>
        )}
      </section>
      {before ?? null}
      <div
        role="list"
        aria-label={t('accessibility.conversation.sectionLabel')}
        css={scrollStyle}
        ref={element => {
          initBorderedScroll(element);
          initFadingScrollbar(element);
        }}
      >
        {children}
      </div>
      {footer ?? null}
    </div>
  );
};

export default ListWrapper;
