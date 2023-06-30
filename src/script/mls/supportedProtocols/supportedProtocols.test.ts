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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {FeatureList} from '@wireapp/api-client/lib/team';
import {act} from 'react-dom/test-utils';

import {TestFactory} from 'test/helper/TestFactory';

import * as supportedProtocols from './evaluateSelfSupportedProtocols/evaluateSelfSupportedProtocols';
import {initialisePeriodicSelfSupportedProtocolsCheck} from './supportedProtocols';

const testFactory = new TestFactory();

describe('supportedProtocols', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it.each([
    [[ConversationProtocol.PROTEUS], [ConversationProtocol.PROTEUS, ConversationProtocol.MLS]],
    [[ConversationProtocol.PROTEUS, ConversationProtocol.MLS], [ConversationProtocol.PROTEUS]],
    [[ConversationProtocol.PROTEUS], [ConversationProtocol.MLS]],
  ])('Updates the list of supported protocols', async (initialProtocols, evaluatedProtocols) => {
    const userRepository = await testFactory.exposeUserActors();
    const selfUser = userRepository['userState'].self();

    selfUser.supportedProtocols(initialProtocols);

    const mockFeatureList = {} as FeatureList;

    //this funciton is tested standalone in evaluateSelfSupportedProtocols.test.ts
    jest.spyOn(supportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(new Set(evaluatedProtocols));
    jest.spyOn(userRepository, 'changeSupportedProtocols');

    await initialisePeriodicSelfSupportedProtocolsCheck(selfUser, mockFeatureList, {userRepository});

    expect(userRepository.changeSupportedProtocols).toHaveBeenCalledWith(evaluatedProtocols);
    expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
  });

  it("Does not update supported protocols if they didn't change", async () => {
    const userRepository = await testFactory.exposeUserActors();
    const selfUser = userRepository['userState'].self();

    const initialProtocols = [ConversationProtocol.PROTEUS];
    selfUser.supportedProtocols(initialProtocols);

    const evaluatedProtocols = [ConversationProtocol.PROTEUS];

    const mockFeatureList = {} as FeatureList;

    //this funciton is tested standalone in evaluateSelfSupportedProtocols.test.ts
    jest.spyOn(supportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(new Set(evaluatedProtocols));
    jest.spyOn(userRepository, 'changeSupportedProtocols');

    await initialisePeriodicSelfSupportedProtocolsCheck(selfUser, mockFeatureList, {userRepository});
    expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
    expect(userRepository.changeSupportedProtocols).not.toHaveBeenCalled();
  });

  it('Re-evaluates supported protocols every 24h', async () => {
    const userRepository = await testFactory.exposeUserActors();
    const selfUser = userRepository['userState'].self();

    const initialProtocols = [ConversationProtocol.PROTEUS];
    selfUser.supportedProtocols(initialProtocols);

    const evaluatedProtocols = [ConversationProtocol.PROTEUS];

    const mockFeatureList = {} as FeatureList;

    //this funciton is tested standalone in evaluateSelfSupportedProtocols.test.ts
    jest.spyOn(supportedProtocols, 'evaluateSelfSupportedProtocols').mockResolvedValueOnce(new Set(evaluatedProtocols));
    jest.spyOn(userRepository, 'changeSupportedProtocols');

    await initialisePeriodicSelfSupportedProtocolsCheck(selfUser, mockFeatureList, {userRepository});
    expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols);
    expect(userRepository.changeSupportedProtocols).not.toHaveBeenCalled();

    const evaluatedProtocols2 = [ConversationProtocol.MLS];
    jest
      .spyOn(supportedProtocols, 'evaluateSelfSupportedProtocols')
      .mockResolvedValueOnce(new Set(evaluatedProtocols2));

    await act(async () => {
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    });

    expect(selfUser.supportedProtocols()).toEqual(evaluatedProtocols2);
    expect(userRepository.changeSupportedProtocols).toHaveBeenCalledWith(evaluatedProtocols2);
  });
});
