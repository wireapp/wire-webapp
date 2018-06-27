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

z.components.EphemeralTimer = class EphemeralTimer {
  constructor({message: messageEntity}, componentInfo) {
    const duration = messageEntity.ephemeral_expires() - messageEntity.ephemeral_started();

    const dashLength = 12.6;
    const dial = componentInfo.element.querySelector('.ephemeral-timer__dial');

    const numberOfAnimationSteps = 40;
    const animationIntervalValue = Math.min(duration / numberOfAnimationSteps, z.util.TimeUtil.UNITS_IN_MILLIS.HOUR);
    const animatePie = () => {
      const remainingTime = messageEntity.ephemeral_expires() - Date.now();
      const newDashoffset = dashLength - (remainingTime / duration) * -dashLength;
      dial.style.strokeDashoffset = Math.max(newDashoffset, dashLength);
      if (newDashoffset === dashLength) {
        window.clearInterval(this.animationInterval);
        this.animationInterval = undefined;
      }
    };
    this.animationInterval = window.setInterval(animatePie, animationIntervalValue);
  }

  dispose() {
    window.clearInterval(this.animationInterval);
  }
};

ko.components.register('ephemeral-timer', {
  template: `
    <svg class="ephemeral-timer" viewBox="0 0 8 8" width="8" height="8">
      <circle class="ephemeral-timer__background" cx="4" cy="4" r="4"></circle>
      <circle class="ephemeral-timer__dial" cx="4" cy="4" r="2" stroke-width="4" transform="rotate(-90 4 4)" stroke-dasharray="12.6">
      </circle>
    </svg>
  `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new z.components.EphemeralTimer(params, componentInfo);
    },
  },
});
