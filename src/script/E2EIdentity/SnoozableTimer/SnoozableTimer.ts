/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import logdown from 'logdown';

import {util} from '@wireapp/core';

import {getSnoozeTime} from './delay';
import {SnoozableTimerStore} from './SnoozableTimerStorage';

const {TaskScheduler} = util;

interface CreateGracePeriodTimerParams {
  gracePeriodInMS: number;
  /**
   * called when the grace period is over. The grace period is the time during which the user can keep snoozing the enrollment.
   * Once the grace period is over, the user will be forced to enroll.
   */
  onGracePeriodExpired: () => void;
  /**
   * as long as the grace period is not over, the user can snooze the enrollment. This callback is called when the user snoozes the enrollment.
   */
  onSnoozeExpired: () => void;
}

export class SnoozableTimer {
  private gracePeriodInMS: number;
  private onGracePeriodExpired: () => void;
  private onSnoozeExpired: () => void;
  private readonly logger = logdown('@wireapp/core/DelayTimer');
  private delayPeriodTimerKey: string = 'E2EIdentity_DelayTimer';
  private gracePeriodTimerKey: string = 'E2EIdentity_GracePeriodTimer';

  constructor({
    gracePeriodInMS,
    onGracePeriodExpired: onGracePeriodExpired,
    onSnoozeExpired,
  }: CreateGracePeriodTimerParams) {
    this.gracePeriodInMS = gracePeriodInMS;
    this.onGracePeriodExpired = onGracePeriodExpired;
    this.onSnoozeExpired = onSnoozeExpired;
    this.initialize();
  }

  /**
   * @param CreateGracePeriodTimerParams The params to create the grace period timer
   */
  public updateParams({gracePeriodInMS, onGracePeriodExpired, onSnoozeExpired}: CreateGracePeriodTimerParams) {
    SnoozableTimerStore.clear.all();
    this.clearGracePeriodTimer();
    this.clearSnoozePeriodTimer();
    this.gracePeriodInMS = gracePeriodInMS;
    this.onGracePeriodExpired = onGracePeriodExpired;
    this.onSnoozeExpired = onSnoozeExpired;
    this.initialize();
  }

  /**
   * Initialize the grace period timer and load saved data from local storage if available
   */
  public initialize() {
    if (this.gracePeriodInMS <= 0) {
      return this.exit('Grace period is 0. No delays are allowed.');
    }

    // Check if grace period has changed
    if (SnoozableTimerStore.get.gracePeriod() !== this.gracePeriodInMS) {
      // Check if grace period is less than the time elapsed since the last prompt
      if (this.gracePeriodInMS < this.getElapsedGracePeriod()) {
        return this.exit(
          'Grace period has changed and is less than the time elapsed since the last prompt. No more delays are allowed.',
        );
      }
      this.updateGracePeriod();
    }

    // Load saved data from local storage
    if (SnoozableTimerStore.get.firingDate()) {
      const currentTime = Date.now();
      if (SnoozableTimerStore.get.firingDate() <= currentTime) {
        return this.exit('Grace period is already over. No more delays are allowed.');
      }
    } else {
      const firingDate = Date.now() + this.gracePeriodInMS;
      SnoozableTimerStore.store.firingDate(firingDate);
      SnoozableTimerStore.store.gracePeriod(this.gracePeriodInMS);
    }

    // Start / restart the grace period timer
    this.startGracePeriod(SnoozableTimerStore.get.firingDate());

    // this will start the delay period timer if it was active before
    this.continueSnoozePeriodTimer();
  }

  /**
   * Will start a snooze period if the conditions are met
   */
  public snooze() {
    if (this.isSnoozableTimerActive()) {
      return;
    }
    if (!this.isSnoozeTimeAvailable()) {
      return this.exit('No more delays are allowed.');
    }
    const delayTimeInMS = getSnoozeTime(this.gracePeriodInMS);
    if (delayTimeInMS <= 0) {
      return this.exit('Delay period is 0. No more delays are allowed.');
    }

    if (SnoozableTimerStore.get.firingDate() <= Date.now()) {
      return this.exit('Grace period is already over. No more delays are allowed.');
    }

    this.startSnoozePeriod(Date.now() + delayTimeInMS);
  }

