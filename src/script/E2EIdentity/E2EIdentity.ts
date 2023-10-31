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

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {Config} from 'src/script/Config';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {removeUrlParameters} from 'Util/UrlUtil';
import {supportsMLS} from 'Util/util';

import {DelayTimerService} from './DelayTimer/DelayTimer';
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

class E2EIHandler {
  private static instance: E2EIHandler | null = null;
  private readonly core = container.resolve(Core);
  private readonly userState = container.resolve(UserState);
  private timer: DelayTimerService;
  private discoveryUrl: string;
  private gracePeriodInMS: number;
  private currentStep: E2EIHandlerStep | null = E2EIHandlerStep.UNINITIALIZED;

  private constructor({discoveryUrl, gracePeriodInSeconds}: E2EIHandlerParams) {
    // ToDo: Do these values need to te able to be updated? Should we use a singleton with update fn?
    this.discoveryUrl = discoveryUrl;
    this.gracePeriodInMS = gracePeriodInSeconds * 1000;
    this.timer = DelayTimerService.getInstance({
      gracePeriodInMS: this.gracePeriodInMS,
      gracePeriodExpiredCallback: () => null,
      delayPeriodExpiredCallback: () => null,
    });
  }

  /**
   * Get the singleton instance of GracePeriodTimer or create a new one
   * For the first time, params are required to create the instance
   * After that, params are optional and can be used to update the grace period timer
   * @param params The params to create the grace period timer
   * @returns The singleton instance of GracePeriodTimer
   */
  public static getInstance(params?: E2EIHandlerParams) {
    if (!E2EIHandler.instance) {
      if (!params) {
        throw new Error('GracePeriodTimer is not initialized. Please call getInstance with params.');
      }
      E2EIHandler.instance = new E2EIHandler(params);
    }
    return E2EIHandler.instance;
  }

  /**
   * Reset the instance
   */
  public static resetInstance() {
    E2EIHandler.instance = null;
  }

  /**
   * @param E2EIHandlerParams The params to create the grace period timer
   */
  public updateParams({gracePeriodInSeconds, discoveryUrl}: E2EIHandlerParams) {
    this.gracePeriodInMS = gracePeriodInSeconds * 1000;
    this.discoveryUrl = discoveryUrl;
    this.timer.updateParams({
      gracePeriodInMS: this.gracePeriodInMS,
      gracePeriodExpiredCallback: () => null,
      delayPeriodExpiredCallback: () => null,
    });
    this.initialize();
  }

  public initialize(): void {
    if (this.isE2EIEnabled) {
      if (!this.core.service?.e2eIdentity?.hasActiveCertificate()) {
        this.showE2EINotificationMessage();
      }
    }
  }

  get isE2EIEnabled(): boolean {
    return supportsMLS() && Config.getConfig().FEATURE.ENABLE_E2EI;
  }

  private async storeRedirectTargetAndRedirect(targetURL: string): Promise<void> {
    // store the target url in the persistent oidc service store, since the oidc service will be destroyed after the redirect
    OIDCServiceStore.store.targetURL(targetURL);
    const oidcService = getOIDCServiceInstance();
    await oidcService.authenticate();
  }

  private async enrollE2EI() {
    try {
      // Notify user about E2EI enrollment in progress
      this.currentStep = E2EIHandlerStep.ENROLL;
      this.showLoadingMessage();
      let oAuthIdToken: string | undefined;

      // If the enrollment is in progress, we need to get the id token from the oidc service, since oauth should have already been completed
      if (this.core.service?.e2eIdentity?.isEnrollmentInProgress()) {
        const oidcService = getOIDCServiceInstance();
        const userData = await oidcService.handleAuthentication();
        if (!userData) {
          throw new Error('Received no user data from OIDC service');
        }
        oAuthIdToken = userData?.id_token;
      }

      const data = await this.core.enrollE2EI(
        this.userState.self().name(),
        this.userState.self().username(),
        this.discoveryUrl,
        oAuthIdToken,
      );

      // If the data is false or we dont get the ACMEChallenge, enrollment failed
      if (!data) {
        throw new Error('E2EI enrollment failed');
      }

      // Check if the data is a boolean, if not, we need to handle the oauth redirect
      if (typeof data !== 'boolean') {
        await this.storeRedirectTargetAndRedirect(data.target);
      }

      // Notify user about E2EI enrollment success
      // This setTimeout is needed because there was a timing with the success modal and the loading modal
      setTimeout(() => {
        removeCurrentModal();
      }, 0);

      this.currentStep = E2EIHandlerStep.SUCCESS;
      this.showSuccessMessage();
      // Remove the url parameters after enrollment
      removeUrlParameters();
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

    // Remove the url parameters of the failed enrollment
    removeUrlParameters();
    // Clear the oidc service progress
    const oidcService = getOIDCServiceInstance();
    await oidcService.clearProgress();
    // Clear the e2e identity progress
    this.core.service?.e2eIdentity?.clearAllProgress();

    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.ERROR,
      hideClose: true,
      primaryActionFn: () => {
        this.currentStep = E2EIHandlerStep.INITIALIZED;
        void this.enrollE2EI();
      },
      secondaryActionFn: () => {
        this.showE2EINotificationMessage();
      },
    });

    PrimaryModal.show(modalType, modalOptions);
  }

  private showE2EINotificationMessage(): void {
    // If the user has already started enrollment, don't show the notification. Instead, show the loading modal
    // This will occur after the redirect from the oauth provider
    if (this.core.service?.e2eIdentity?.isEnrollmentInProgress()) {
      void this.enrollE2EI();
      return;
    }

    // If the user has already snoozed the notification, don't show it again until the snooze period has expired
    if (this.currentStep !== E2EIHandlerStep.UNINITIALIZED && this.currentStep !== E2EIHandlerStep.SNOOZE) {
      return;
    }

    // Only initialize the timer when the it is uninitialized
    if (this.currentStep === E2EIHandlerStep.UNINITIALIZED) {
      this.timer.updateParams({
        gracePeriodInMS: this.gracePeriodInMS,
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
    if (!this.timer.isDelayTimerActive()) {
      const {modalOptions, modalType} = getModalOptions({
        hideSecondary: !this.timer.isSnoozeTimeAvailable(),
        primaryActionFn: () => this.enrollE2EI(),
        secondaryActionFn: () => {
          this.currentStep = E2EIHandlerStep.SNOOZE;
          this.timer.delayPrompt();
        },
        type: ModalType.ENROLL,
        hideClose: true,
      });
      PrimaryModal.show(modalType, modalOptions);
    }
  }
}

export {E2EIHandler};
