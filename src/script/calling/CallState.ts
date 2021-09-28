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

@singleton()
export class CallState {
  public readonly activeCalls: ko.ObservableArray<Call>;
  public readonly isMuted: ko.Observable<boolean>;
  public readonly joinedCall: ko.PureComputed<Call | undefined>;
  public readonly acceptedVersionWarnings: ko.ObservableArray<string>;
  public readonly cbrEncoding: ko.Observable<number>;
  public readonly activeCallViewTab: ko.Observable<string>;
  readonly selectableScreens: ko.Observable<ElectronDesktopCapturerSource[]>;
  readonly selectableWindows: ko.Observable<ElectronDesktopCapturerSource[]>;
  readonly isChoosingScreen: ko.PureComputed<boolean>;
  readonly isSpeakersViewActive: ko.PureComputed<boolean>;

  constructor() {
    this.activeCalls = ko.observableArray();
    this.isMuted = ko.observable(false);
    this.joinedCall = ko.pureComputed(() => {
      return this.activeCalls().find(call => call.state() === CALL_STATE.MEDIA_ESTAB);
    });
    this.acceptedVersionWarnings = ko.observableArray<string>();
    this.activeCalls.subscribe(activeCalls => {
      const activeCallIds = activeCalls.map(call => call.conversationId);
      this.acceptedVersionWarnings.remove(acceptedId => !activeCallIds.includes(acceptedId));
    });
    this.cbrEncoding = ko.observable(Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE ? 1 : 0);
    this.activeCallViewTab = ko.observable(CallViewTab.ALL);
    this.isSpeakersViewActive = ko.pureComputed(() => this.activeCallViewTab() === CallViewTab.SPEAKERS);

    this.selectableScreens = ko.observable([]);
    this.selectableWindows = ko.observable([]);
    this.isChoosingScreen = ko.pureComputed(
      () => this.selectableScreens().length > 0 || this.selectableWindows().length > 0,
    );
  }
}
