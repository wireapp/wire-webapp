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

import {container} from 'tsyringe';

import {TypedEventEmitter} from '@wireapp/commons';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {removeUrlParameters} from 'Util/UrlUtil';

import {DelayTimerService} from './DelayTimer/DelayTimer';
import {hasActiveCertificate, isE2EIEnabled} from './E2EIdentityVerification';
import {getModalOptions, ModalType} from './Modals';
import {getOIDCServiceInstance} from './OIDCService';
import {OIDCServiceStore} from './OIDCService/OIDCServiceStorage';

export enum E2EIHandlerStep {
  UNINITIALIZED = 'uninitialized',
  INITIALIZED = 'initialized',
  ENROLL = 'enroll',
  SUCCESS = 'success',
  ERROR = 'error',
  SNOOZE = 'snooze',
}

interface E2EIHandlerParams {
  discoveryUrl: string;
  gracePeriodInSeconds: number;
}

type Events = {enrollmentSuccessful: void};

type EnrollmentConfig = {
  timer: DelayTimerService;
  discoveryUrl: string;
  gracePeriodInMs: number;
};
export class E2EIHandler extends TypedEventEmitter<Events> {
  private static instance: E2EIHandler | null = null;
  private readonly core = container.resolve(Core);
  private readonly userState = container.resolve(UserState);
  private config?: EnrollmentConfig;
  private currentStep: E2EIHandlerStep | null = E2EIHandlerStep.UNINITIALIZED;

  private get coreE2EIService() {
    const e2eiService = this.core.service?.e2eIdentity;

    if (!e2eiService) {
      throw new Error('E2EI Service not available');
    }

    return e2eiService;
  }

  /**
   * Get the singleton instance of GracePeriodTimer or create a new one
   * For the first time, params are required to create the instance
   * After that, params are optional and can be used to update the grace period timer
   * @param params The params to create the grace period timer
   * @returns The singleton instance of GracePeriodTimer
   */
  public static getInstance() {
    E2EIHandler.instance = E2EIHandler.instance ?? new E2EIHandler();
    return E2EIHandler.instance;
  }

  /**
   * Reset the instance
   */
  public static resetInstance() {
    E2EIHandler.instance = null;
  }

  public initialize({discoveryUrl, gracePeriodInSeconds}: E2EIHandlerParams): void {
    if (isE2EIEnabled()) {
      if (!hasActiveCertificate()) {
        const gracePeriodInMs = gracePeriodInSeconds * TIME_IN_MILLIS.SECOND;
        this.config = {
          discoveryUrl,
          gracePeriodInMs,
          timer: DelayTimerService.getInstance({
            gracePeriodInMS: gracePeriodInMs,
            gracePeriodExpiredCallback: () => null,
            delayPeriodExpiredCallback: () => null,
          }),
        };
        this.showE2EINotificationMessage();
      }
    }
  }

  private async storeRedirectTargetAndRedirect(targetURL: string): Promise<void> {
    // store the target url in the persistent oidc service store, since the oidc service will be destroyed after the redirect
    OIDCServiceStore.store.targetURL(targetURL);
    const oidcService = getOIDCServiceInstance();
    await oidcService.authenticate();
  }

