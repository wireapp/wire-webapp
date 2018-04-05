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

z.viewModel.LoadingViewModel = class LoadingViewModel {
  constructor(mainViewModel, repositories) {
    this.elementId = 'loading-screen';
    this.userRepository = repositories.user;
    this.loadingMessage = ko.observable('');
    this.loadingProgress = ko.observable(0);

    this.loadingPercentage = ko.pureComputed(() => `${this.loadingProgress()}%`);

    amplify.subscribe(z.event.WebApp.APP.UPDATE_PROGRESS, this.updateProgress.bind(this));

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  removeFromView() {
    $(`#${this.elementId}`).remove();
    amplify.unsubscribeAll(z.event.WebApp.APP.UPDATE_PROGRESS);
  }

  updateProgress(progress = 0, messageLocator, replaceContent) {
    const hasProgressIncreased = progress > this.loadingProgress();
    progress = hasProgressIncreased ? progress : this.loadingProgress() + 0.01;
    this.loadingProgress(progress);

    if (messageLocator) {
      let updatedLoadingMessage;

      switch (messageLocator) {
        case z.string.initReceivedSelfUser: {
          updatedLoadingMessage = z.l10n.text(messageLocator, this.userRepository.self().first_name());
          break;
        }

        case z.string.initDecryption:
        case z.string.initEvents: {
          if (z.util.Environment.frontend.isProduction()) {
            updatedLoadingMessage = z.l10n.text(messageLocator);
            break;
          }

          const substitutes = {
            number1: replaceContent.handled,
            number2: replaceContent.total,
          };

          const handlingProgress = z.l10n.text(z.string.initProgress, substitutes);
          updatedLoadingMessage = `${z.l10n.text(messageLocator)}${handlingProgress}`;
          break;
        }

        default:
          updatedLoadingMessage = z.l10n.text(messageLocator);
      }

      this.loadingMessage(updatedLoadingMessage);
    }
  }
};
