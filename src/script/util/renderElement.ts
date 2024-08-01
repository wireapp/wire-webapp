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

import {getLogger} from './Logger';

const logger = getLogger('renderElement');

const roots = new Map<
  string,
  {
    elementContainer: HTMLDivElement | undefined;
    reactRoot: Root;
  }
>();

const cleanUpElement = (elementId: string) => {
  const root = roots.get(elementId);
  if (root && root.elementContainer) {
    root.reactRoot.unmount();
    document.getElementById(elementId)?.removeChild(root.elementContainer);
    root.elementContainer = undefined;
    roots.delete(elementId);
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
    cleanUpElement(parentElementId);

    const parentElement = document.getElementById(parentElementId);

    if (!parentElement) {
      logger.warn(`Unable to find element with id: ${parentElementId}`);

      return;
    }

    const elementContainer = document.createElement('div');

    if (style) {
      elementContainer.setAttribute('style', generateStyleString(style));
    }

    parentElement.appendChild(elementContainer);
    const reactRoot = createRoot(elementContainer);

    roots.set(parentElementId, {
      elementContainer,
      reactRoot,
    });

    const onClose = () => {
      cleanUpElement(parentElementId);
      props.onClose?.();
    };

    const element = React.createElement(Component, {...props, onClose});
    reactRoot.render(element);
  };

/**
 *  Copy styles from one document to another - link, style elements and body element class names.
 * @param source the source document object
 * @param target the target document object
 */
const copyStyles = (source: Document, target: Document) => {
  const targetHead = target.head;

  const elements = source.head.querySelectorAll('link, style');

  elements.forEach(htmlElement => {
    targetHead.insertBefore(htmlElement.cloneNode(true), targetHead.firstChild);
  });

  target.body.className = source.body.className;
  target.body.style.height = '100%';
};

export {renderElement, copyStyles};
