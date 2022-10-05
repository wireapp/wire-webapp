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
import {createRoot, Root} from 'react-dom/client';

const roots: Record<
  string,
  {
    elementContainer: HTMLDivElement | undefined;
    reactRoot: Root;
  }
> = {};

export const cleanUpElement = (elementId: string) => {
  const root = roots[elementId];
  if (root && root.elementContainer) {
    root.reactRoot.unmount();
    document.getElementById(elementId)?.removeChild(root.elementContainer);
    root.elementContainer = undefined;
    delete roots[elementId];
  }
};

const generateStyleString = (style: Partial<CSSStyleDeclaration>) => {
  let styleString = '';

  Object.entries(style).forEach(([key, value]) => {
    styleString = styleString ? `${styleString} ${key}: ${value};` : `${key}: ${value};`;
  });

  return styleString;
};

interface RenderElement {
  onClose?: () => void;
}

const renderElement =
  <T extends RenderElement>(
    Component: React.FC<T>,
    parentElementId = 'wire-main',
    style?: Partial<CSSStyleDeclaration>,
  ) =>
  (props: T) => {
    const currentElementId = parentElementId;

    cleanUpElement(currentElementId);
    const elementContainer = document.createElement('div');

    if (style) {
      elementContainer.setAttribute('style', generateStyleString(style));
    }

    document.getElementById(currentElementId)?.appendChild(elementContainer);
    const reactRoot = createRoot(elementContainer);

    roots[currentElementId] = {
      elementContainer,
      reactRoot,
    };

    const onClose = () => {
      cleanUpElement(currentElementId);
      props.onClose?.();
    };

    const element = React.createElement(Component, {...props, onClose});
    reactRoot.render(element);
  };

export default renderElement;
