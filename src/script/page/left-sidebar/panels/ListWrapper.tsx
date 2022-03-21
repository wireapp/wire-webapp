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

import React, {useEffect} from 'react';

import {css} from '@emotion/core';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {throttle} from 'underscore';
import {isScrollable, isScrolledBottom, isScrolledTop} from 'Util/scroll-helpers';
import {ListState, ListViewModel} from '../../../view_model/ListViewModel';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import useEffectRef from 'Util/useEffectRef';
import {useFadingScrollbar} from '../../../ui/fadingScrollbar';

type LeftListWrapperProps = {
  header: string;
  id: string;
  listViewModel: ListViewModel;
  onClose: () => void;
  openState: ListState;
};

const scrollStyle = css`
  position: relative;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: scroll;
`;

const style = css`
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const ListWrapper: React.FC<LeftListWrapperProps> = ({listViewModel, openState, id, header, onClose, children}) => {
  const {state: listState} = useKoSubscribableChildren(listViewModel, ['state']);
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

  const isVisible = listState === openState;

  return (
    <div id={id} className={`left-list-${id}`} css={style} aria-hidden={isVisible ? 'false' : 'true'}>
      <div className="left-list-header">
        <span className="left-list-header-text">{header}</span>
        <button
          type="button"
          className="left-list-header-close-button button-icon-large"
          onClick={onClose}
          title={t('tooltipSearchClose')}
          data-uie-name={`do-close-${id}`}
        >
          <Icon.Close />
        </button>
      </div>
      <div css={scrollStyle} ref={setScrollbarRef}>
        {children}
      </div>
    </div>
  );
};

export default ListWrapper;
