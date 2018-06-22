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
window.z.components = z.components || {};

z.components.MessageTimerButton = class MessageTimerButton {
  constructor(params) {
    this.conversationEntity = params.conversation;
    this.hasMessageTimer = ko.pureComputed(() => {
      return this.conversationEntity() ? this.conversationEntity().messageTimer() : false;
    });
    this.isTimerDisabled = ko.pureComputed(() => this.conversationEntity().hasGlobalMessageTimer());
    this.duration = ko.pureComputed(() => {
      return this.hasMessageTimer() ? z.util.TimeUtil.formatDuration(this.conversationEntity().messageTimer()) : {};
    });
  }

  /**
   * Click on ephemeral button
   * @param {Object} data - Object
   * @param {DOMEvent} event - Triggered event
   * @returns {undefined} No return value
   */
  onClick(data, event) {
    if (this.isTimerDisabled()) {
      return event.preventDefault();
    }

    const entries = [
      {
        click: () => this.conversationEntity().localMessageTimer(0),
        label: z.l10n.text(z.string.ephemeralUnitsNone),
      },
    ].concat(
      z.ephemeral.timings.VALUES.map(milliseconds => {
        const {text} = z.util.TimeUtil.formatDuration(milliseconds);

        return {
          click: () => this.conversationEntity().localMessageTimer(milliseconds),
          label: text,
        };
      })
    );

    z.ui.Context.from(event, entries, 'message-timer-menu');
  }
};

ko.components.register('message-timer-button', {
  template: `
    <span id="conversation-input-bar-message-timer"
        class="controls-right-button conversation-input-bar-message-timer"
        data-bind="click: onClick, l10n_tooltip: z.string.tooltipConversationEphemeral, attr: {'data-uie-value': isTimerDisabled() ? 'disabled' : 'enabled'}"
        data-uie-name="do-set-ephemeral-timer"
        data-uie-value>
        <!-- ko if: hasMessageTimer() && conversationEntity()-->
            <div class="message-timer-button" data-bind="css: isTimerDisabled() ? 'message-timer-button--disabled' : 'message-timer-button--enabled'">
                <span class="message-timer-button-unit" data-bind="text: duration().unit"></span>
                <span class="full-screen" data-bind="text: duration().value"></span>
            </div>
        <!-- /ko -->

        <!-- ko ifnot: hasMessageTimer() -->
            <hourglass-icon class="button-icon-large"></hourglass-icon>
        <!-- /ko -->
    </span>
    `,
  viewModel: z.components.MessageTimerButton,
});
