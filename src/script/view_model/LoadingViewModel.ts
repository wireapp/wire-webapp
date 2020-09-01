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

import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {t} from 'Util/LocalizerUtil';

import {Config} from '../Config';

import 'Components/loadingBar';

export class LoadingViewModel {
  loadingMessage: ko.Observable<string>;
  loadingProgress: ko.Observable<number>;
  element: HTMLElement;

  constructor() {
    this.loadingMessage = ko.observable('');
    this.loadingProgress = ko.observable(0);
    amplify.subscribe(WebAppEvents.APP.UPDATE_PROGRESS, this.updateProgress);

    const elementId = 'loading-screen';
    this.element = document.getElementById(elementId);
    ko.applyBindings(this, this.element);
  }

  removeFromView = () => {
    ko.cleanNode(this.element);
    this.element.remove();
    amplify.unsubscribeAll(WebAppEvents.APP.UPDATE_PROGRESS);
  };

  updateProgress = (progress = 0, message?: string, replaceContent?: {handled: number; total: number}) => {
    const hasProgressIncreased = progress > this.loadingProgress();
    progress = hasProgressIncreased ? progress : this.loadingProgress() + 0.01;
    this.loadingProgress(progress);

    if (message) {
      let updatedLoadingMessage;

      switch (message) {
        case t('initDecryption'):
        case t('initEvents'): {
          if (!Config.getConfig().FEATURE.SHOW_LOADING_INFORMATION) {
            updatedLoadingMessage = message;
            break;
          }

          const substitutes = {
            number1: replaceContent.handled.toString(),
            number2: replaceContent.total.toString(),
          };

          const handlingProgress = t('initProgress', substitutes);
          updatedLoadingMessage = `${message}${handlingProgress}`;
          break;
        }

        default:
          updatedLoadingMessage = message;
      }

      this.loadingMessage(updatedLoadingMessage);
    }
  };
}
