/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {KEY} from 'Util/KeyboardUtil';

import {navigate} from './Router';

import {useAppMainState, ViewType} from '../page/state';

export const createNavigate =
  (link: string): React.MouseEventHandler =>
  (event: React.MouseEvent<Element, MouseEvent>) => {
    setResponsiveView();
    navigate(link);
    event.preventDefault();
  };

export const createNavigateKeyboard =
  (link: string, setIsResponsive = false): React.KeyboardEventHandler =>
  (event: React.KeyboardEvent<Element>) => {
    if (setIsResponsive) {
      setResponsiveView();
    }
    if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
      navigate(link, {eventKey: event.key});
      event.preventDefault();
    }
  };

export const setResponsiveView = () => {
  const {responsiveView} = useAppMainState.getState();
  responsiveView.setCurrentView(ViewType.CENTRAL_COLUMN);
};
