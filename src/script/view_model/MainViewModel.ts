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

import {getLogger, Logger} from 'Util/Logger';
import {afterRender} from 'Util/util';
import {amplify} from 'amplify';
import ko from 'knockout';

import {WindowTitleViewModel} from './WindowTitleViewModel';
import {modals, ModalsViewModel} from './ModalsViewModel';
import {WarningsViewModel} from './WarningsViewModel';
import {ContentViewModel} from './ContentViewModel';
import {CallingViewModel} from './CallingViewModel';
import {ActionsViewModel} from './ActionsViewModel';
import {ListViewModel} from './ListViewModel';
import {FaviconViewModel} from './FaviconViewModel';
import {ImageDetailViewViewModel} from './ImageDetailViewViewModel';

import type {AssetRepository} from '../assets/AssetRepository';
import type {AudioRepository} from '../audio/AudioRepository';
import type {BackupRepository} from '../backup/BackupRepository';
import type {CallingRepository} from '../calling/CallingRepository';
import type {ClientRepository} from '../client/ClientRepository';
import type {ConnectionRepository} from '../connection/ConnectionRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {CryptographyRepository} from '../cryptography/CryptographyRepository';
import type {EventRepository} from '../event/EventRepository';
import type {GiphyRepository} from '../extension/GiphyRepository';
import type {IntegrationRepository} from '../integration/IntegrationRepository';
import type {MediaRepository} from '../media/MediaRepository';
import type {Multitasking, NotificationRepository} from '../notification/NotificationRepository';
import {PanelViewModel} from './PanelViewModel';
import type {PermissionRepository} from '../permission/PermissionRepository';
import type {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import type {PropertiesRepository} from '../properties/PropertiesRepository';
import type {SearchRepository} from '../search/SearchRepository';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import type {StorageRepository} from '../storage';
import type {TeamRepository} from '../team/TeamRepository';
import type {User} from '../entity/User';
import type {UserRepository} from '../user/UserRepository';
import type {AuthRepository} from '../auth/AuthRepository';
import type {BroadcastRepository} from '../broadcast/BroadcastRepository';
import type {EventTrackingRepository} from '../tracking/EventTrackingRepository';
import type {MessageRepository} from '../conversation/MessageRepository';
import {container} from 'tsyringe';
import {UserState} from '../user/UserState';

export interface ViewModelRepositories {
  asset: AssetRepository;
  audio: AudioRepository;
  auth: AuthRepository;
  backup: BackupRepository;
  broadcast: BroadcastRepository;
  calling: CallingRepository;
  client: ClientRepository;
  connection: ConnectionRepository;
  conversation: ConversationRepository;
  cryptography: CryptographyRepository;
  event: EventRepository;
  eventTracker: EventTrackingRepository;
  giphy: GiphyRepository;
  integration: IntegrationRepository;
  media: MediaRepository;
  message: MessageRepository;
  notification: NotificationRepository;
  permission: PermissionRepository;
  preferenceNotification: PreferenceNotificationRepository;
  properties: PropertiesRepository;
  search: SearchRepository;
  serverTime: ServerTimeHandler;
  storage: StorageRepository;
  team: TeamRepository;
  user: UserRepository;
}

export class MainViewModel {
  actions: ActionsViewModel;
  calling: CallingViewModel;
  content: ContentViewModel;
  favicon: FaviconViewModel;
  isPanelOpen: ko.Observable<boolean>;
  lightbox: ImageDetailViewViewModel;
  list: ListViewModel;
  logger: Logger;
  mainClasses: ko.PureComputed<string | undefined>;
  modals: ModalsViewModel;
  multitasking: Multitasking;
  panel: PanelViewModel;
  selfUser: ko.Observable<User>;
  title: WindowTitleViewModel;
  userRepository: UserRepository;
  private readonly userState: UserState;
  warnings: WarningsViewModel;

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
        transform: 'translateX(0px)',
        width: `${MainViewModel.CONFIG.PANEL.WIDTH}px`,
      },
    };
  }

  constructor(repositories: ViewModelRepositories) {
    this.userRepository = repositories.user;
    this.logger = getLogger('MainViewModel');

    this.userState = container.resolve(UserState);

    this.modals = modals;

    this.multitasking = {
      autoMinimize: ko.observable(true),
      isMinimized: ko.observable(false),
      resetMinimize: ko.observable(false),
    };

    this.selfUser = this.userState.self;

    this.isPanelOpen = ko.observable(false);

    this.actions = new ActionsViewModel(
      this,
      repositories.client,
      repositories.connection,
      repositories.conversation,
      repositories.integration,
      repositories.message,
    );

    this.panel = new PanelViewModel(this, repositories);
    this.calling = new CallingViewModel(
      repositories.calling,
      repositories.audio,
      repositories.media.devicesHandler,
      repositories.media.streamHandler,
      repositories.permission,
      repositories.team,
      this.selfUser,
      this.multitasking,
    );
    this.content = new ContentViewModel(this, repositories);
    this.list = new ListViewModel(this, repositories);

    this.lightbox = new ImageDetailViewViewModel(
      this,
      repositories.conversation,
      repositories.asset,
      repositories.message,
    );
    this.title = new WindowTitleViewModel(this);
    this.favicon = new FaviconViewModel(amplify);
    this.warnings = new WarningsViewModel();

    this.mainClasses = ko.pureComputed(() => {
      if (this.selfUser()) {
        // deprecated - still used on input control hover
        return `main-accent-color-${this.selfUser().accent_id()} show`;
      }
      return undefined;
    });

    // Prevent Chrome (and Electron) from pushing the content out of the
    // viewport when using form elements (e.g. in the preferences)
    document.addEventListener('scroll', () => window.scrollTo(0, 0));
  }

  openPanel(): Promise<void> {
    return this.togglePanel(MainViewModel.PANEL_STATE.OPEN);
  }

  closePanel(): Promise<void> {
    return this.togglePanel(MainViewModel.PANEL_STATE.CLOSED);
  }

  closePanelImmediately(): void {
    document.querySelector('#app').classList.remove('app--panel-open');
    this.isPanelOpen(false);
  }

  togglePanel = (forceState: string): Promise<void> => {
    const app = document.querySelector<HTMLElement>('#app');
    const panel = document.querySelector<HTMLElement>('.right-column');

    const isPanelOpen = app.classList.contains('app--panel-open');
    const isAlreadyClosed = forceState === MainViewModel.PANEL_STATE.CLOSED && !isPanelOpen;
    const isAlreadyOpen = forceState === MainViewModel.PANEL_STATE.OPEN && isPanelOpen;

    const isInForcedState = isAlreadyClosed || isAlreadyOpen;
    if (isInForcedState) {
      return Promise.resolve();
    }

    const titleBar = document.querySelector<HTMLElement>('#conversation-title-bar');
    const input = document.querySelector<HTMLElement>('#conversation-input-bar');

    const isNarrowScreen = app.offsetWidth < MainViewModel.CONFIG.PANEL.BREAKPOINT;

    const centerWidthClose = app.offsetWidth - MainViewModel.CONFIG.PANEL.WIDTH;
    const centerWidthOpen = centerWidthClose - MainViewModel.CONFIG.PANEL.WIDTH;

    return new Promise(resolve => {
      const transitionEndHandler = (event: Event) => {
        if (event.target === panel) {
          panel.removeEventListener('transitionend', transitionEndHandler);
          this._clearStyles(panel, ['width', 'transform', 'position', 'right', 'transition']);
          this._clearStyles(titleBar, ['width', 'transition']);
          this._clearStyles(input, ['width', 'transition']);

          const overlay = document.querySelector<HTMLElement>('.center-column__overlay');
          if (isPanelOpen) {
            app.classList.remove('app--panel-open');
            this.isPanelOpen(false);
            overlay.removeEventListener('click', this.closePanelOnClick);
          } else {
            app.classList.add('app--panel-open');
            this.isPanelOpen(true);
            overlay.addEventListener('click', this.closePanelOnClick);
          }

          window.dispatchEvent(new Event('resize'));

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

      afterRender(() => {
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
  };

  private _applyStyle(element: HTMLElement, style: Record<string, string>): void {
    if (element) {
      Object.entries(style).forEach(([key, styleValue]) => (element.style[key as any] = styleValue));
    }
  }

  private _clearStyles(element: HTMLElement, styles: string[]): void {
    if (element) {
      styles.forEach(key => (element.style[key as any] = ''));
    }
  }

  closePanelOnClick = (): void => {
    this.panel.closePanel();
  };
}
