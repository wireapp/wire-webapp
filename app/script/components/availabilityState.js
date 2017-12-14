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
        <svg data-uie-name="available" class="availability-state-icon" viewBox="0 0 10 10" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="5" r="5" stroke="none"></circle>
        </svg>
      <!-- /ko -->
      <!-- ko if: $data.availability() === z.user.AvailabilityType.AWAY -->
        <svg data-uie-name="away" class="availability-state-icon" viewBox="0 0 10 10" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="5" r="4" stroke-width="2" fill="none"></circle>
        </svg>
      <!-- /ko -->
      <!-- ko if: $data.availability() === z.user.AvailabilityType.BUSY -->
        <svg data-uie-name="busy" class="availability-state-icon" viewBox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M15,30 C6.71572875,30 0,23.2842712 0,15 C0,6.71572875 6.71572875,0 15,0 C23.2842712,0 30,6.71572875 30,15 C30,23.2842712 23.2842712,30 15,30 Z M6,12 L6,18 L24,18 L24,12 L6,12 Z"></path>
        </svg>
      <!-- /ko -->
      <!-- ko if: $data.label -->
        <div class="availability-state-label" data-bind="css: {'text-theme': theme}, html: $data.label"></div>
      <!-- /ko -->
      <!-- ko if: $data.showArrow -->
        <span class="availability-state-arrow"></span>
      <!-- /ko -->
        `,
  viewModel: z.components.AvailabilityState,
});