  public async enroll(refreshActiveCertificate: boolean = false) {
    if (!this.config) {
      throw new Error('Trying to enroll for E2EI without initializing the E2EIHandler');
    }
    try {
      // Notify user about E2EI enrolment in progress
      this.currentStep = E2EIHandlerStep.ENROLL;
      this.showLoadingMessage();
      let oAuthIdToken: string | undefined;

      // If the enrolment is in progress, we need to get the id token from the oidc service, since oauth should have already been completed
      if (this.coreE2EIService.isEnrollmentInProgress()) {
        const oidcService = getOIDCServiceInstance();
        const userData = await oidcService.handleAuthentication();
        if (!userData) {
          throw new Error('Received no user data from OIDC service');
        }
        oAuthIdToken = userData?.id_token;
      }

      const displayName = this.userState.self()?.name();
      const handle = this.userState.self()?.username();
      // If the user has no username or handle, we cannot enroll
      if (!displayName || !handle) {
        throw new Error('Username or handle not found');
      }
      const data = await this.core.enrollE2EI({
        discoveryUrl: this.config.discoveryUrl,
        displayName,
        handle,
        oAuthIdToken,
        refreshActiveCertificate,
      });

      // If the data is false or we dont get the ACMEChallenge, enrolment failed
      if (!data) {
        throw new Error('E2EI enrolment failed');
      }

      // Check if the data is a boolean, if not, we need to handle the oauth redirect
      if (typeof data !== 'boolean') {
        await this.storeRedirectTargetAndRedirect(data.target);
      }

      // Notify user about E2EI enrolment success
      // This setTimeout is needed because there was a timing with the success modal and the loading modal
      setTimeout(() => {
        removeCurrentModal();
      }, 0);

      this.currentStep = E2EIHandlerStep.SUCCESS;
      this.showSuccessMessage();
      // Remove the url parameters after enrolment
      removeUrlParameters();
      this.emit('enrollmentSuccessful');
    } catch (error) {
      this.currentStep = E2EIHandlerStep.ERROR;
      setTimeout(() => {
        removeCurrentModal();
      }, 0);
      this.showErrorMessage();
    }
  }

  private showLoadingMessage(): void {
    if (this.currentStep !== E2EIHandlerStep.ENROLL) {
      return;
    }

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.LOADING,
      hideClose: true,
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private showSuccessMessage(): void {
    if (this.currentStep !== E2EIHandlerStep.SUCCESS) {
      return;
    }

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.SUCCESS,
      hideSecondary: true,
      hideClose: false,
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private async showErrorMessage(): Promise<void> {
    if (this.currentStep !== E2EIHandlerStep.ERROR) {
      return;
    }

    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    const oidcService = getOIDCServiceInstance();
    await oidcService.clearProgress();
    // Clear the e2e identity progress
    this.coreE2EIService.clearAllProgress();

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.ERROR,
      hideClose: true,
      primaryActionFn: () => {
        this.currentStep = E2EIHandlerStep.INITIALIZED;
        void this.enroll();
      },
      secondaryActionFn: () => {
        this.showE2EINotificationMessage();
      },
    });

    PrimaryModal.show(modalType, modalOptions);
  }

  private showE2EINotificationMessage(): void {
    // If the user has already started enrolment, don't show the notification. Instead, show the loading modal
    // This will occur after the redirect from the oauth provider
    if (this.coreE2EIService.isEnrollmentInProgress()) {
      void this.enroll();
      return;
    }

    // If the user has already snoozed the notification, don't show it again until the snooze period has expired
    if (this.currentStep !== E2EIHandlerStep.UNINITIALIZED && this.currentStep !== E2EIHandlerStep.SNOOZE) {
      return;
    }

    // Only initialize the timer when the it is uninitialized
    if (this.currentStep === E2EIHandlerStep.UNINITIALIZED) {
      this.config?.timer.updateParams({
        gracePeriodInMS: this.config.gracePeriodInMs,
        gracePeriodExpiredCallback: () => {
          this.showE2EINotificationMessage();
        },
        delayPeriodExpiredCallback: () => {
          this.showE2EINotificationMessage();
        },
      });
      this.currentStep = E2EIHandlerStep.INITIALIZED;
    }

    // If the timer is not active, show the notification
    if (this.config && !this.config.timer.isDelayTimerActive()) {
      const {modalOptions, modalType} = getModalOptions({
        hideSecondary: !this.config.timer.isSnoozeTimeAvailable(),
        primaryActionFn: () => this.enroll(),
        secondaryActionFn: () => {
          this.currentStep = E2EIHandlerStep.SNOOZE;
          this.config?.timer.delayPrompt();
        },
        type: ModalType.ENROLL,
        hideClose: true,
      });
      PrimaryModal.show(modalType, modalOptions);
    }
  }
}
