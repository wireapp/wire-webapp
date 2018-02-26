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
window.z.viewModel = z.viewModel || {};

z.viewModel.MainViewModel = class MainViewModel {
  constructor(repositories) {
    this.closePanel = this.closePanel.bind(this);
    this.openPanel = this.openPanel.bind(this);
    this.togglePanel = this.togglePanel.bind(this);

    this.elementId = 'wire-main';
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.MainViewModel', z.config.LOGGER.OPTIONS);

    this.selfUser = this.userRepository.self;

    this.isPanelOpen = ko.observable(false);

    this.content = new z.viewModel.ContentViewModel(this, repositories);
    this.list = new z.viewModel.ListViewModel(this, repositories);
    this.panel = new z.viewModel.PanelViewModel(this, repositories);

    this.modals = new z.viewModel.ModalsViewModel();
    this.lightbox = new z.viewModel.ImageDetailViewViewModel(this, repositories);
    this.loading = new z.viewModel.LoadingViewModel(this, repositories);
    this.shortcuts = new z.viewModel.ShortcutsViewModel(this, repositories);
    this.title = new z.viewModel.WindowTitleViewModel(this, repositories);
    this.videoCalling = new z.viewModel.VideoCallingViewModel(this, repositories);
    this.warnings = new z.viewModel.WarningsViewModel();

    this.mainClasses = ko.pureComputed(() => {
      if (this.selfUser()) {
        // deprecated - still used on input control hover
        return `main-accent-color-${this.selfUser().accent_id()} ${this.selfUser().accent_theme()} show`;
      }
    });

    ko.applyBindings(this, document.getElementById(this.elementId));
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
    // messageList.style.transformOrigin = 'left';

    const isNarrowScreen = app.offsetWidth < breakPoint;

    const centerWidthClose = app.offsetWidth - panelSize;
    const centerWidthOpen = centerWidthClose - panelSize;

    return new Promise(resolve => {
      panel.addEventListener('transitionend', () => {
        clearStyles(panel, ['width', 'transform', 'position', 'right', 'transition']);
        clearStyles(titleBar, ['width', 'transition']);
        clearStyles(input, ['width', 'transition']);
        // clearStyles(messageList, ['width', 'transform', 'transition']);
        const close = document.querySelector('.right-panel-close');
        const overlay = document.querySelector('.center-column__overlay');
        if (isPanelOpen) {
          app.classList.remove('app--panel-open');
          this.isPanelOpen(false);
          close.removeEventListener('click', this.togglePanel);
          overlay.removeEventListener('click', this.togglePanel);
        } else {
          app.classList.add('app--panel-open');
          this.isPanelOpen(true);
          close.addEventListener('click', this.togglePanel);
          overlay.addEventListener('click', this.togglePanel);
        }
        window.dispatchEvent(new Event('resize'));
        resolve();
      });

      if (isPanelOpen) {
        applyStyle(panel, panelOpenStyle(panelSize));
        if (!isNarrowScreen) {
          applyStyle(titleBar, {width: `${centerWidthOpen}px`});
          applyStyle(input, {width: `${centerWidthOpen}px`});
          // applyStyle(messageList, {
          //   width: `${centerWidthClose}px`,
          //   transform: `scale(${centerWidthOpen / centerWidthClose}, 1)`,
          // });
        }
      } else {
        applyStyle(panel, panelCloseStyle(panelSize));
        if (!isNarrowScreen) {
          applyStyle(titleBar, {width: `${centerWidthClose}px`});
          applyStyle(input, {width: `${centerWidthClose}px`});
          // applyStyle(messageList, {
          //   width: `${centerWidthOpen}px`,
          //   transform: `scale(${centerWidthClose / centerWidthOpen}, 1)`,
          // });
        }
      }

      // https://developer.mozilla.org/en-US/Firefox/Performance_best_practices_for_Firefox_fe_engineers
      requestAnimationFrame(() =>
        setTimeout(() => {
          panel.style.transition = 'transform .35s cubic-bezier(0.19, 1, 0.22, 1)';
          titleBar.style.transition = input.style.transition = 'width .35s cubic-bezier(0.19, 1, 0.22, 1)';

          if (isPanelOpen) {
            applyStyle(panel, panelCloseStyle(panelSize));
            if (!isNarrowScreen) {
              applyStyle(titleBar, {width: `${centerWidthClose}px`});
              applyStyle(input, {width: `${centerWidthClose}px`});
              // applyStyle(messageList, {transform: `scale(1, 1)`});
            }
          } else {
            applyStyle(panel, panelOpenStyle(panelSize));
            if (!isNarrowScreen) {
              applyStyle(titleBar, {width: `${centerWidthOpen}px`});
              applyStyle(input, {width: `${centerWidthOpen}px`});
              // applyStyle(messageList, {transform: `scale(1, 1)`});
            }
          }
        }, 0)
      );
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
