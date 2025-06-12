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

import {MouseEvent, ReactNode} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {buttonStyles, actionsWrapperStyles} from './CellsModalActions.styles';

export const CellsModalActions = ({children}: {children: ReactNode}) => {
  return <div css={actionsWrapperStyles}>{children}</div>;
};

export const CellsModalSecondaryButton = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) => {
  return (
    <Button variant={ButtonVariant.SECONDARY} type="button" onClick={onClick} css={buttonStyles}>
      {children}
    </Button>
  );
};

export const CellsModalPrimaryButton = ({
  children,
  onClick,
  isDisabled,
  isLoading,
}: {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  isDisabled?: boolean;
  isLoading?: boolean;
}) => {
  return (
    <Button
      variant={ButtonVariant.PRIMARY}
      css={buttonStyles}
      disabled={isDisabled}
      onClick={onClick}
      showLoading={isLoading}
    >
      {children}
    </Button>
  );
};
