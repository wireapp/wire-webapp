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

import ko from 'knockout';
import React from 'react';

import type {Router} from './Router';
import {KEY} from 'Util/KeyboardUtil';

let router: Router;

export function initRouterBindings(routerInstance: Router): void {
  router = routerInstance;
  ko.bindingHandlers.link_to = {
    init(element: Node, valueAccessor): void {
      const navigate = (event: Event) => {
        routerInstance.navigate(valueAccessor());
        event.preventDefault();
      };
      element.addEventListener('click', navigate);

      ko.utils.domNodeDisposal.addDisposeCallback(element, () => element.removeEventListener('click', navigate));
    },
  };
}

export const createNavigate =
  (link: string): React.MouseEventHandler =>
  (event: React.MouseEvent<Element, MouseEvent>) => {
    router?.navigate(link);
    event.preventDefault();
  };

export const createNavigateKeyboard =
  (link: string): React.KeyboardEventHandler =>
  (event: React.KeyboardEvent<Element>) => {
    if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
      router?.navigate(link);
      event.preventDefault();
    }
  };
