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

import {useState} from 'react';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {t} from 'Util/LocalizerUtil';

import {teamCreationModalBodyCss, teamCreationModalWrapperCss} from './TeamCreation.styles';
import {Confirmation} from './TeamCreationSteps/Confirmation';
import {Form} from './TeamCreationSteps/Form';
import {Introduction} from './TeamCreationSteps/Introduction';
import {Success} from './TeamCreationSteps/Success';

enum Step {
  Introduction = 'Introduction',
  Form = 'Form',
  Confirmation = 'Confirmation',
  Success = 'Success',
}

const stepMap = {
  [Step.Introduction]: Introduction,
  [Step.Form]: Form,
  [Step.Confirmation]: Confirmation,
  [Step.Success]: Success,
} as const;

const stepCloseButtonLabelMap = {
  [Step.Introduction]: t('teamCreationIntroCloseLabel'),
  [Step.Form]: t('teamCreationCreateTeamCloseLabel'),
  [Step.Confirmation]: t('teamCreationConfirmCloseLabel'),
  [Step.Success]: t('teamCreationSuccessCloseLabel'),
} as const;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  userName: string;
}

export const TeamCreationModal = ({onClose, onSuccess, userName}: Props) => {
  const stepsSequence = Object.values(Step);
  const [currentStep, setCurrentStep] = useState<Step>(Step.Introduction);
  const [teamName, setTeamName] = useState('');

  const nextStepHandler = () => {
    const currentStepIndex = stepsSequence.indexOf(currentStep);
    setCurrentStep(stepsSequence[currentStepIndex + 1] as Step);
  };

  const previousStepHandler = () => {
    const currentStepIndex = stepsSequence.indexOf(currentStep);
    setCurrentStep(stepsSequence[currentStepIndex - 1] as Step);
  };

  const StepBody = stepMap[currentStep];
  const modalOnClose = currentStep === Step.Success ? onSuccess : onClose;

  return (
    <ModalComponent
      isShown
      onBgClick={modalOnClose}
      onClosed={modalOnClose}
      data-uie-name="team-creation-modal"
      wrapperCSS={teamCreationModalWrapperCss}
    >
      <div className="modal__header" data-uie-name="team-creation-modal-header">
        <span className="subline" data-uie-name="team-creation-modal-subline">
          {t('teamCreationStep', {
            currentStep: (stepsSequence.indexOf(currentStep) + 1).toString(),
            totalSteps: stepsSequence.length.toString(),
          })}
        </span>
        <h2 className="modal__header__title" data-uie-name="team-creation-modal-title">
          {t('teamCreationTitle')}
        </h2>

        <button
          type="button"
          className="modal__header__button"
          onClick={modalOnClose}
          data-uie-name="do-close"
          aria-label={stepCloseButtonLabelMap[currentStep]}
        >
          <Icon.CloseIcon />
        </button>
      </div>

      <div className="modal__body" css={teamCreationModalBodyCss} data-uie-name="team-creation-modal-body">
        <StepBody
          userName={userName}
          teamName={teamName}
          setTeamName={setTeamName}
          onNextStep={nextStepHandler}
          onPreviousStep={previousStepHandler}
          onSuccess={onSuccess}
        />
      </div>
    </ModalComponent>
  );
};
