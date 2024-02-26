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

import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {TypedEventEmitter} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import {getCertificateDetails} from 'Util/certificateDetails';
import {getLogger} from 'Util/Logger';
import {formatDelayTime, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {removeUrlParameters} from 'Util/UrlUtil';

import {hasActiveCertificate, getActiveWireIdentity, MLSStatuses, WireIdentity} from './E2EIdentityVerification';
import {getModalOptions, ModalType} from './Modals';
import {OIDCService} from './OIDCService';
import {OIDCServiceStore} from './OIDCService/OIDCServiceStorage';
import {getSnoozeTime, shouldEnableSoftLock} from './SnoozableTimer/delay';
import {SnoozableTimer} from './SnoozableTimer/SnoozableTimer';

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

type Events = {
  identityUpdated: {enrollmentConfig: EnrollmentConfig; identity?: WireIdentity};
  initialized: {enrollmentConfig: EnrollmentConfig};
};

export type EnrollmentConfig = {
  timer: SnoozableTimer;
  discoveryUrl: string;
  gracePeriodInMs: number;
};

const historyTimeMS = 28 * TimeInMillis.DAY; //HT
export class E2EIHandler extends TypedEventEmitter<Events> {
  private logger = getLogger('E2EIHandler');
  private static instance: E2EIHandler | null = null;
  private readonly core = container.resolve(Core);
  private readonly userState = container.resolve(UserState);
  private config?: EnrollmentConfig;
  private oidcService?: OIDCService;
  public certificateTtl?: number;

  private get coreE2EIService() {
    const e2eiService = this.core.service?.e2eIdentity;

    if (!e2eiService) {
      throw new Error('E2EI Service not available');
    }

    return e2eiService;
  }

  private createOIDCService() {
    const key = this.core.key;
    const targetURL = OIDCServiceStore.get.targetURL();
    if (!key || !targetURL) {
      throw new Error('encryption key or targetURL not set');
    }
    return new OIDCService(key, targetURL);
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

  /**
   * Returns true if the current instance has been configured with team settings params
   * @returns
   */
  public isE2EIEnabled() {
    return !!this.config;
  }

  public async initialize({discoveryUrl, gracePeriodInSeconds}: E2EIHandlerParams) {
    const gracePeriodInMs = gracePeriodInSeconds * TIME_IN_MILLIS.SECOND;
    this.config = {
      discoveryUrl,
      gracePeriodInMs,
      timer: new SnoozableTimer({
        gracePeriodInMS: gracePeriodInMs,
        onGracePeriodExpired: () => this.processEnrollmentUponExpiry(),
        onSnoozeExpired: () => this.processEnrollmentUponExpiry(),
      }),
    };

    await this.coreE2EIService.initialize(discoveryUrl);

    this.emit('initialized', {enrollmentConfig: this.config});
    return this;
  }

  private async processEnrollmentUponExpiry() {
    const hasCertificate = await hasActiveCertificate();
    const enrollmentType = hasCertificate ? ModalType.CERTIFICATE_RENEWAL : ModalType.ENROLL;
    await this.startEnrollment(enrollmentType);
  }

  public async attemptEnrollment(): Promise<void> {
    const hasCertificate = await hasActiveCertificate();
    if (hasCertificate) {
      // If the client already has a certificate, we don't need to start the enrollment
      return;
    }
    return this.startEnrollment(ModalType.ENROLL);
  }

  public async attemptRenewal(): Promise<void> {
    const identity = await getActiveWireIdentity();

    if (!identity?.certificate) {
      return;
    }

    const {timeRemainingMS, certificateCreationTime} = getCertificateDetails(identity.certificate);

    if (!this.shouldRefresh(identity)) {
      return;
    }

    // Check if an enrollment is already in progress
    if (await this.coreE2EIService.isEnrollmentInProgress()) {
      return this.enroll();
    }

    const renewalTimeMS = this.calculateRenewalTime(timeRemainingMS, historyTimeMS, this.config!.gracePeriodInMs);
    const renewalPromptTime = new Date(certificateCreationTime + renewalTimeMS).getTime();
    const currentTime = new Date().getTime();

    // Check if it's time to renew the certificate
    if (currentTime >= renewalPromptTime) {
      await this.renewCertificate();
      this.emit('identityUpdated', {enrollmentConfig: this.config!, identity});
    }
  }

  private shouldRefresh(identity: WireIdentity) {
    const deviceIdentityStatus = identity.status;
    switch (deviceIdentityStatus) {
      case MLSStatuses.REVOKED:
        return false;
      default:
        return true;
    }
  }

  /**
   * Renew the certificate without user action
   */
  private async renewCertificate() {
    return this.enroll(true);
  }

  /**
   * Calculates the date when the E2EI certificate renewal should be prompted.
   *
   * @param timeRemainingMS - Certificate validity period in days (VP).
   * @param historyTime - Maximum time messages are stored in days (HT).
   * @param gracePeriod - Time to activate certificate in days (GP).
   * @returns The date to start prompting for certificate renewal.
   */
  private calculateRenewalTime(timeRemainingMS: number, historyTimeMS: number, gracePeriodMS: number) {
    // Calculate a random time between 0 and 1 days
    const randomTimeInMS = Math.random() * TimeInMillis.DAY; // Up to 24 hours in milliseconds

    // Calculate the total days to subtract
    const totalDaysToSubtract = historyTimeMS + gracePeriodMS + randomTimeInMS;

    // Calculate the renewal date
    const renewalDate = timeRemainingMS - totalDaysToSubtract;

    return renewalDate;
  }

  /**
   * Used to clean the state/storage after a failed run
   */
  private async cleanUp(includeOidcServiceUserData: boolean) {
    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    this.oidcService = this.createOIDCService();
    await this.oidcService.clearProgress(includeOidcServiceUserData);
    // Clear the e2e identity progress
    await this.coreE2EIService.clearAllProgress();
  }

  private async getUserData(
    silent: boolean,
    challengeData?: {keyAuth: string; challenge: {url: string; target: string}},
  ) {
    if (challengeData) {
      // If a challengeData is provided, that means we are at the beginning of the enrollment process
      // We need to first authenticate the user (either silently if we are renewing the certificate, or by redirection if it an initial enrollment)
      const {challenge, keyAuth} = challengeData;
      OIDCServiceStore.store.targetURL(challenge.target);
      const oidcService = this.createOIDCService();
      try {
        return await oidcService.authenticate(keyAuth, challenge.url, silent);
      } catch (error) {
        if (silent) {
          // if we attempted a silent login and it failed, we need to try again with a redirect
          return oidcService.authenticate(keyAuth, challenge.url, false);
        }
        throw error;
      }
    }

    const oidcService = this.createOIDCService();
    // If there is no challengeData, that means we have already authenticated the user and we just need to get the userdata
    return oidcService.getUser();
  }

  private async enroll(attemptSilentAuth = false) {
    if (!this.config) {
      throw new Error('Trying to enroll for E2EI without initializing the E2EIHandler');
    }
    try {
      // Notify user about E2EI enrolment in progress
      const isCertificateRenewal = await hasActiveCertificate();
      this.showLoadingMessage();

      const displayName = this.userState.self()?.name();
      const handle = this.userState.self()?.username();
      const teamId = this.userState.self()?.teamId;
      // If the user has no username or handle, we cannot enroll
      if (!displayName || !handle || !teamId) {
        throw new Error('Username, handle or teamId not found');
      }

      await this.core.enrollE2EI({
        discoveryUrl: this.config.discoveryUrl,
        displayName,
        handle,
        teamId,
        getOAuthToken: async authenticationChallenge => {
          const userData = await this.getUserData(attemptSilentAuth, authenticationChallenge);
          if (!userData) {
            throw new Error('No user data received');
          }
          return userData.id_token;
        },
        certificateTtl: this.certificateTtl,
      });

      // Notify user about E2EI enrolment success
      // This setTimeout is needed because there was a timing with the success modal and the loading modal
      setTimeout(removeCurrentModal, 0);

      // clear the oidc service progress/data and successful enrolment
      await this.cleanUp(false);

      await this.showSuccessMessage(isCertificateRenewal);
      this.emit('identityUpdated', {enrollmentConfig: this.config!});
    } catch (error) {
      this.logger.error('E2EI enrollment failed', error);

      setTimeout(removeCurrentModal, 0);
      await this.showErrorMessage();
    }
  }

  private showLoadingMessage(isCertificateRenewal = false): void {
    const {modalOptions, modalType} = getModalOptions({
      type: ModalType.LOADING,
      hideClose: true,
      extraParams: {
        isRenewal: isCertificateRenewal,
      },
    });
    PrimaryModal.show(modalType, modalOptions);
  }

  private async showSuccessMessage(isCertificateRenewal = false) {
    return new Promise<void>(resolve => {
      const {modalOptions, modalType} = getModalOptions({
        type: ModalType.SUCCESS,
        hideClose: false,
        extraParams: {
          isRenewal: isCertificateRenewal,
        },
        primaryActionFn: resolve,
        secondaryActionFn: () => {
          amplify.publish(WebAppEvents.PREFERENCES.MANAGE_DEVICES);
          resolve();
        },
      });
      PrimaryModal.show(modalType, modalOptions);
    });
  }

  private async showErrorMessage(): Promise<void> {
    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    await this.oidcService?.clearProgress();
    // Clear the e2e identity progress
    await this.coreE2EIService.clearAllProgress();

    const disableSnooze = await shouldEnableSoftLock(this.config!);

    return new Promise<void>(resolve => {
      const {modalOptions, modalType} = getModalOptions({
        type: ModalType.ERROR,
        hideClose: true,
        hideSecondary: disableSnooze,
        primaryActionFn: async () => {
          await this.enroll();
          resolve();
        },
        secondaryActionFn: async () => {
          this.config?.timer.snooze();
          this.showSnoozeConfirmationModal();
          resolve();
        },
        extraParams: {
          isGracePeriodOver: disableSnooze,
        },
      });

      PrimaryModal.show(modalType, modalOptions);
    });
  }

  private async showEnrollmentModal(
    modalType: ModalType.ENROLL | ModalType.CERTIFICATE_RENEWAL,
    config: EnrollmentConfig,
  ): Promise<void> {
    // Show the modal with the provided modal type
    const disableSnooze = await shouldEnableSoftLock(config);
    return new Promise<void>(resolve => {
      const {modalOptions, modalType: determinedModalType} = getModalOptions({
        hideSecondary: disableSnooze,
        primaryActionFn: async () => {
          await this.enroll();
          resolve();
        },
        secondaryActionFn: () => {
          this.config?.timer.snooze();
          this.showSnoozeConfirmationModal();
          resolve();
        },
        extraParams: {
          isGracePeriodOver: disableSnooze,
        },
        type: modalType,
        hideClose: true,
      });
      PrimaryModal.show(determinedModalType, modalOptions);
    });
  }

  private showSnoozeConfirmationModal() {
    // Show the modal with the provided modal type
    const {modalOptions, modalType: determinedModalType} = getModalOptions({
      type: ModalType.SNOOZE_REMINDER,
      hideClose: true,
      extraParams: {
        delayTime: formatDelayTime(getSnoozeTime(this.config!.gracePeriodInMs)),
      },
    });
    PrimaryModal.show(determinedModalType, modalOptions);
  }

  private async startEnrollment(enrollmentType: ModalType.CERTIFICATE_RENEWAL | ModalType.ENROLL): Promise<void> {
    // If the user has already started enrolment, don't show the notification. Instead, show the loading modal
    // This will occur after the redirect from the oauth provider
    if (await this.coreE2EIService.isEnrollmentInProgress()) {
      return this.enroll();
    }

    if (this.config?.timer.isSnoozableTimerActive()) {
      // If the user has snoozed, no need to show the notification modal
      return;
    }

    // If the timer is not active, show the notification modal
    if (this.config) {
      return this.showEnrollmentModal(enrollmentType, this.config);
    }
  }
}
