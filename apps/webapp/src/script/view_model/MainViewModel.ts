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

import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {container} from 'tsyringe';

import {ActionsViewModel} from './ActionsViewModel';
import {CallingViewModel} from './CallingViewModel';
import {ContentViewModel} from './ContentViewModel';
import {ListViewModel} from './ListViewModel';
import type {ViewModelRepositories} from './ViewModelRepositories';

import {MediaDevicesHandler} from '../repositories/media/MediaDevicesHandler';
import {MediaStreamHandler} from '../repositories/media/MediaStreamHandler';
import {TeamState} from '../repositories/team/TeamState';
import {UserState} from '../repositories/user/userState';
import {Core} from '../service/coreSingleton';
import {type Translate} from '../util/localizerUtil';

type MainViewModelPanelConfig = {BREAKPOINT: number; WIDTH: number};
type MainViewModelConfig = {PANEL: MainViewModelPanelConfig};

export type {ViewModelRepositories};

export class MainViewModel {
  actions: ActionsViewModel;
  calling: CallingViewModel;
  content: ContentViewModel;
  list: ListViewModel;
  private readonly core = container.resolve(Core);
  readonly translate: Translate;

  static get CONFIG(): MainViewModelConfig {
    return {
      PANEL: {
        BREAKPOINT: 1000,
        WIDTH: 304,
      },
    };
  }

  get isFederated(): boolean {
    return this.core.backendFeatures.isFederated;
  }

  constructor(repositories: ViewModelRepositories, translate: Translate, fireAndForgetInvoker: FireAndForgetInvoker) {
    this.translate = translate;
    const userState = container.resolve(UserState);
    const teamState = container.resolve(TeamState);
    const mediaDevicesHandler = container.resolve(MediaDevicesHandler);
    const mediaStreamHandler = container.resolve(MediaStreamHandler);

    this.actions = new ActionsViewModel(
      repositories.self,
      repositories.cells,
      repositories.connection,
      repositories.conversation,
      repositories.integration,
      repositories.message,
      userState,
      teamState,
      this,
      this.translate,
    );

    this.calling = new CallingViewModel(
      repositories.calling,
      repositories.audio,
      mediaDevicesHandler,
      mediaStreamHandler,
      repositories.team,
      repositories.properties,
      userState.self,
      this.translate,
    );
    this.content = new ContentViewModel(this, repositories, this.translate);
    this.list = new ListViewModel(this, repositories, this.translate, fireAndForgetInvoker);
  }
}
