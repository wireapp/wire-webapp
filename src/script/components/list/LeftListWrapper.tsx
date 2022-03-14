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

import React from 'react';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ListState, ListViewModel} from '../../view_model/ListViewModel';
import {Transition} from 'react-transition-group';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import useEffectRef from 'Util/useEffectRef';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';

type LeftListWrapperProps = {
  header: string;
  id: string;
  listViewModel: ListViewModel;
  onClose: () => void;
  openState: ListState;
};

const LeftListWrapper: React.FC<LeftListWrapperProps> = ({listViewModel, openState, id, header, onClose, children}) => {
  const {state: listState} = useKoSubscribableChildren(listViewModel, ['state']);
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const isVisible = listState === openState;

  return (
    <Transition in={isVisible} timeout={300}>
      <div
        id={id}
        className={`left-list left-list-${id} ${isVisible && 'left-list-is-visible'}`}
        aria-hidden={isVisible ? 'false' : 'true'}
      >
        <div className="left-list-header">
          <span className="left-list-header-text">{header}</span>
          <button
            type="button"
            className="left-list-header-close-button button-icon-large"
            onClick={onClose}
            title={t('tooltipSearchClose')}
            data-uie-name="do-close-preferences"
          >
            <Icon.Close />
          </button>
        </div>
        <div className="left-list-center" ref={setScrollbarRef}>
          {children}
        </div>
      </div>
    </Transition>
  );
};

export default LeftListWrapper;
