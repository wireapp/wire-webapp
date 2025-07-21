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
import {WebAppEvents} from '@wireapp/webapp-events';

import type {ElectronDesktopCapturerSource} from 'Repositories/media/MediaDevicesHandler';
import {EventName} from 'Repositories/tracking/EventName';
import {Segmentation} from 'Repositories/tracking/Segmentation';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {Call} from './Call';

import {Config} from '../../Config';
import {CallViewTab} from '../../view_model/CallingViewModel';

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
  public readonly hasAvailableScreensToShare: ko.PureComputed<boolean>;
  public readonly isSpeakersViewActive: ko.PureComputed<boolean>;
  public readonly isMaximisedViewActive: ko.PureComputed<boolean>;
  public readonly viewMode = ko.observable<CallingViewMode>(CallingViewMode.MINIMIZED);
  public readonly detachedWindow = ko.observable<Window | null>(null);
  public readonly isScreenSharingSourceFromDetachedWindow = ko.observable<boolean>(false);
  public readonly detachedWindowCallQualifiedId = ko.observable<QualifiedId | null>(null);
  public readonly desktopScreenShareMenu = ko.observable<DesktopScreenShareMenu>(DesktopScreenShareMenu.NONE);
  private currentViewMode = this.viewMode();

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

    this.isMaximisedViewActive = ko.pureComputed(() => {
      const call = this.joinedCall();
      if (!call) {
        return false;
      }
      return call.maximizedParticipant() !== null;
    });

    this.hasAvailableScreensToShare = ko.pureComputed(
      () => this.selectableScreens().length > 0 || this.selectableWindows().length > 0,
    );

    // Capture the viewMode value before change
    this.viewMode.subscribe(newVal => (this.currentViewMode = newVal), this, 'beforeChange');

    this.viewMode.subscribe(() => {
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.UI.CALLING_UI_SIZE, {
        [Segmentation.CALLING_UI_SIZE.FROM]: this.currentViewMode,
        [Segmentation.CALLING_UI_SIZE.TO]: this.viewMode(),
      });
    });
  }
}
