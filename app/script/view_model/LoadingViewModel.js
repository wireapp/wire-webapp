/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.LoadingViewModel = class LoadingViewModel {
  constructor(element_id, user_repository) {
    this.user_repository = user_repository;
    this.loading_message = ko.observable('');
    this.loading_progress = ko.observable(0);

    this.loading_percentage = ko.pureComputed(() => {
      return `${this.loading_progress()}%`;
    });

    amplify.subscribe(z.event.WebApp.APP.UPDATE_PROGRESS, this.update_progress.bind(this));

    ko.applyBindings(this, document.getElementById(element_id));
  }

  update_progress(progress = 0, message_locator, replace_content) {
    if (progress > this.loading_progress()) {
      this.loading_progress(progress);
    } else {
      this.loading_progress(this.loading_progress() + 0.01);
    }

    if (message_locator) {
      let updated_loading_message;

      switch (message_locator) {
        case z.string.initReceivedSelfUser: {
          updated_loading_message = z.l10n.text(message_locator, this.user_repository.self().first_name());
          break;
        }

        case z.string.initDecryption:
        case z.string.initEvents: {
          if (z.util.Environment.frontend.is_production()) {
            updated_loading_message = z.l10n.text(message_locator);
          } else {
            const substitutes = {
              number1: replace_content.handled,
              number2: replace_content.total,
            };

            const handling_progress = z.l10n.text(z.string.initProgress, substitutes);
            updated_loading_message = `${z.l10n.text(message_locator)}${handling_progress}`;
          }
          break;
        }

        default:
          updated_loading_message = z.l10n.text(message_locator);
      }

      this.loading_message(updated_loading_message);
    }
  }
};
