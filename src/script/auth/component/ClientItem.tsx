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
  Form,
  Input,
  Line,
  IconButton,
  Small,
  Text,
  TrashIcon,
  FlexBox,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';
import {clientItemStrings} from '../../strings';
import {ValidationError} from '../module/action/ValidationError';
import {parseError, parseValidationErrors} from '../util/errorUtil';

export interface Props extends React.HTMLProps<HTMLDivElement> {
  client: RegisteredClient;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onClientRemoval: (password?: string) => void;
  requirePassword: boolean;
  selected: boolean;
  clientError?: Error;
}

const ClientItem = ({selected, onClientRemoval, onClick, client, clientError, requirePassword}: Props) => {
  const {formatMessage: _} = useIntl();
  const passwordInput = React.useRef<HTMLInputElement>(null);

  const CONFIG = {
    animationSteps: 8,
  };

  const [animationStep, setAnimationStep] = useState(selected ? CONFIG.animationSteps : 0);
  const [isSelected, setIsSelected] = useState(selected);
  const [isAnimating, setIsAnimating] = useState(false);
  const [password, setPassword] = useState('');
  const [isValidPassword, setIsValidPassword] = useState(true);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isOpen, setIsOpen] = useState(requirePassword && (isSelected || isAnimating));

  useEffect(() => {
    if (!selected && isSelected) {
      setIsAnimating(true);
      setIsSelected(false);
      setIsOpen(false);
      requestAnimationFrame(() => executeAnimateOut());
    } else if (selected && !isSelected) {
      setIsAnimating(true);
      setIsSelected(true);
      setIsOpen(true);
      requestAnimationFrame(() => executeAnimateIn());
    } else if (selected && isSelected) {
      setIsOpen(true);
    } else {
      setAnimationStep(0);
      setIsOpen(false);
    }
  }, [selected]);

  const formatId = (id = '?') => splitFingerprint(id).join(' ');

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

    if (passwordInput.current) {
      if (!passwordInput.current.checkValidity()) {
        localValidationError = ValidationError.handleValidationState(
          passwordInput.current.name,
          passwordInput.current.validity,
        );
      }
      setIsValidPassword(passwordInput.current.validity.valid);
    }

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

  const onPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setIsValidPassword(true);
  };

  const animatedCardSpacing = {
    l: 32,
    m: 16,
    s: 12,
    xl: 48,
    xs: 8,
    xxs: 4,
  };

  const inputContainerHeight = 104;

  const animationPosition = animationStep / CONFIG.animationSteps;
  const smoothHeight = animationPosition * inputContainerHeight;
  const smoothMarginTop = animationPosition * animatedCardSpacing.m;

  return (
    <ContainerXS>
      <ContainerXS
        css={{
          ['&:focus-within']: {
            boxShadow: `0 0 0 1px ${COLOR.BLUE}`,
          },
          backgroundColor: selected ? '#FFF' : '',
          borderRadius: '12px',
          transition: 'background-color .35s linear',
        }}
        data-uie-value={client.model}
      >
        <ContainerXS
          onClick={(event: React.MouseEvent<HTMLDivElement>) => requirePassword && wrappedOnClick(event)}
          style={{
            cursor: requirePassword ? 'pointer' : 'auto',
            margin: `${smoothMarginTop}px 0 0 0`,
            padding: `0 ${animatedCardSpacing.m}px`,
          }}
          data-uie-name="go-remove-device"
        >
          <FlexBox>
            <div
              style={{
                flexBasis: animatedCardSpacing.l,
                margin: isOpen ? `${18 - smoothMarginTop / 2}px 0 0 0` : 'auto',
              }}
            >
              <DeviceIcon color="#323639" />
            </div>
            <div style={{flexGrow: 1, marginTop: isOpen ? smoothMarginTop : 0}}>
              {client.model && (
                <Text bold block color="#323639" data-uie-name="device-header-model">
                  {formatName(client.model, client.class)}
                </Text>
              )}
              <Small block data-uie-name="device-id">{`ID: ${formatId(client.id)}`}</Small>
              <Small block>{formatDate(client.time)}</Small>
            </div>
            {!requirePassword && (
              <IconButton
                aria-label={t('modalAccountRemoveDeviceAction')}
                data-uie-name="do-remove-device"
                formNoValidate
                onClick={handlePasswordlessClientDeletion}
                style={{margin: 'auto'}}
                type="submit"
              >
                <TrashIcon />
              </IconButton>
            )}
          </FlexBox>
          <Line
            color="rgba(51, 55, 58, .04)"
            style={{
              backgroundColor: 'transparent',
              margin: `${animatedCardSpacing.xxs}px 0 0 ${animatedCardSpacing.l}px`,
            }}
          />
        </ContainerXS>
        {isOpen && (
          <ContainerXS style={{overflow: 'hidden'}}>
            <Form>
              <FlexBox
                css={{
                  alignItems: 'center',
                  margin: `${animatedCardSpacing.s}px ${animatedCardSpacing.m}px 0px ${animatedCardSpacing.xl}px`,
                  maxHeight: smoothHeight,
                }}
              >
                <FlexBox css={{flexGrow: 1, marginRight: `${animatedCardSpacing.s}px`}}>
                  <Input
                    id="remove-device-password"
                    autoComplete="section-login password"
                    data-uie-name="remove-device-password"
                    ref={passwordInput}
                    name="password"
                    label={t('modalAccountRemoveDevicePlaceholder')}
                    onChange={onPasswordChange}
                    pattern=".{1,1024}"
                    placeholder={_(clientItemStrings.passwordPlaceholder)}
                    required
                    type="password"
                    value={password}
                  />
                </FlexBox>
                <IconButton
                  aria-label={t('modalAccountRemoveDeviceAction')}
                  data-uie-name="do-remove-device"
                  disabled={!password || !isValidPassword}
                  formNoValidate
                  css={{margin: `0 ${animatedCardSpacing.xs}px`}}
                  onClick={handleSubmit}
                  type="submit"
                >
                  <TrashIcon />
                </IconButton>
              </FlexBox>
            </Form>
          </ContainerXS>
        )}
      </ContainerXS>
      {validationError && selected ? (
        <div style={{margin: `${animatedCardSpacing.m}px 0 0 0`}}>{parseValidationErrors(validationError)}</div>
      ) : clientError && selected ? (
        <div style={{margin: `${animatedCardSpacing.m}px 0 0 0`}} data-uie-name="error-message">
          {parseError(clientError)}
        </div>
      ) : null}
    </ContainerXS>
  );
};

export default ClientItem;
