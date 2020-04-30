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
import {Availability} from '@wireapp/protocol-messaging';

interface AvailabilityStateParams {
  availability: () => Availability.Type;
  label: string;
  showArrow?: boolean;
  theme?: boolean;
}

ko.components.register('availability-state', {
  template: `
      <!-- ko if: isAvailable() -->
        <availability-available-icon class="availability-state-icon" data-uie-name="status-availability-icon" data-uie-value="available"></availability-available-icon>
      <!-- /ko -->
      <!-- ko if: isAway() -->
        <availability-away-icon class="availability-state-icon" data-uie-name="status-availability-icon" data-uie-value="away"></availability-away-icon>
      <!-- /ko -->
      <!-- ko if: isBusy() -->
        <availability-busy-icon class="availability-state-icon" data-uie-name="status-availability-icon" data-uie-value="busy"></availability-busy-icon>
      <!-- /ko -->
      <!-- ko if: label -->
        <div class="availability-state-label" data-bind="css: {'accent-text': theme}, text: label" data-uie-name="status-label"></div>
      <!-- /ko -->
      <!-- ko if: showArrow -->
        <span class="availability-state-arrow"></span>
      <!-- /ko -->
        `,
  viewModel: function ({availability, label, showArrow = false, theme = false}: AvailabilityStateParams): void {
    this.isAvailable = () => availability() === Availability.Type.AVAILABLE;
    this.isAway = () => availability() === Availability.Type.AWAY;
    this.isBusy = () => availability() === Availability.Type.BUSY;
    this.label = label;
    this.showArrow = showArrow;
    this.theme = theme;
  },
});
