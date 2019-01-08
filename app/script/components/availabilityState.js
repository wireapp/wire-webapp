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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.AvailabilityState = class AvailabilityState {
  constructor(params) {
    this.availability = params.availability;
    this.label = params.label;
    this.showArrow = params.showArrow || false;
    this.theme = params.theme || false;
  }
};

ko.components.register('availability-state', {
  template: `
      <!-- ko if: $data.availability() === z.user.AvailabilityType.AVAILABLE -->
        <svg class="availability-state-icon" viewBox="0 0 10 10" data-uie-name="available">
          <circle cx="5" cy="5" r="5" stroke="none"></circle>
        </svg>
      <!-- /ko -->
      <!-- ko if: $data.availability() === z.user.AvailabilityType.AWAY -->
        <svg class="availability-state-icon" viewBox="0 0 10 10" data-uie-name="away">
          <circle cx="5" cy="5" r="4" stroke-width="2" fill="none"></circle>
        </svg>
      <!-- /ko -->
      <!-- ko if: $data.availability() === z.user.AvailabilityType.BUSY -->
        <svg class="availability-state-icon" viewBox="0 0 10 10" data-uie-name="busy">
          <path stroke="none" d="M5 10A5 5 0 1 1 5 0a5 5 0 0 1 0 10zM3 4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H3z"></path>
        </svg>
      <!-- /ko -->
      <!-- ko if: $data.label -->
        <div class="availability-state-label" data-bind="css: {'text-theme': theme}, text: $data.label" data-uie-name="status-label"></div>
      <!-- /ko -->
      <!-- ko if: $data.showArrow -->
        <span class="availability-state-arrow"></span>
      <!-- /ko -->
        `,
  viewModel: z.components.AvailabilityState,
});
