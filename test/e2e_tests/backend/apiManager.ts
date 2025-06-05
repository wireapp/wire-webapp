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

import {AxiosResponse} from 'axios';

import {AuthRepository} from './authRepository';
import {BrigRepository} from './brigRepository';
import {ConversationRepository} from './conversationRepository';
import {TeamRepository} from './teamRepository';
import {TestServiceClient} from './testServiceClient';
import {User} from './user';
import {UserRepository} from './userRepository';

export class ApiManager {
  user: UserRepository;
  auth: AuthRepository;
  brig: BrigRepository;
  kalium: TestServiceClient;
  team: TeamRepository;
  conversation: ConversationRepository;

  constructor() {
    this.user = new UserRepository();
    this.auth = new AuthRepository();
    this.brig = new BrigRepository();
    this.kalium = new TestServiceClient();
    this.team = new TeamRepository();
    this.conversation = new ConversationRepository();
  }

  public async createPersonalUser(user: User, invitationCode?: string) {
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

  public async createTeamOwner(user: User, teamName: string) {
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
