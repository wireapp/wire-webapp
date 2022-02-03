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

import {singleton} from 'tsyringe';
import ko from 'knockout';
import {Call} from './Call';
import {STATE as CALL_STATE} from '@wireapp/avs';
import {CallViewTab} from '../view_model/CallingViewModel';
import {Config} from '../Config';
import type {ElectronDesktopCapturerSource} from '../media/MediaDevicesHandler';

export enum MuteState {
  NOT_MUTED,
  SELF_MUTED,
  REMOTE_MUTED,
  REMOTE_FORCE_MUTED,
}

@singleton()
export class CallState {
  public readonly activeCalls: ko.ObservableArray<Call> = ko.observableArray();
  public readonly muteState: ko.Observable<MuteState> = ko.observable(MuteState.NOT_MUTED);
  public readonly acceptedVersionWarnings: ko.ObservableArray<string> = ko.observableArray<string>();
  public readonly cbrEncoding: ko.Observable<number> = ko.observable(
    Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE ? 1 : 0,
  );
  public readonly videoSpeakersActiveTab: ko.Observable<string> = ko.observable(CallViewTab.ALL);
  readonly selectableScreens: ko.Observable<ElectronDesktopCapturerSource[]> = ko.observable([]);
  readonly selectableWindows: ko.Observable<ElectronDesktopCapturerSource[]> = ko.observable([]);
  public readonly isMuted: ko.PureComputed<boolean>;
  public readonly joinedCall: ko.PureComputed<Call | undefined>;
  public readonly activeCallViewTab: ko.Observable<string> = ko.observable(CallViewTab.ALL);
  readonly isChoosingScreen: ko.PureComputed<boolean>;
  readonly isSpeakersViewActive: ko.PureComputed<boolean>;

  constructor() {
    this.isMuted = ko.pureComputed(() => this.muteState() !== MuteState.NOT_MUTED);
    this.joinedCall = ko.pureComputed(() => this.activeCalls().find(call => call.state() === CALL_STATE.MEDIA_ESTAB));
    this.isChoosingScreen = ko.pureComputed(
      () => this.selectableScreens().length > 0 || this.selectableWindows().length > 0,
    );

    this.activeCalls.subscribe(activeCalls => {
      const activeCallIds = activeCalls.map(call => call.conversationId);
      this.acceptedVersionWarnings.remove(acceptedId => !activeCallIds.includes(acceptedId));
    });
    this.isSpeakersViewActive = ko.pureComputed(() => this.activeCallViewTab() === CallViewTab.SPEAKERS);

    this.isChoosingScreen = ko.pureComputed(
      () => this.selectableScreens().length > 0 || this.selectableWindows().length > 0,
    );
  }

  updateMuteState = (newState: MuteState) => this.muteState(newState);
}
