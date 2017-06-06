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
window.z.components = z.components || {};

z.components.EphemeralTimer = class EphemeralTimer {
  constructor(params) {
    this.destroy = this.destroy.bind(this);

    this.message_et = params.message;

    this.ephemeral_duration = ko.computed(
      () =>
        this.message_et.ephemeral_expires() -
        this.message_et.ephemeral_started()
    );

    this.progress = ko.observable(0);
    this.remaining_time = ko.observable(0);

    this.remaining_subscription = this.message_et.ephemeral_remaining.subscribe(
      remaining_time => {
        if (Date.now() >= this.message_et.ephemeral_expires()) {
          return this.progress(1);
        }
        const elapsed_time = this.ephemeral_duration() - remaining_time;
        return this.progress(elapsed_time / this.ephemeral_duration());
      }
    );

    this.bullet_count = [0, 1, 2, 3, 4];
  }

  is_bullet_active(index) {
    const passed_index =
      this.progress() > (index + 1) / this.bullet_count.length;
    if (passed_index) {
      return 'ephemeral-timer-bullet-inactive';
    }
  }

  destroy() {
    this.remaining_subscription.dispose();
    window.clearInterval(this.message_et.ephemeral_interval_id);
    this.message_et.ephemeral_interval_id = undefined;
    window.clearTimeout(this.message_et.ephemeral_timeout_id);
    this.message_et.ephemeral_timeout_id = undefined;
  }
};

ko.components.register('ephemeral-timer', {
  template: `
    <ul class="ephemeral-timer">
      <!-- ko foreach: bullet_count -->
       <li class="ephemeral-timer-bullet" data-bind="css: $parent.is_bullet_active($data)"></li>
      <!-- /ko -->
    </ul>
  `,
  viewModel: z.components.EphemeralTimer,
});
