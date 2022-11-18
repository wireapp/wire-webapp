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

import {useLayoutEffect, useRef} from 'react';

/**
 * Hooks that takes an init function that will be ran whenever a DOM element changes
 * The initFunction can return a dispose callback for when the element is removed from the DOM
 * @param init The function to run on the DOM element pointed as ref
 * @param dependencies List of dependencies that should re trigger the initFunction
 */
export function useDisposableRef(init: (element: HTMLElement) => () => void, dependencies?: unknown[]) {
  const elementRef = useRef<HTMLElement | null>(null!);

  useLayoutEffect(() => {
    return elementRef.current ? init(elementRef.current) : () => {};
  }, dependencies);

  return (element: HTMLElement | null) => {
    elementRef.current = element;
  };
}
