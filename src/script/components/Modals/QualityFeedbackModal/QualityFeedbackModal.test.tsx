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

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {CALL_QUALITY_FEEDBACK_KEY} from 'Components/Modals/QualityFeedbackModal/constants';
import {RatingListLabel} from 'Components/Modals/QualityFeedbackModal/typings';
import {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {User} from 'Repositories/entity/User';
import {EventName} from 'Repositories/tracking/EventName';
import {Segmentation} from 'Repositories/tracking/Segmentation';
import {UserState} from 'Repositories/user/UserState';
import {TestFactory} from 'test/helper/TestFactory';
import {t} from 'Util/LocalizerUtil';

import {QualityFeedbackModal} from './QualityFeedbackModal';

import {
  buildMediaDevicesHandler,
  createConversation,
  createSelfParticipant,
  withIntl,
  withTheme,
} from '../../../auth/util/test/TestUtil';

jest.mock('@wireapp/api-client/lib/team');

jest.mock('Repositories/tracking/Telemetry.helpers', () => ({
  isTelemetryEnabledAtCurrentEnvironment: () => true,
}));

describe('QualityFeedbackModal', () => {
  let callingRepository: CallingRepository;
  let call: Call;
  const testFactory = new TestFactory();
  const user = new User('userId', 'domain');

  beforeEach(() => {
    jest.clearAllMocks();
    spyOn(container.resolve(UserState), 'self').and.returnValue(user);
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
    render(withTheme(withIntl(<QualityFeedbackModal callingRepository={callingRepository} />)));

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

    spyOn(amplify, 'publish').and.returnValue({
      eventKey: WebAppEvents.ANALYTICS.EVENT,
      type: EventName.CALLING.QUALITY_REVIEW,
      value: {
        [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.DISMISSED,
      },
    });

    fireEvent.click(getByText(t('qualityFeedback.skip')));

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

    spyOn(amplify, 'publish').and.returnValue({
      eventKey: WebAppEvents.ANALYTICS.EVENT,
      type: EventName.CALLING.QUALITY_REVIEW,
      value: {
        [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.ANSWERED,
      },
    });

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

    const checkbox = getByText(t('qualityFeedback.doNotAskAgain'));
    fireEvent.click(checkbox);
    fireEvent.click(getByText('5'));

    act(() => {
      const storedData = JSON.parse(localStorage.getItem(CALL_QUALITY_FEEDBACK_KEY) || '{}');
      expect(storedData['userId']).toBeNull();
    });
  });
});
