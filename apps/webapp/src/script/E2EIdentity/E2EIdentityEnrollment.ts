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

import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';
import {LowPrecisionTaskScheduler} from '@wireapp/core/lib/util/LowPrecisionTaskScheduler';
import {amplify} from 'amplify';
import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {SigninResponse} from 'oidc-client-ts';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {UserState} from 'Repositories/user/UserState';
import {Core} from 'src/script/service/CoreSingleton';
import {container} from 'tsyringe';
import {getLogger} from 'Util/Logger';
import {formatDelayTime, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {removeUrlParameters} from 'Util/UrlUtil';

import {TypedEventEmitter} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {
  hasActiveCertificate,
  getActiveWireIdentity,
  isFreshMLSSelfClient,
  MLSStatuses,
} from './E2EIdentityVerification';
import {getEnrollmentStore} from './Enrollment.store';
import {getEnrollmentTimer, hasGracePeriodStartedForSelfClient} from './EnrollmentTimer';
import {getModalOptions, ModalType} from './Modals';
import {OIDCService} from './OIDCService';
import {OIDCServiceStore} from './OIDCService/OIDCServiceStorage';

interface E2EIHandlerParams {
  discoveryUrl: string;
  gracePeriodInSeconds: number;
}

export type E2EIDeviceStatus = 'valid' | 'locked';
type Events = {
  deviceStatusUpdated: {status: E2EIDeviceStatus};
};

export type EnrollmentConfig = {
  discoveryUrl: string;
  gracePeriodInMs: number;
};

export class E2EIHandler extends TypedEventEmitter<Events> {
  private logger = getLogger('E2EIHandler');
  private static instance: E2EIHandler | null = null;
  private readonly core = container.resolve(Core);
  private readonly userState = container.resolve(UserState);
  #config?: EnrollmentConfig;
  private oidcService?: OIDCService;
  public certificateTtl?: number;

  private get coreE2EIService() {
    const e2eiService = this.core.service?.e2eIdentity;

    if (!e2eiService) {
      throw new Error('E2EI Service not available');
    }

    return e2eiService;
  }

  private get enrollmentStore() {
    const selfUserId = this.userState.self()?.qualifiedId;

    if (!selfUserId) {
      throw new Error('Self user not found');
    }

    const enrollmentStore = getEnrollmentStore(selfUserId, this.core.clientId);
    return enrollmentStore;
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

  private get config() {
    if (!this.#config) {
      throw new Error('Trying to access config without initializing the E2EIHandler');
    }
    return this.#config;
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
    return !!this.#config;
  }

  /** will initialize the e2ei enrollment handler eventually triggering an enrollment flow if the device is a fresh new one */
  public async initialize({discoveryUrl, gracePeriodInSeconds}: E2EIHandlerParams) {
    const gracePeriodInMs = gracePeriodInSeconds * TIME_IN_MILLIS.SECOND;
    this.#config = {
      discoveryUrl,
      gracePeriodInMs,
    };

    await this.coreE2EIService.initialize(discoveryUrl);

    const isFreshClient = await isFreshMLSSelfClient();

    if (await this.coreE2EIService.isEnrollmentInProgress()) {
      // If we have an enrollment in progress, we can just finish it (meaning we are coming back from an idp redirect)
      if (this.wasJustRedirected()) {
        // We should not allow to snooze the enorollment if the client is still fresh and the user is coming back from an idp redirect
        await this.enroll({snoozable: !isFreshClient});
      } else {
        // If we have an enrollment in progress but we are not coming back from an idp redirect, we need to clear the progress and start over
        await this.coreE2EIService.clearAllProgress();
        await this.startEnrollment(ModalType.ENROLL, !isFreshClient);
      }
    } else if (isFreshClient) {
      // When the user logs in to a new device in an environment that has e2ei enabled, they should be forced to enroll
      await this.startEnrollment(ModalType.ENROLL, false);
    }
    return this;
  }

  public wasJustRedirected() {
    const searchParams = new URLSearchParams(window.location.search);

    const {state, session_state, code} = new SigninResponse(searchParams);

    return !!state && !!session_state && !!code;
  }

  public async hasGracePeriodStartedForSelfClient(): Promise<boolean> {
    const identity = await getActiveWireIdentity();
    return hasGracePeriodStartedForSelfClient(
      identity,
      this.enrollmentStore.get.e2eiActivatedAt(),
      this.config.gracePeriodInMs,
    );
  }

  /**
   * Will initiate the timer that will regularly prompt the user to enroll (or to renew the certificate if it is about to expire)
   * - If the client is a brand new device (never logged in before) and the feature is enabled, the timer will start immediately, and the user will be forced to enroll
   * - If the client is an existing MLS device, and the E2EI feature was just activated, the timer will start immediately (but the grace period will be respected)
   * - If the client has already enrolled, but the cert is about to expire, they will be reminded to renew the certificate during the grace period
   * - If the client has already enrolled, and the cert has already expired, they will be forced to enroll
   * @returns the delay under which the next enrollment/renewal modal will be prompted
   */
  public async startTimers() {
    // We store the first time the user was prompted with the enrollment modal
    const storedE2eActivatedAt = this.enrollmentStore.get.e2eiActivatedAt();
    const e2eActivatedAt = storedE2eActivatedAt || Date.now();
    this.enrollmentStore.store.e2eiActivatedAt(e2eActivatedAt);

    const timerKey = 'enrollmentTimer';
    const identity = await getActiveWireIdentity();

    const isNotActivated = identity?.status === MLSStatuses.NOT_ACTIVATED;
    const isBasicDevice = identity?.credentialType === CredentialType.Basic;
    const isFirstE2EIActivation = !storedE2eActivatedAt && (!identity || isNotActivated || isBasicDevice);

    const {firingDate: computedFiringDate, isSnoozable} = getEnrollmentTimer(
      identity,
      e2eActivatedAt,
      this.config.gracePeriodInMs,
    );

    const task = async (isSnoozable: boolean) => {
      await this.processEnrollmentUponExpiry(isSnoozable, () => this.enrollmentStore.clear.timer());
    };

    const storedFiringDate = this.enrollmentStore.get.timer();
    const firingDate = isFirstE2EIActivation ? Date.now() : storedFiringDate || computedFiringDate;
    this.enrollmentStore.store.timer(firingDate);

    if (firingDate <= Date.now()) {
      // We want to automatically trigger the enrollment modal if it's a devices in team that just activated e2eidentity
      // Or if the timer is supposed to fire now
      void task(isSnoozable);
    } else {
      LowPrecisionTaskScheduler.addTask({
        key: timerKey,
        task: () => {
          const {isSnoozable} = getEnrollmentTimer(identity, e2eActivatedAt, this.config.gracePeriodInMs);
          return task(isSnoozable);
        },
        firingDate: firingDate,
        intervalDelay: TIME_IN_MILLIS.SECOND * 10,
      });
    }
    return firingDate - Date.now();
  }

  private async processEnrollmentUponExpiry(snoozable: boolean, onUserAction: () => void) {
    const hasCertificate = await hasActiveCertificate();
    const enrollmentType = hasCertificate ? ModalType.CERTIFICATE_RENEWAL : ModalType.ENROLL;
    this.emit('deviceStatusUpdated', {status: snoozable ? 'valid' : 'locked'});
    await this.startEnrollment(enrollmentType, snoozable, onUserAction);
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

  public async enroll({snoozable = true, resetTimers = false}: {snoozable?: boolean; resetTimers?: boolean} = {}) {
    if (resetTimers) {
      this.enrollmentStore.clear.timer();
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
          // For now we cannot do silent login as keycloak refresh token extension is not supported
          // We can fix this condition when the plugin is enabled on keycloak
          const silent = false && isCertificateRenewal;
          const userData = await this.getUserData(silent, authenticationChallenge);
          if (!userData) {
            throw new Error('No user data received');
          }
          return userData.id_token;
        },
        certificateTtl: this.certificateTtl,
        getAllConversations: () => {
          const conversationState = container.resolve(ConversationState);
          const conversations = conversationState.conversations().map(conversation => ({
            group_id: conversation.groupId ?? '',
          }));
          return Promise.resolve(conversations);
        },
      });

      // Notify user about E2EI enrolment success
      // This setTimeout is needed because there was a timing with the success modal and the loading modal
      setTimeout(removeCurrentModal, 0);

      // clear the oidc service progress/data and successful enrolment
      await this.cleanUp(false);
      this.emit('deviceStatusUpdated', {status: 'valid'});

      if (isCertificateRenewal) {
        await this.startTimers();
      }

      await this.showSuccessMessage(isCertificateRenewal);
    } catch (error) {
      this.logger.error('E2EI enrollment failed', error);

      setTimeout(removeCurrentModal, 0);
      await this.showErrorMessage(snoozable);
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

  private async showErrorMessage(snoozable: boolean): Promise<void> {
    // Remove the url parameters of the failed enrolment
    removeUrlParameters();
    // Clear the oidc service progress
    await this.oidcService?.clearProgress();
    // Clear the e2e identity progress
    await this.coreE2EIService.clearAllProgress();

    return new Promise<void>(resolve => {
      const {modalOptions, modalType} = getModalOptions({
        type: ModalType.ERROR,
        hideClose: true,
        hideSecondary: !snoozable,
        primaryActionFn: async () => {
          await this.enroll({snoozable});
          resolve();
        },
        secondaryActionFn: async () => {
          const delay = await this.startTimers();
          if (delay > 0) {
            this.showSnoozeConfirmationModal(delay);
          }
          resolve();
        },
        extraParams: {
          isGracePeriodOver: !snoozable,
        },
      });

      PrimaryModal.show(modalType, modalOptions);
    });
  }

  private async startEnrollment(
    modalType: ModalType.ENROLL | ModalType.CERTIFICATE_RENEWAL,
    snoozable: boolean,
    onUserAction?: () => void,
  ): Promise<void> {
    return new Promise<void>(resolve => {
      const {modalOptions, modalType: determinedModalType} = getModalOptions({
        hideSecondary: !snoozable,
        primaryActionFn: async () => {
          onUserAction?.();
          await this.enroll({snoozable});
          resolve();
        },
        secondaryActionFn: async () => {
          onUserAction?.();
          const delay = await this.startTimers();
          if (delay > 0) {
            this.showSnoozeConfirmationModal(delay);
          }
          resolve();
        },
        extraParams: {
          isGracePeriodOver: !snoozable,
        },
        type: modalType,
        hideClose: true,
      });
      PrimaryModal.show(determinedModalType, modalOptions);
    });
  }

  private showSnoozeConfirmationModal(delay: number) {
    // Show the modal with the provided modal type
    const {modalOptions, modalType: determinedModalType} = getModalOptions({
      type: ModalType.SNOOZE_REMINDER,
      hideClose: true,
      extraParams: {
        delayTime: formatDelayTime(delay),
      },
    });
    PrimaryModal.show(determinedModalType, modalOptions);
  }
}
