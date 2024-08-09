/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import ko from 'knockout';
import {singleton} from 'tsyringe';

import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useDetachedCallingFeatureState} from 'Components/calling/DetachedCallingCell/DetachedCallingFeature.state';
import {calculateChildWindowPosition} from 'Util/DOM/caculateChildWindowPosition';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {copyStyles} from 'Util/renderElement';

import {Call} from './Call';

import {Config} from '../Config';
import type {ElectronDesktopCapturerSource} from '../media/MediaDevicesHandler';
import {CallViewTab} from '../view_model/CallingViewModel';

export enum MuteState {
  NOT_MUTED,
  SELF_MUTED,
  REMOTE_MUTED,
  REMOTE_FORCE_MUTED,
}

export enum CallingViewMode {
  FULL_SCREEN = 'fullscreen',
  DETACHED_WINDOW = 'detached_window',
  MINIMIZED = 'minimized',
}

export enum DesktopScreenShareMenu {
  NONE = 'none',
  MAIN_WINDOW = 'main_window',
  DETACHED_WINDOW = 'detached_window',
}

type Emoji = {emoji: string; id: string; left: number; from: string};

declare global {
  interface Document {
    readonly pictureInPictureEnabled: boolean;
    exitPictureInPicture(): Promise<void>;
  }

  interface DocumentPictureInPicture {
    window: Window | null;
    requestWindow(options?: {width?: number; height?: number}): Promise<DocumentPictureInPictureWindow>;
  }

  interface DocumentPictureInPictureWindow extends Window {
    resizeTo(width: number, height: number): void;
    close(): void;
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

@singleton()
export class CallState {
  public readonly calls: ko.ObservableArray<Call> = ko.observableArray();
  public readonly emojis: ko.ObservableArray<Emoji> = ko.observableArray<Emoji>([]);
  /** List of calls that can be joined by the user */
  public readonly joinableCalls: ko.PureComputed<Call[]>;
  public readonly acceptedVersionWarnings = ko.observableArray<QualifiedId>();
  public readonly cbrEncoding = ko.observable(Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE ? 1 : 0);
  readonly selectableScreens = ko.observable<ElectronDesktopCapturerSource[]>([]);
  readonly selectableWindows = ko.observable<ElectronDesktopCapturerSource[]>([]);
  /** call that is current active (connecting or connected) */
  public readonly activeCalls: ko.PureComputed<Call[]>;
  public readonly joinedCall: ko.PureComputed<Call | undefined>;
  public readonly activeCallViewTab = ko.observable(CallViewTab.ALL);
  readonly hasAvailableScreensToShare: ko.PureComputed<boolean>;
  readonly isSpeakersViewActive: ko.PureComputed<boolean>;
  public readonly viewMode = ko.observable<CallingViewMode>(CallingViewMode.MINIMIZED);
  public readonly detachedWindow = ko.observable<Window | null>(null);
  public readonly detachedWindowCallQualifiedId = ko.observable<QualifiedId | null>(null);
  public readonly desktopScreenShareMenu = ko.observable<DesktopScreenShareMenu>(DesktopScreenShareMenu.NONE);

  constructor() {
    this.joinedCall = ko.pureComputed(() => this.calls().find(call => call.state() === CALL_STATE.MEDIA_ESTAB));
    this.activeCalls = ko.pureComputed(() => this.calls().filter(call => !call.reason()));
    this.joinableCalls = ko.pureComputed(() =>
      this.calls().filter(
        call => call.state() === CALL_STATE.INCOMING && call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE,
      ),
    );

    this.calls.subscribe(activeCalls => {
      const activeCallIds = activeCalls.map(call => call.conversation.qualifiedId);
      this.acceptedVersionWarnings.remove(
        acceptedId => !activeCallIds.some(callId => matchQualifiedIds(acceptedId, callId)),
      );
    });
    this.isSpeakersViewActive = ko.pureComputed(() => this.activeCallViewTab() === CallViewTab.SPEAKERS);

    this.hasAvailableScreensToShare = ko.pureComputed(
      () => this.selectableScreens().length > 0 || this.selectableWindows().length > 0,
    );
  }

  onPageHide = (event: PageTransitionEvent) => {
    if (event.persisted) {
      return;
    }

    this.detachedWindow()?.close();
  };

  handleThemeUpdateEvent = () => {
    const detachedWindow = this.detachedWindow();
    if (detachedWindow) {
      detachedWindow.document.body.className = window.document.body.className;
    }
  };

  closeDetachedWindow = () => {
    this.detachedWindow(null);
    this.detachedWindowCallQualifiedId(null);
    amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, this.handleThemeUpdateEvent);
    this.viewMode(CallingViewMode.MINIMIZED);
  };

  setViewModeMinimized = () => {
    const isDetachedWindowSupported = useDetachedCallingFeatureState.getState().isSupported();

    if (!isDetachedWindowSupported) {
      this.viewMode(CallingViewMode.MINIMIZED);
      return;
    }

    this.detachedWindow()?.close();
    this.closeDetachedWindow();
  };

  setViewModeFullScreen = () => {
    this.viewMode(CallingViewMode.FULL_SCREEN);
  };

  async setViewModeDetached(
    detachedViewModeOptions: {name: string; height: number; width: number} = {
      name: 'WIRE_PICTURE_IN_PICTURE_CALL',
      width: 1026,
      height: 829,
    },
  ) {
    const isDetachedWindowSupported = useDetachedCallingFeatureState.getState().isSupported();

    if (!isDetachedWindowSupported) {
      this.setViewModeFullScreen();
      return;
    }

    const isDesktop = Runtime.isDesktopApp();
    const {name, width, height} = detachedViewModeOptions;
    if ('documentPictureInPicture' in window && window.documentPictureInPicture && !isDesktop) {
      const detachedWindow = await window.documentPictureInPicture.requestWindow({height, width});

      this.detachedWindow(detachedWindow);
    } else {
      const {top, left} = calculateChildWindowPosition(height, width);

      const detachedWindow = window.open(
        '',
        name,
        `
        width=${width}
        height=${height},
        top=${top},
        left=${left}
        location=no,
        menubar=no,
        resizable=no,
        status=no,
        toolbar=no,
      `,
      );

      this.detachedWindow(detachedWindow);
    }

    this.detachedWindowCallQualifiedId(this.joinedCall()?.conversation.qualifiedId ?? null);

    const detachedWindow = this.detachedWindow();
    if (!detachedWindow) {
      return;
    }

    // New window is not opened on the same domain (it's about:blank), so we cannot use any of the dom loaded events to copy the styles.
    setTimeout(() => copyStyles(window.document, detachedWindow.document), 0);

    detachedWindow.document.title = window.document.title;

    detachedWindow.addEventListener('beforeunload', this.closeDetachedWindow);
    detachedWindow.addEventListener('pagehide', this.closeDetachedWindow);
    window.addEventListener('pagehide', this.onPageHide);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, this.handleThemeUpdateEvent);

    this.viewMode(CallingViewMode.DETACHED_WINDOW);
  }
}