  /**
   * Update the grace period
   */
  private updateGracePeriod() {
    // Store the new grace period
    SnoozableTimerStore.store.gracePeriod(this.gracePeriodInMS);
    const elapsedGracePeriod = this.getElapsedGracePeriod();

    // Check if grace period is already over
    if (elapsedGracePeriod > this.gracePeriodInMS) {
      return this.exit('Grace period is already over. No more delays are allowed.');
    }

    // Update the remaining grace period
    this.gracePeriodInMS -= elapsedGracePeriod;
    const startTime = Date.now();
    // Calculate the new end time
    const firingDate = startTime + this.gracePeriodInMS;
    // Store the new end time
    SnoozableTimerStore.store.firingDate(firingDate);

    this.startGracePeriod(firingDate);
  }

  /**
   * Exit the function
   * @param exitMessage The exit message
   * @returns Calls the gracePeriodExpiredCallback
   */
  private exit(exitMessage: string) {
    this.logger.info(exitMessage);
    this.clearSnoozePeriodTimer();
    this.clearGracePeriodTimer();
    SnoozableTimerStore.clear.all();
    return this.onGracePeriodExpired();
  }

  /**
   * Start the grace period timer and store the grace period
   * @param gracePeriodInMS The grace period in ms
   */
  private startGracePeriod(firingDate: number) {
    this.clearGracePeriodTimer();

    const task = () => {
      return this.exit('Grace period is over. No more delays are allowed.');
    };

    if (TaskScheduler.hasActiveTask(this.gracePeriodTimerKey)) {
      TaskScheduler.continueTask({
        key: this.gracePeriodTimerKey,
        task,
      });
    } else {
      TaskScheduler.addTask({
        key: this.gracePeriodTimerKey,
        task,
        firingDate,
        persist: true,
      });
    }
  }

  /**
   * Start the delay period timer and store the delay time
   * @param delayTimeInMS The delay time in ms
   */
  private startSnoozePeriod(firingDate?: number) {
    this.clearSnoozePeriodTimer();

    const task = () => {
      this.logger.info('Snooze time is over.');
      return this.onSnoozeExpired();
    };

    if (TaskScheduler.hasActiveTask(this.delayPeriodTimerKey)) {
      TaskScheduler.continueTask({
        key: this.delayPeriodTimerKey,
        task,
      });
    } else if (firingDate) {
      TaskScheduler.addTask({
        key: this.delayPeriodTimerKey,
        task,
        firingDate,
        persist: true,
      });
    }
  }

  /**
   * Clear the current grace period timer
   */
  private clearGracePeriodTimer() {
    TaskScheduler.cancelTask(this.gracePeriodTimerKey);
  }

  /**
   * Clear the current delay period timer
   */
  private clearSnoozePeriodTimer() {
    TaskScheduler.cancelTask(this.delayPeriodTimerKey);
  }

  private continueSnoozePeriodTimer() {
    this.startSnoozePeriod();
  }

  /**
   * Get the time elapsed since the last prompt
   * @returns The time elapsed since the last prompt in ms
   */
  private getElapsedGracePeriod() {
    return SnoozableTimerStore.get.firingDate()
      ? Date.now() - (SnoozableTimerStore.get.firingDate() - this.gracePeriodInMS)
      : 0;
  }

  public isSnoozableTimerActive() {
    return TaskScheduler.hasActiveTask(this.delayPeriodTimerKey);
  }

  public isSnoozeTimeAvailable() {
    const remainingTime = SnoozableTimerStore.get.firingDate() - Date.now();
    const delayTime = getSnoozeTime(remainingTime);
    return remainingTime - delayTime > 0;
  }
}
