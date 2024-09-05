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

import {WebAppEvents} from '@wireapp/webapp-events';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {CALL_QUALITY_FEEDBACK_KEY} from 'Components/Modals/QualityFeedbackModal/constants';
import {RatingListLabel} from 'Components/Modals/QualityFeedbackModal/typings';

import {QualityFeedbackModal} from './QualityFeedbackModal';

import {withIntl, withTheme} from '../../../auth/util/test/TestUtil';
import {User} from '../../../entity/User';
import {EventName} from '../../../tracking/EventName';
import {Segmentation} from '../../../tracking/Segmentation';
import {UserState} from '../../../user/UserState';

jest.mock('../../../tracking/Countly.helpers', () => ({
  isCountlyEnabledAtCurrentEnvironment: () => true,
}));

describe('QualityFeedbackModal', () => {
  const user = new User('userId', 'domain');

  beforeEach(() => {
    jest.clearAllMocks();
    spyOn(container.resolve(UserState), 'self').and.returnValue(user);
  });

  it('should not render if qualityFeedBackModalShown is false', () => {
    const {setQualityFeedbackModalShown} = useCallAlertState.getState();
    setQualityFeedbackModalShown(false);

    const {container} = render(<QualityFeedbackModal />);
    expect(container.firstChild).toBeNull();
  });

  it('should render correctly when qualityFeedBackModalShown is true', () => {
    render(withTheme(withIntl(<QualityFeedbackModal />)));

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
    });

    expect(useCallAlertState.getState().qualityFeedBackModalShown).toBe(true);
  });

  it('should close modal on skip', () => {
    const {getByText} = render(withTheme(withIntl(<QualityFeedbackModal />)));

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
    });

    spyOn(amplify, 'publish').and.returnValue({
      eventKey: WebAppEvents.ANALYTICS.EVENT,
      type: EventName.CALLING.QUALITY_REVIEW,
      value: {
        [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.DISMISSED,
      },
    });

    fireEvent.click(getByText('qualityFeedback.skip'));

    expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.QUALITY_REVIEW, {
      [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.DISMISSED,
    });

    expect(useCallAlertState.getState().qualityFeedBackModalShown).toBe(false);
  });

  it('should send quality feedback and close modal on rating click', () => {
    const {getByText} = render(withTheme(withIntl(<QualityFeedbackModal />)));

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
    });

    spyOn(amplify, 'publish').and.returnValue({
      eventKey: WebAppEvents.ANALYTICS.EVENT,
      type: EventName.CALLING.QUALITY_REVIEW,
      value: {
        [Segmentation.CALL.SCORE]: 5,
        [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.ANSWERED,
      },
    });

    fireEvent.click(getByText('5'));

    expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.ANALYTICS.EVENT, EventName.CALLING.QUALITY_REVIEW, {
      [Segmentation.CALL.SCORE]: 5,
      [Segmentation.CALL.QUALITY_REVIEW_LABEL]: RatingListLabel.ANSWERED,
    });

    expect(useCallAlertState.getState().qualityFeedBackModalShown).toBe(false);
  });

  it('should store the doNotAskAgain state in localStorage', () => {
    const {getByText} = render(withTheme(withIntl(<QualityFeedbackModal />)));

    act(() => {
      useCallAlertState.getState().setQualityFeedbackModalShown(true);
    });

    const checkbox = getByText('qualityFeedback.doNotAskAgain');
    fireEvent.click(checkbox);
    fireEvent.click(getByText('5'));

    act(() => {
      const storedData = JSON.parse(localStorage.getItem(CALL_QUALITY_FEEDBACK_KEY) || '{}');
      expect(storedData['userId']).toBeNull();
    });
  });
});
