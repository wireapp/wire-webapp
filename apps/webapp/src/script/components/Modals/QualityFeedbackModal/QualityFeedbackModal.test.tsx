/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {render, fireEvent, act} from '@testing-library/react';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';

import {TestFactory} from 'test/helper/TestFactory';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {CALL_QUALITY_FEEDBACK_KEY} from 'Components/Modals/QualityFeedbackModal/constants';
import {RatingListLabel} from 'Components/Modals/QualityFeedbackModal/typings';
import {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {User} from 'Repositories/entity/User';
import {EventName} from 'Repositories/tracking/eventName';
import {Segmentation} from 'Repositories/tracking/segmentation';
import {UserState} from 'Repositories/user/userState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {QualityFeedbackModal} from './QualityFeedbackModal';
import {translateForTest} from 'Util/test/translateForTest';

import {
  buildMediaDevicesHandler,
  createConversation,
  createSelfParticipant,
  withIntl,
  withTheme,
} from '../../../auth/util/test/TestUtil';

jest.mock('Repositories/tracking/telemetry.helpers', () => ({
  isTelemetryEnabledAtCurrentEnvironment: () => true,
}));

describe('QualityFeedbackModal', () => {
  function translateQualityFeedbackForTest(translationKey: Parameters<typeof translateForTest>[0]): string {
    switch (translationKey) {
      case 'qualityFeedback.skip':
        return 'Skip';
      case 'qualityFeedback.doNotAskAgain':
        return "Don't ask again";
      default:
        return translateForTest(translationKey);
    }
  }

  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );
  let callingRepository: CallingRepository;
  let call: Call;
  const testFactory = new TestFactory();
  const user = new User('userId', 'domain', translateForTest);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(container.resolve(UserState), 'self').mockReturnValue(user);
  });

  beforeAll(() => {
    return testFactory.exposeCallingActors().then(injectedCallingRepository => {
      callingRepository = injectedCallingRepository;
      const conversation = createConversation();
      const selfParticipant = createSelfParticipant();
      const selfUserId = callingRepository['selfUser']?.qualifiedId!;

      call = new Call(
        selfUserId,
        conversation,
        CONV_TYPE.CONFERENCE,
        selfParticipant,
        CALL_TYPE.NORMAL,
        buildMediaDevicesHandler(),
      );

      callingRepository['conversationState'].conversations.push(conversation);
      callingRepository['callState'].calls([call]);
    });
  });

  const renderQualityFeedbackModal = () =>
    render(
      withTheme(
        withIntl(
          <QualityFeedbackModal callingRepository={callingRepository} translate={translateQualityFeedbackForTest} />,
        ),
      ),
      {
        wrapper: rootProviderWrapper,
      },
    );

  it('should not render if qualityFeedbackModalShown is false', () => {
    renderQualityFeedbackModal();

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(false);
    });

    expect(useCallAlertState.getState().qualityFeedbackModalShown).toBe(false);
  });

  it('should render correctly when qualityFeedbackModalShown is true', () => {
    renderQualityFeedbackModal();

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
      useCallAlertState.getState().setConversationId(call.conversation.qualifiedId);
    });

    expect(useCallAlertState.getState().qualityFeedbackModalShown).toBe(true);
  });

  it('should close modal on skip', () => {
    const {getByText} = renderQualityFeedbackModal();

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
      useCallAlertState.getState().setConversationId(call.conversation.qualifiedId);
    });

    jest.spyOn(amplify, 'publish').mockReturnValue({
      eventKey: WebAppEvents.ANALYTICS.EVENT,
      type: EventName.CALLING.QUALITY_REVIEW,
      value: {
        [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.DISMISSED,
      },
    } as never);

    fireEvent.click(getByText('Skip'));

    expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.QUALITY_REVIEW, {
      [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.DISMISSED,
      [Segmentation.CALL.DURATION]: 0,
      [Segmentation.CALL.PARTICIPANTS]: 0,
      [Segmentation.CALL.SCREEN_SHARE]: false,
      [Segmentation.CALL.VIDEO]: false,
    });

    expect(useCallAlertState.getState().qualityFeedbackModalShown).toBe(false);
  });

  it('should send quality feedback and close modal on rating click', () => {
    const {getByText} = renderQualityFeedbackModal();

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
      useCallAlertState.getState().setConversationId(call.conversation.qualifiedId);
    });

    jest.spyOn(amplify, 'publish').mockReturnValue({
      eventKey: WebAppEvents.ANALYTICS.EVENT,
      type: EventName.CALLING.QUALITY_REVIEW,
      value: {
        [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.ANSWERED,
      },
    } as never);

    fireEvent.click(getByText('5'));

    expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.QUALITY_REVIEW, {
      [Segmentation.CALL.SCORE]: 5,
      [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.ANSWERED,
      [Segmentation.CALL.DURATION]: 0,
      [Segmentation.CALL.PARTICIPANTS]: 0,
      [Segmentation.CALL.SCREEN_SHARE]: false,
      [Segmentation.CALL.VIDEO]: false,
    });

    expect(useCallAlertState.getState().qualityFeedbackModalShown).toBe(false);
  });

  it('should store the doNotAskAgain state in localStorage', () => {
    const {getByText} = renderQualityFeedbackModal();

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
      useCallAlertState.getState().setConversationId(call.conversation.qualifiedId);
    });

    const checkbox = getByText("Don't ask again");
    fireEvent.click(checkbox);
    fireEvent.click(getByText('5'));

    act(() => {
      const storedQualityFeedbackState = localStorage.getItem(CALL_QUALITY_FEEDBACK_KEY);
      const storedData = JSON.parse(storedQualityFeedbackState ?? '{}');
      expect(storedData['userId']).toBeUndefined();
    });
  });
});
