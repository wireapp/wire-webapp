/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';
import {AxiosResponse} from 'axios';

import {AuthRepositoryE2E} from './authRepository.e2e';
import {BrigRepositoryE2E} from './brigRepository.e2e';
import {CallingServiceClientE2E} from './callingServiceClient.e2e';
import {ConnectionRepositoryE2E} from './connectionRepository.e2e';
import {ConversationRepositoryE2E} from './ConversationRepository';
import {FeatureConfigRepositoryE2E} from './featureConfigRepository.e2e';
import {InbucketClientE2E} from './inbucketClient.e2e';
import {PropertiesRepositoryE2E} from './propertiesRepostitory.e2e';
import {TeamRepositoryE2E} from './teamRepository.e2e';
import {TestServiceClientE2E} from './testServiceClient.e2e';
import {UserRepositoryE2E} from './userRepository.e2e';

import {User} from '../data/user';

export class ApiManagerE2E {
  user: UserRepositoryE2E;
  auth: AuthRepositoryE2E;
  brig: BrigRepositoryE2E;
  testService: TestServiceClientE2E;
  team: TeamRepositoryE2E;
  conversation: ConversationRepositoryE2E;
  featureConfig: FeatureConfigRepositoryE2E;
  inbucket: InbucketClientE2E;
  connection: ConnectionRepositoryE2E;
  callingService: CallingServiceClientE2E;
  properties: PropertiesRepositoryE2E;

  constructor() {
    this.user = new UserRepositoryE2E();
    this.auth = new AuthRepositoryE2E();
    this.brig = new BrigRepositoryE2E();
    this.testService = new TestServiceClientE2E();
    this.team = new TeamRepositoryE2E();
    this.conversation = new ConversationRepositoryE2E();
    this.featureConfig = new FeatureConfigRepositoryE2E();
    this.inbucket = new InbucketClientE2E();
    this.connection = new ConnectionRepositoryE2E();
    this.callingService = new CallingServiceClientE2E();
    this.properties = new PropertiesRepositoryE2E();
  }

  async addDevicesToUser(user: User, numberOfDevices: number) {
    const token = user.token ?? (await this.auth.loginUser(user)).data.access_token;
    const isMlsEnabled = await this.featureConfig.isFeatureEnabled(token, FEATURE_KEY.MLS);
    for (let i = 0; i < numberOfDevices; i++) {
      const deviceName = `Device${i + 1}`;
      const response = await this.testService.createInstance(user.password, user.email, deviceName, isMlsEnabled);
      user.devices.push(response.instanceId);
    }
  }

  async sendMessageToPersonalConversation(sender: User, receiver: User, text: string) {
    const senderToken = sender.token ?? (await this.auth.loginUser(sender)).data.access_token;
    const receiverId = receiver.id ?? (await this.auth.loginUser(receiver)).data.user;
    const conversationId = await this.conversation.getMLSConversationWithUser(senderToken, receiverId);

    // Using the first device from the list of devices
    await this.testService.sendText(sender.devices[0], conversationId, text);
  }

  async createPersonalUser(user: User, invitationCode?: string) {
    // 1. Register
    const registerResponse = await this.auth.registerUser(user, invitationCode);
    const zuidCookie = this.extractCookieFromRegisterResponse(registerResponse);

    if (!invitationCode) {
      // 2. Get activation code via brig
      const activationCode = await this.brig.getActivationCodeForEmail(user.email);

      // 3. Activate Account
      await this.auth.activateAccount(user.email, activationCode);
    }

    // 4. Request Access Token
    user.token = await this.auth.requestAccessToken(zuidCookie);

    // 5. Set Unique Username (Handle)
    await this.user.setUniqueUsername(user.username, user.token);
  }

  async deletePersonalUser(user: User) {
    await this.user.deleteUser(user.password, user.token);
  }

  /**
   * Long polling to see if a conference calling feature is available for a given team.
   * This is to wait until stripe/ibis has set free account restrictions after team creation.
   *
   * @param token - The access token of the user.
   * @returns A promise that resolves to true if the feature is enabled, false otherwise.
   */
  async waitForFeatureToBeEnabled(featureKey: FEATURE_KEY, teamId: string, token?: string): Promise<boolean> {
    if (!token) {
      throw new Error('Token is required to check for feature');
    }

    const timeout = 300000;
    const interval = 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const isEnabled = await this.featureConfig.isFeatureEnabled(token, featureKey);
      if (isEnabled) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`${featureKey} feature is not enabled after waiting for ${timeout / 1000} seconds`);
  }

  async createTeamOwner(user: User, teamName: string) {
    // 1. Book email
    await this.auth.bookEmail(user.email);

    // 2. Get activation code
    const activationCode = await this.brig.getActivationCodeForEmail(user.email);

    // 3. Register user
    const registerResponse = await this.auth.registerTeamOwner(user, teamName, activationCode);
    const zuidCookie = this.extractCookieFromRegisterResponse(registerResponse);

    // 4. Request Access Token
    user.token = await this.auth.requestAccessToken(zuidCookie);

    // 5. Set Unique Username (Handle)
    await this.user.setUniqueUsername(user.username, user.token);

    return {
      ...user,
      teamId: registerResponse.data.team ?? '',
      qualifiedId: {
        domain: '',
        id: registerResponse.data.id,
      },
      id: registerResponse.data.id,
    };
  }

  async connectUsers(connectionInitiator: User, connectionReceiver: User) {
    if (!connectionInitiator.token) {
      throw new Error(`User1 ${connectionInitiator.username} has no token and can't be used for connection`);
    }
    if (!connectionReceiver.qualifiedId?.id.length) {
      throw new Error(`User2 ${connectionReceiver.username} has no qualifiedId and can't be used for connection`);
    }
    await this.connection.sendConnectionRequest(connectionInitiator.token, connectionReceiver.qualifiedId.id);
    await this.acceptConnectionRequest(connectionReceiver);
  }

  async acceptConnectionRequest(user: User) {
    const token = user.token ?? (await this.auth.loginUser(user)).data.access_token;
    const listOfConnections = await this.connection.getConnectionsList(token);
    await this.connection.acceptConnectionRequest(token, listOfConnections.data.connections[0].to);
  }

  async enableConferenceCallingFeature(teamId: string) {
    await this.brig.unlockConferenceCallingFeature(teamId);
    await this.brig.enableConferenceCallingBackdoorViaBackdoorTeam(teamId);
  }

  async enableChannelsFeature(teamId: string) {
    await this.brig.unlockChannelFeature(teamId);
    await this.brig.enableChannelsFeature(teamId);
  }

  private extractCookieFromRegisterResponse(registerResponse: AxiosResponse): string {
    try {
      return registerResponse.headers['set-cookie']!.find((cookieStr: string) => cookieStr.startsWith('zuid='))!;
    } catch (error) {
      throw new Error(
        `Error extracting zuid cookie from register response: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
