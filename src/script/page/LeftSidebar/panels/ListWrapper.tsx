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

import React, {ReactElement, useEffect} from 'react';

import {css} from '@emotion/react';
import {throttle} from 'underscore';
import {isScrollable, isScrolledBottom, isScrolledTop} from 'Util/scroll-helpers';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import useEffectRef from 'Util/useEffectRef';
import {useFadingScrollbar} from '../../../ui/fadingScrollbar';

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
  overflow-x: hidden;
  overflow-y: auto;
`;

const style = css`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
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
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

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

  useEffect(() => {
    if (!scrollbarRef) {
      return undefined;
    }
    const onScroll = (event: MouseEvent) => calculateBorders(event.target as HTMLElement);
    calculateBorders(scrollbarRef);
    scrollbarRef.addEventListener('scroll', onScroll);

    return () => scrollbarRef.removeEventListener('scroll', onScroll);
  }, [scrollbarRef]);

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
      <section css={scrollStyle} ref={setScrollbarRef}>
        {children}
      </section>
      {footer ?? null}
    </div>
  );
};

export default ListWrapper;
