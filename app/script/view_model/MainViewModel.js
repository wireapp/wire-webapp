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
  static get CONFIG() {
    return {
      PANEL: {
        BREAKPOINT: 1000,
        WIDTH: 304,
      },
    };
  }

  static get PANEL_STATE() {
    return {
      CLOSED: 'MainViewModel.PANEL_STATE.CLOSED',
      OPEN: 'MainViewModel.PANEL_STATE.OPEN',
    };
  }

  static get PANEL_STYLE() {
    return {
      CLOSED: {
        position: 'absolute',
        right: '0',
        transform: `translateX(${MainViewModel.CONFIG.PANEL.WIDTH}px)`,
        width: `${MainViewModel.CONFIG.PANEL.WIDTH}px`,
      },
      OPEN: {
        position: 'absolute',
        right: '0',
        transform: `translateX(0px)`,
        width: `${MainViewModel.CONFIG.PANEL.WIDTH}px`,
      },
    };
  }

  constructor(repositories) {
    this.closePanel = this.closePanel.bind(this);
    this.closePanelImmediatly = this.closePanelImmediatly.bind(this);
    this.closePanelOnClick = this.closePanelOnClick.bind(this);
    this.openPanel = this.openPanel.bind(this);
    this.togglePanel = this.togglePanel.bind(this);

    this.elementId = 'wire-main';
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.MainViewModel', z.config.LOGGER.OPTIONS);

    this.selfUser = this.userRepository.self;

    this.isPanelOpen = ko.observable(false);

    this.actions = new z.viewModel.ActionsViewModel(this, repositories);

    this.panel = new z.viewModel.PanelViewModel(this, repositories);
    this.content = new z.viewModel.ContentViewModel(this, repositories);
    this.list = new z.viewModel.ListViewModel(this, repositories);

    this.modals = new z.viewModel.ModalsViewModel();
    this.lightbox = new z.viewModel.ImageDetailViewViewModel(this, repositories);
    this.loading = new z.viewModel.LoadingViewModel(this, repositories);
    this.shortcuts = new z.viewModel.ShortcutsViewModel(this, repositories);
    this.title = new z.viewModel.WindowTitleViewModel(this, repositories);
    this.favicon = new z.viewModel.FaviconViewModel(window.amplify);
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
    return this.togglePanel(MainViewModel.PANEL_STATE.OPEN);
  }

  closePanel() {
    return this.togglePanel(MainViewModel.PANEL_STATE.CLOSED);
  }

  closePanelImmediatly() {
    document.querySelector('.center-column__overlay').removeEventListener('click', this.togglePanel);
    document.querySelector('#app').classList.remove('app--panel-open');
    this.isPanelOpen(false);
  }

  togglePanel(forceState) {
    const app = document.querySelector('#app');
    const panel = document.querySelector('.right-column');

    const isPanelOpen = app.classList.contains('app--panel-open');
    const isAlreadyClosed = forceState === MainViewModel.PANEL_STATE.CLOSED && !isPanelOpen;
    const isAlreadyOpen = forceState === MainViewModel.PANEL_STATE.OPEN && isPanelOpen;

    const isInForcedState = isAlreadyClosed || isAlreadyOpen;
    if (isInForcedState) {
      return Promise.resolve();
    }

    const titleBar = document.querySelector('#conversation-title-bar');
    const input = document.querySelector('#conversation-input-bar');

    const isNarrowScreen = app.offsetWidth < MainViewModel.CONFIG.PANEL.BREAKPOINT;

    const centerWidthClose = app.offsetWidth - MainViewModel.CONFIG.PANEL.WIDTH;
    const centerWidthOpen = centerWidthClose - MainViewModel.CONFIG.PANEL.WIDTH;

    return new Promise(resolve => {
      const transitionEndHandler = event => {
        if (event.target === panel) {
          panel.removeEventListener('transitionend', transitionEndHandler);
          this._clearStyles(panel, ['width', 'transform', 'position', 'right', 'transition']);
          this._clearStyles(titleBar, ['width', 'transition']);
          this._clearStyles(input, ['width', 'transition']);

          const overlay = document.querySelector('.center-column__overlay');
          if (isPanelOpen) {
            app.classList.remove('app--panel-open');
            this.isPanelOpen(false);
            overlay.removeEventListener('click', this.closePanelOnClick);
          } else {
            app.classList.add('app--panel-open');
            this.isPanelOpen(true);
            overlay.addEventListener('click', this.closePanelOnClick);
          }

          if (!isNarrowScreen) {
            // In case we are not on a narrow screen, opening a panel will resize a bunch of elements
            // we need to warn them by triggering a window resize event.
            // When the screen is narrow, the panel just goes on top, no elements are resized
            window.dispatchEvent(new Event('resize'));
          }

          resolve();
        }
      };

      panel.addEventListener('transitionend', transitionEndHandler);

      if (isPanelOpen) {
        this._applyStyle(panel, MainViewModel.PANEL_STYLE.OPEN);
        if (!isNarrowScreen) {
          this._applyStyle(titleBar, {width: `${centerWidthOpen}px`});
          this._applyStyle(input, {width: `${centerWidthOpen}px`});
        }
      } else {
        this._applyStyle(panel, MainViewModel.PANEL_STYLE.CLOSED);
        if (!isNarrowScreen) {
          this._applyStyle(titleBar, {width: `${centerWidthClose}px`});
          this._applyStyle(input, {width: `${centerWidthClose}px`});
        }
      }

      z.util.afterRender(() => {
        const widthTransition = 'width .35s cubic-bezier(0.19, 1, 0.22, 1)';
        this._applyStyle(panel, {transition: 'transform .35s cubic-bezier(0.19, 1, 0.22, 1)'});
        this._applyStyle(titleBar, {transition: widthTransition});
        this._applyStyle(input, {transition: widthTransition});

        if (isPanelOpen) {
          this._applyStyle(panel, MainViewModel.PANEL_STYLE.CLOSED);
          if (!isNarrowScreen) {
            this._applyStyle(titleBar, {width: `${centerWidthClose}px`});
            this._applyStyle(input, {width: `${centerWidthClose}px`});
          }
        } else {
          this._applyStyle(panel, MainViewModel.PANEL_STYLE.OPEN);
          if (!isNarrowScreen) {
            this._applyStyle(titleBar, {width: `${centerWidthOpen}px`});
            this._applyStyle(input, {width: `${centerWidthOpen}px`});
          }
        }
      });
    });
  }

  _applyStyle(element, style) {
    if (element) {
      Object.entries(style).forEach(([key, styleValue]) => (element.style[key] = styleValue));
    }
  }

  _clearStyles(element, styles) {
    if (element) {
      styles.forEach(key => (element.style[key] = ''));
    }
  }

  closePanelOnClick() {
    this.panel.closePanel();
  }
};
