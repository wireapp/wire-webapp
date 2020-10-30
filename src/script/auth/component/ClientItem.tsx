/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {RegisteredClient} from '@wireapp/api-client/src/client/index';
import {
  COLOR,
  ContainerXS,
  DeviceIcon,
  ErrorMessage,
  Form,
  Input,
  InputSubmitCombo,
  Line,
  RoundIconButton,
  Small,
  Text,
  TrashIcon,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {clientItemStrings} from '../../strings';
import {ValidationError} from '../module/action/ValidationError';
import {parseError, parseValidationErrors} from '../util/errorUtil';

export interface Props extends React.HTMLProps<HTMLDivElement> {
  client: RegisteredClient;
  clientError: Error;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onClientRemoval: (password?: string) => void;
  requirePassword: boolean;
  selected: boolean;
}

const ClientItem = ({selected, onClientRemoval, onClick, client, clientError, requirePassword}: Props) => {
  const {formatMessage: _} = useIntl();
  const passwordInput = React.useRef<HTMLInputElement>();

  const CONFIG = {
    animationSteps: 8,
  };

  const [animationStep, setAnimationStep] = useState(selected ? CONFIG.animationSteps : 0);
  const [isSelected, setIsSelected] = useState(selected);
  const [isAnimating, setIsAnimating] = useState(false);
  const [password, setPassword] = useState('');
  const [isValidPassword, setIsValidPassword] = useState(true);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);

  useEffect(() => {
    if (!selected && isSelected) {
      setIsAnimating(true);
      setIsSelected(false);
      requestAnimationFrame(() => executeAnimateOut());
    } else if (selected && !isSelected) {
      setIsAnimating(true);
      setIsSelected(true);
      requestAnimationFrame(() => executeAnimateIn());
    } else {
      setAnimationStep(0);
    }
  }, [selected]);

  const formatId = (id = '?', outputLength = 16) => {
    const paddedId = id.padStart(outputLength, '0');
    return paddedId.toUpperCase().replace(/(..)/g, '$1 ');
  };

  const executeAnimateIn = (): void => {
    setAnimationStep(step => {
      if (step < CONFIG.animationSteps) {
        window.requestAnimationFrame(executeAnimateIn);
        return step + 1;
      }
      setIsAnimating(false);
      return step;
    });
  };

  const executeAnimateOut = (): void => {
    setAnimationStep(step => {
      if (step > 0) {
        window.requestAnimationFrame(executeAnimateOut);
        return step - 1;
      }
      setIsAnimating(false);
      return step;
    });
  };

  const formatDate = (dateString: string): string =>
    dateString
      ? new Date(dateString).toLocaleString('en-US', {
          day: 'numeric',
          hour: 'numeric',
          hour12: false,
          minute: 'numeric',
          month: 'short',
          weekday: 'short',
          year: 'numeric',
        })
      : '?';

  const formatName = (model: string, clazz: string): string | JSX.Element =>
    model || (
      <Text bold textTransform={'capitalize'}>
        {clazz}
      </Text>
    ) ||
    '?';

  const resetState = () => {
    setAnimationStep(selected ? CONFIG.animationSteps : 0);
    setIsAnimating(false);
  };

  const wrappedOnClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    resetState();
    onClick(event);
  };

  const handlePasswordlessClientDeletion = (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    return Promise.resolve()
      .then(() => onClientRemoval())
      .catch(error => {
        if (!error.label) {
          throw error;
        }
      });
  };

  const handleSubmit = (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    let localValidationError = null;
    if (!passwordInput.current.checkValidity()) {
      localValidationError = ValidationError.handleValidationState(
        passwordInput.current.name,
        passwordInput.current.validity,
      );
    }
    setIsValidPassword(passwordInput.current.validity.valid);
    setValidationError(localValidationError);
    return Promise.resolve(localValidationError)
      .then(error => {
        if (error) {
          throw error;
        }
      })
      .then(() => onClientRemoval(password))
      .catch(error => {
        if (error.label) {
          switch (error.label) {
            default: {
              const isValidationError = Object.values(ValidationError.ERROR).some(errorType =>
                error.label.endsWith(errorType),
              );
              if (!isValidationError) {
                throw error;
              }
            }
          }
        } else {
          throw error;
        }
      });
  };

  const animationPosition = animationStep / CONFIG.animationSteps;
  const height = animationPosition * 56;
  const marginTop = animationPosition * 16;
  const paddingHorizontal = animationPosition * 2;

  return (
    <ContainerXS>
      <ContainerXS
        css={{
          ['&:focus-within']: {
            boxShadow: `0 0 0 1px ${COLOR.BLUE}`,
          },
          backgroundColor: selected ? 'white' : '',
          borderRadius: '4px',
          transition: 'background-color .35s linear',
        }}
        data-uie-value={client.model}
      >
        <ContainerXS
          onClick={(event: React.MouseEvent<HTMLDivElement>) => requirePassword && wrappedOnClick(event)}
          style={{
            cursor: requirePassword ? 'pointer' : 'auto',
            margin: `${marginTop}px 0 0 0`,
            padding: '5px 16px 0 16px',
          }}
          data-uie-name="go-remove-device"
        >
          <div style={{display: 'flex', flexDirection: 'row'}}>
            <div style={{flexBasis: '32px', margin: 'auto'}}>
              <DeviceIcon color="#323639" />
            </div>
            <div style={{flexGrow: 1}}>
              <Text bold block color="#323639" data-uie-name="device-header-model">
                {formatName(client.model, client.class)}
              </Text>
              <Small block data-uie-name="device-id">{`ID: ${formatId(client.id)}`}</Small>
              <Small block>{formatDate(client.time)}</Small>
            </div>
            {!requirePassword && (
              <RoundIconButton
                color={COLOR.RED}
                data-uie-name="do-remove-device"
                formNoValidate
                onClick={handlePasswordlessClientDeletion}
                style={{margin: 'auto'}}
                type="submit"
              >
                <TrashIcon />
              </RoundIconButton>
            )}
          </div>
          <Line color="rgba(51, 55, 58, .04)" style={{backgroundColor: 'transparent', margin: '4px 0 0 0'}} />
        </ContainerXS>
        {requirePassword && (isSelected || isAnimating) && (
          <ContainerXS style={{maxHeight: `${height}px`, overflow: 'hidden', padding: `${paddingHorizontal}px 0`}}>
            <Form>
              <InputSubmitCombo style={{background: 'transparent', boxShadow: 'none', marginBottom: '0'}}>
                <Input
                  autoComplete="section-login password"
                  autoFocus
                  data-uie-name="remove-device-password"
                  ref={passwordInput}
                  name="password"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setPassword(event.target.value);
                    setIsValidPassword(true);
                  }}
                  pattern={'.{1,1024}'}
                  placeholder={_(clientItemStrings.passwordPlaceholder)}
                  required
                  style={{background: 'transparent'}}
                  type="password"
                  value={password}
                />
                <RoundIconButton
                  color={COLOR.RED}
                  data-uie-name="do-remove-device"
                  disabled={!password || !isValidPassword}
                  formNoValidate
                  onClick={handleSubmit}
                  style={{marginBottom: '-4px'}}
                  type="submit"
                >
                  <TrashIcon />
                </RoundIconButton>
              </InputSubmitCombo>
            </Form>
          </ContainerXS>
        )}
      </ContainerXS>
      {validationError && selected ? (
        <div style={{margin: '16px 0 0 0'}}>{parseValidationErrors(validationError)}</div>
      ) : clientError && selected ? (
        <ErrorMessage style={{margin: '16px 0 0 0'}} data-uie-name="error-message">
          {parseError(clientError)}
        </ErrorMessage>
      ) : null}
    </ContainerXS>
  );
};

export default ClientItem;
