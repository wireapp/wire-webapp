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
import {MainViewModel} from '../../../view_model/MainViewModel';

let elementContainer: HTMLDivElement | undefined;
let reactRoot: Root;

const elementId = 'app';

export const forceCloseRightPanel = () => {
  if (elementContainer) {
    reactRoot.unmount();
    document.getElementById(elementId)?.removeChild(elementContainer);
    elementContainer = undefined;
  }
};

const applyStyle = (element: HTMLElement, style: Record<string, string>) => {
  if (element) {
    Object.entries(style).forEach(([key, styleValue]) => (element.style[key as any] = styleValue));
  }
};

const commonPanelStyle = {
  position: 'absolute',
  right: '0',
  width: `${MainViewModel.CONFIG.PANEL.WIDTH}px`,
};

const panelStyle = {
  closed: {
    ...commonPanelStyle,
    transform: `translateX(${MainViewModel.CONFIG.PANEL.WIDTH}px)`,
  },
  open: {
    ...commonPanelStyle,
    transform: 'translateX(0px)',
  },
};

interface RenderElement {
  onClose?: () => void;
}

const toggleRightSidebar =
  <T extends RenderElement>(Component: React.FC<T>) =>
  (props: T) => {
    const rightPanelId = 'right-column';
    const rightPanelClassName = 'right-column';
    const widthTransition = 'width .35s cubic-bezier(0.19, 1, 0.22, 1)';

    const app = document.querySelector<HTMLElement>('#app');
    const titleBar = document.querySelector<HTMLElement>('#conversation-title-bar');
    const input = document.querySelector<HTMLElement>('#conversation-input-bar');
    const rightPanel = document.querySelector<HTMLElement>('#right-column');

    const onClose = () => {
      if (app) {
        const isNarrowScreen = app.offsetWidth < MainViewModel.CONFIG.PANEL.BREAKPOINT;
        const centerWidthClose = app.offsetWidth - MainViewModel.CONFIG.PANEL.WIDTH - 16;

        if (!isNarrowScreen) {
          if (titleBar) {
            titleBar.style.width = `${centerWidthClose}px`;
            titleBar.style.transition = widthTransition;
          }

          if (input) {
            input.style.width = `${centerWidthClose}px`;
            input.style.transition = widthTransition;
          }
        }

        if (elementContainer) {
          elementContainer.style.transform = 'translateX(304px)';
          elementContainer.style.transition = 'transform .35s cubic-bezier(0.19, 1, 0.22, 1)';
        }

        requestAnimationFrame(() => {
          setTimeout(() => {
            if (titleBar) {
              titleBar.style.transition = '';
              titleBar.style.width = '';
            }

            if (input) {
              input.style.transition = '';
              input.style.width = '';
            }

            forceCloseRightPanel();
            props.onClose?.();
          }, 350);
        });
      }
    };

    if (rightPanel) {
      applyStyle(rightPanel, panelStyle.open);
      onClose();

      return;
    }

    if (app) {
      const centerWidthClose = app.offsetWidth - MainViewModel.CONFIG.PANEL.WIDTH;
      const centerWidthOpen = centerWidthClose - MainViewModel.CONFIG.PANEL.WIDTH - 16;
      const isNarrowScreen = app.offsetWidth < MainViewModel.CONFIG.PANEL.BREAKPOINT;

      elementContainer = document.createElement('div');
      elementContainer.setAttribute('id', rightPanelId);
      elementContainer.setAttribute('class', rightPanelClassName);

      elementContainer.style.transition = widthTransition;
      elementContainer.style.position = 'absolute';
      elementContainer.style.right = '0';
      elementContainer.style.width = '304px';

      applyStyle(elementContainer, panelStyle.closed);

      if (!isNarrowScreen) {
        if (titleBar) {
          titleBar.style.width = `${centerWidthOpen}px`;
          titleBar.style.transition = widthTransition;
        }

        if (input) {
          input.style.width = `${centerWidthOpen}px`;
          input.style.transition = widthTransition;
        }
      }

      document.getElementById(elementId)?.appendChild(elementContainer);

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (elementContainer) {
            elementContainer.style.transition = '';
            elementContainer.style.position = '';
            elementContainer.style.transform = '';
            elementContainer.style.right = '';
            elementContainer.style.width = '';
          }

          if (titleBar) {
            titleBar.style.transition = '';
            titleBar.style.width = '';
          }

          if (input) {
            input.style.transition = '';
            input.style.width = '';
          }
        }, 350);
      });

      reactRoot = createRoot(elementContainer);
    }

    const element = React.createElement(Component, {...props, onClose});
    reactRoot.render(element);
  };

export default toggleRightSidebar;
