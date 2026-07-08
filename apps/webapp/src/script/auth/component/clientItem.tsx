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

import {
  ChangeEvent,
  FormEvent,
  HTMLProps,
  useCallback,
  useEffect,
  useRef,
  useState,
  MouseEvent,
  KeyboardEvent,
} from 'react';

import is from '@sindresorhus/is';
import {RegisteredClient} from '@wireapp/api-client/lib/client/index';

import {
  TabIndex,
  COLOR,
  ContainerXS,
  DeviceIcon,
  FlexBox,
  Form,
  IconButton,
  Input,
  Line,
  Small,
  Text,
  TrashIcon,
} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';
import {isEnterKey} from 'Util/keyboardUtil';
import {splitFingerprint} from 'Util/stringUtil';
import {isBackendError} from 'Util/typePredicateUtil';

import {ValidationError} from '../module/action/validationError';
import {parseError, parseValidationErrors} from '../util/errorUtil';

interface Props extends HTMLProps<HTMLDivElement> {
  client: RegisteredClient;
  onClick: (event: MouseEvent<HTMLDivElement> | KeyboardEvent) => void;
  onClientRemoval: (password?: string) => void;
  requirePassword: boolean;
  selected: boolean;
  clientError?: Error;
}

const ClientItem = ({selected, onClientRemoval, onClick, client, clientError, requirePassword}: Props) => {
  const {translate} = useApplicationContext();
  const passwordInput = useRef<HTMLInputElement>(null);

  const animationSteps = 8;
  const cardLeftSpacingPixels = 32;
  const cardHorizontalSpacingPixels = 16;
  const cardVerticalSpacingPixels = 12;
  const cardExpandedLeftSpacingPixels = 48;
  const cardIconSpacingPixels = 8;
  const cardDividerSpacingPixels = 4;
  const deviceIconBaseOffsetPixels = 18;
  const halfPixelDivisor = 2;
  const inputContainerHeightPixels = 104;

  const [animationStep, setAnimationStep] = useState(selected ? animationSteps : 0);
  const [isSelected, setIsSelected] = useState(selected);
  const [isAnimating, setIsAnimating] = useState(false);
  const [password, setPassword] = useState('');
  const [isValidPassword, setIsValidPassword] = useState(true);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isOpen, setIsOpen] = useState(requirePassword && (isSelected || isAnimating));

  const formatId = (id = '?') => splitFingerprint(id).join(' ');

  const executeAnimateIn = useCallback((): void => {
    setAnimationStep(step => {
      if (step < animationSteps) {
        window.requestAnimationFrame(executeAnimateIn);
        return step + 1;
      }
      setIsAnimating(false);
      return step;
    });
  }, [animationSteps]);

  const executeAnimateOut = useCallback((): void => {
    setAnimationStep(step => {
      if (step > 0) {
        window.requestAnimationFrame(executeAnimateOut);
        return step - 1;
      }
      setIsAnimating(false);
      return step;
    });
  }, []);

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
  }, [executeAnimateIn, executeAnimateOut, isSelected, selected]);

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

  const formatName = (model: string, clazz: string): string | JSX.Element => {
    if (is.nonEmptyString(model)) {
      return model;
    }
    if (is.nonEmptyString(clazz)) {
      return (
        <Text bold textTransform={'capitalize'}>
          {clazz}
        </Text>
      );
    }
    return '?';
  };

  const resetState = () => {
    setAnimationStep(selected ? animationSteps : 0);
    setIsAnimating(false);
  };

  const handleWrapperClick = (event: MouseEvent<HTMLDivElement> | KeyboardEvent): void => {
    resetState();
    onClick(event);
  };

  const onWrapperEnter = (event: KeyboardEvent) => {
    if (!isEnterKey(event)) {
      return;
    }
    handleWrapperClick(event);
  };

  const handlePasswordlessClientDeletion = (event: FormEvent): Promise<void> => {
    event.preventDefault();

    return Promise.resolve()
      .then(() => onClientRemoval())
      .catch((error: unknown) => {
        if (!isBackendError(error)) {
          throw error;
        }
      });
  };

  const handleSubmit = (event: FormEvent): Promise<void> => {
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
        if (error !== null) {
          throw error;
        }
      })
      .then(() => onClientRemoval(password))
      .catch((error: unknown) => {
        if (isBackendError(error)) {
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

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setIsValidPassword(true);
  };

  const animationPosition = animationStep / animationSteps;
  const smoothHeight = animationPosition * inputContainerHeightPixels;
  const smoothMarginTop = animationPosition * cardHorizontalSpacingPixels;

  const renderErrorMessage = (): JSX.Element | null => {
    if (validationError && selected) {
      return (
        <div style={{margin: `${cardHorizontalSpacingPixels}px 0 0 0`}}>{parseValidationErrors(validationError)}</div>
      );
    }
    if (clientError && selected) {
      return (
        <div style={{margin: `${cardHorizontalSpacingPixels}px 0 0 0`}} data-uie-name="error-message">
          {parseError(clientError)}
        </div>
      );
    }
    return null;
  };

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
          onClick={(event: MouseEvent<HTMLDivElement>) => requirePassword && handleWrapperClick(event)}
          onKeyDown={(event: KeyboardEvent) => requirePassword && onWrapperEnter(event)}
          css={{
            ['&:focus-visible']: {
              outline: `none`,
            },
            cursor: requirePassword ? 'pointer' : 'auto',
            margin: `${smoothMarginTop}px 0 0 0`,
            padding: `0 ${cardHorizontalSpacingPixels}px`,
          }}
          data-uie-name="go-remove-device"
          tabIndex={TabIndex.FOCUSABLE}
        >
          <FlexBox>
            <div
              style={{
                flexBasis: cardLeftSpacingPixels,
                margin: isOpen ? `${deviceIconBaseOffsetPixels - smoothMarginTop / halfPixelDivisor}px 0 0 0` : 'auto',
              }}
            >
              <DeviceIcon color="#323639" />
            </div>
            <div style={{flexGrow: 1, marginTop: isOpen ? smoothMarginTop : 0}}>
              {client.model !== undefined && client.model.length > 0 && (
                <Text bold block color="#323639" data-uie-name="device-header-model">
                  {formatName(client.model, client.class)}
                </Text>
              )}
              <Small block data-uie-name="device-id">{`ID: ${formatId(client.id)}`}</Small>
              <Small block>{formatDate(client.time)}</Small>
            </div>
            {!requirePassword && (
              <IconButton
                aria-label={translate('modalAccountRemoveDeviceAction')}
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
              margin: `${cardDividerSpacingPixels}px 0 0 ${cardLeftSpacingPixels}px`,
            }}
          />
        </ContainerXS>
        {isOpen && (
          <ContainerXS style={{overflow: 'hidden'}}>
            <Form>
              <FlexBox
                css={{
                  alignItems: 'center',
                  margin: `${cardVerticalSpacingPixels}px ${cardHorizontalSpacingPixels}px 0px ${cardExpandedLeftSpacingPixels}px`,
                  maxHeight: smoothHeight,
                }}
              >
                <FlexBox css={{flexGrow: 1, marginRight: `${cardVerticalSpacingPixels}px`}}>
                  {/* eslint jsx-a11y/no-autofocus : "off" */}
                  <Input
                    autoFocus
                    id="remove-device-password"
                    autoComplete="section-login password"
                    data-uie-name="remove-device-password"
                    ref={passwordInput}
                    name="password"
                    label={translate('modalAccountRemoveDevicePlaceholder')}
                    onChange={onPasswordChange}
                    pattern=".{1,1024}"
                    placeholder={translate('clientItem.passwordPlaceholder')}
                    required
                    type="password"
                    showTogglePasswordLabel={translate('showTogglePasswordLabel')}
                    hideTogglePasswordLabel={translate('hideTogglePasswordLabel')}
                    value={password}
                  />
                </FlexBox>
                <IconButton
                  aria-label={translate('modalAccountRemoveDeviceAction')}
                  data-uie-name="do-remove-device"
                  disabled={!is.nonEmptyString(password) || isValidPassword !== true}
                  formNoValidate
                  css={{margin: `0 ${cardIconSpacingPixels}px`}}
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
      {renderErrorMessage()}
    </ContainerXS>
  );
};

export {ClientItem};
