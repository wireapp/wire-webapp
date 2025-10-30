/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect} from 'react';

import {useLocation} from 'react-router-dom';

export function useRouteA11y() {
  const location = useLocation();

  useEffect(() => {
    const focusTarget =
      document.querySelector('[data-page-title]') ||
      document.querySelector('main,[role="main"]') ||
      document.querySelector('h1');

    if (!focusTarget) {
      return;
    }

    // scroll to top on each route change
    window.scrollTo({top: 0, left: 0});

    const element = focusTarget as HTMLElement;
    element.setAttribute('tabindex', '-1');
    element.classList.add('sr-only-focus');
    element.focus({preventScroll: true});

    // remove tabindex after blur
    const handleBlur = () => {
      element.classList.remove('sr-only-focus');
      element.removeAttribute('tabindex');
      element.removeEventListener('blur', handleBlur);
    };
    element.addEventListener('blur', handleBlur);
  }, [location.key]);
}
