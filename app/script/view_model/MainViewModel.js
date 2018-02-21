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

'use strict';

window.z = window.z || {};
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.MainViewModel = class MainViewModel {
  constructor(element_id, user_repository) {
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.MainViewModel', z.config.LOGGER.OPTIONS);

    this.user = this.user_repository.self;
    this.duration = 100;

    this.main_classes = ko.pureComputed(() => {
      if (this.user()) {
        // deprecated - still used on input control hover
        return `main-accent-color-${this.user().accent_id()} ${this.user().accent_theme()} show`;
      }
    });

    ko.applyBindings(this, document.getElementById(element_id));

    this.isPanelOpen = ko.observable(false);
    this.togglePanel = this.togglePanel.bind(this);
    this.openPanel = this.openPanel.bind(this);
    this.closePanel = this.closePanel.bind(this);
    this.togglePanel = this.togglePanel.bind(this);
  }

  openPanel() {
    return this.togglePanel('open');
  }

  closePanel() {
    return this.togglePanel('close');
  }

  togglePanel(forceState) {
    const panelSize = 304;
    const breakPoint = 1000;

    const app = document.querySelector('#app');
    const panel = document.querySelector('.right-column');

    const isPanelOpen = app.classList.contains('app--panel-open');
    if ((forceState === 'open' && isPanelOpen) || (forceState === 'close' && !isPanelOpen)) {
      return Promise.resolve();
    }

    const titleBar = document.querySelector('#conversation-titlebar');
    const input = document.querySelector('.conversation-input');
    // const messageList = document.querySelector('#message-list');
    const overlay = document.querySelector('.center-column__overlay');
    // messageList.style.transformOrigin = 'left';

    const isNarrowScreen = app.offsetWidth < breakPoint;

    const centerWidthClose = app.offsetWidth - panelSize;
    const centerWidthOpen = centerWidthClose - panelSize;

    return new Promise(resolve => {
      panel.addEventListener('transitionend', () => {
        clearStyles(panel, ['width', 'transform', 'position', 'right', 'transition']);
        clearStyles(overlay, ['display', 'opacity', 'transition']);
        clearStyles(titleBar, ['width', 'transition']);
        clearStyles(input, ['width', 'transition']);
        // clearStyles(messageList, ['width', 'transform', 'transition']);

        if (isPanelOpen) {
          app.classList.remove('app--panel-open');
          this.isPanelOpen(false);
        } else {
          app.classList.add('app--panel-open');
          this.isPanelOpen(true);
        }
        window.dispatchEvent(new Event('resize'));
        resolve();
      });

      if (isPanelOpen) {
        applyStyle(panel, panelOpenStyle(panelSize));
        if (isNarrowScreen) {
          applyStyle(overlay, {opacity: 1});
        } else {
          applyStyle(titleBar, {width: `${centerWidthOpen}px`});
          applyStyle(input, {width: `${centerWidthOpen}px`});
          // applyStyle(messageList, {
          //   width: `${centerWidthClose}px`,
          //   transform: `scale(${centerWidthOpen / centerWidthClose}, 1)`,
          // });
        }
      } else {
        applyStyle(panel, panelCloseStyle(panelSize));
        if (isNarrowScreen) {
          applyStyle(overlay, {display: 'block', opacity: 0});
        } else {
          applyStyle(titleBar, {width: `${centerWidthClose}px`});
          applyStyle(input, {width: `${centerWidthClose}px`});
          // applyStyle(messageList, {
          //   width: `${centerWidthOpen}px`,
          //   transform: `scale(${centerWidthClose / centerWidthOpen}, 1)`,
          // });
        }
      }

      // this forces one layout repaint, so the new styles are applied and can be transitioned
      panel.offsetHeight; // eslint-disable-line no-unused-expressions
      panel.style.transition = 'transform .35s cubic-bezier(0.19, 1, 0.22, 1)';
      overlay.style.transition = 'opacity .35s cubic-bezier(0.165, 0.84, 0.44, 1)';
      titleBar.style.transition = input.style.transition = 'width .35s cubic-bezier(0.19, 1, 0.22, 1)';

      if (isPanelOpen) {
        applyStyle(panel, panelCloseStyle(panelSize));
        if (isNarrowScreen) {
          applyStyle(overlay, {opacity: 0});
        } else {
          applyStyle(titleBar, {width: `${centerWidthClose}px`});
          applyStyle(input, {width: `${centerWidthClose}px`});
          // applyStyle(messageList, {transform: `scale(1, 1)`});
        }
      } else {
        applyStyle(panel, panelOpenStyle(panelSize));
        if (isNarrowScreen) {
          applyStyle(overlay, {opacity: 1});
        } else {
          applyStyle(titleBar, {width: `${centerWidthOpen}px`});
          applyStyle(input, {width: `${centerWidthOpen}px`});
          // applyStyle(messageList, {transform: `scale(1, 1)`});
        }
      }
    });
  }
};

function applyStyle(el, style) {
  Object.keys(style).forEach(key => (el.style[key] = style[key]));
}

function clearStyles(el, styles) {
  styles.forEach(key => (el.style[key] = ''));
}

const panelOpenStyle = panelSize => ({
  position: 'absolute',
  right: '0',
  transform: `translateX(0px)`,
  width: `${panelSize}px`,
});

const panelCloseStyle = panelSize => ({
  position: 'absolute',
  right: '0',
  transform: `translateX(${panelSize}px)`,
  width: `${panelSize}px`,
});
