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

import React from 'react';

import is from '@sindresorhus/is';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {ModalComponent} from 'Components/modals/modalcomponent';
import {handleEscDown} from 'Util/keyboardUtil';
import type {Translate} from 'Util/localizerUtil';

import {AdminSearchInput} from './adminsearchinput';
import {
  actionGroupStyles,
  buttonStyles,
  messageStyles,
  modalBodyStyles,
  modalCloseButtonStyles,
  modalHeaderStyles,
  modalTitleStyles,
} from './styles';
import {useLeaveGroupAdminModalStore} from './useleavegroupadminmodalstore';

interface LeaveGroupAdminModalProps {
  readonly translate: Translate;
}

export const LeaveGroupAdminModal = ({translate}: LeaveGroupAdminModalProps) => {
  const {isOpen, params, selectedUser, clearContent, isLoading, hide, setSelectedUser, setClearContent, setIsLoading} =
    useLeaveGroupAdminModalStore();

  if (!params) {
    return null;
  }

  const {conversation, eligibleUsers, onLeave, onDelete} = params;
  const conversationName = conversation.display_name();
  const hasEligibleUsers = eligibleUsers.length > 0;
  const canLeave = hasEligibleUsers && selectedUser !== null;

  const handleClose = () => hide();

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      if (is.nonEmptyObject(selectedUser)) {
        await onLeave(clearContent, selectedUser);
        hide();
      }
    } catch {
      console.warn('Failed to promote new admin. Leave action was not executed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    hide();
    onDelete();
  };

  const handleUserSelect = (user: typeof selectedUser) => {
    setSelectedUser(user);
  };

  return (
    <ModalComponent
      isShown={isOpen}
      onBgClick={handleClose}
      data-uie-name="leave-group-admin-modal"
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => handleEscDown(event, handleClose)}
    >
      <div style={modalHeaderStyles}>
        <h2 style={modalTitleStyles} data-uie-name="leave-group-admin-modal-title">
          {translate('leaveGroupAdminModalTitle', {name: conversationName})}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          style={modalCloseButtonStyles}
          data-uie-name="do-close"
          aria-label={translate('leaveGroupAdminModalClose', {name: conversationName})}
        >
          <Icon.CloseIcon aria-hidden="true" />
        </button>
      </div>

      <div style={modalBodyStyles}>
        <p style={messageStyles} data-uie-name="leave-group-admin-modal-message">
          {hasEligibleUsers ? (
            <>
              {translate('leaveGroupAdminModalMessageWithEligibleFirstPart')} <br />
              {translate('leaveGroupAdminModalMessageWithEligibleSecondPart')}
            </>
          ) : (
            <>
              {translate('leaveGroupAdminModalMessageNoEligibleFirstPart')} <br />
              {translate('leaveGroupAdminModalMessageNoEligibleSecondPart')}
            </>
          )}
        </p>
        {hasEligibleUsers && (
          <AdminSearchInput
            translate={translate}
            eligibleUsers={eligibleUsers}
            selectedUser={selectedUser}
            clearContent={clearContent}
            onUserSelect={handleUserSelect}
            onClearContentChange={setClearContent}
          />
        )}

        <div style={actionGroupStyles}>
          {hasEligibleUsers && (
            <Button
              type="button"
              disabled={!canLeave || isLoading}
              onClick={handleLeave}
              style={buttonStyles}
              data-uie-name="do-leave-group-and-promote-admin"
            >
              {canLeave ? translate('leaveGroupAdminModalLeaveAction') : translate('leaveGroupAdminModalPromoteAction')}
            </Button>
          )}

          <Button
            type="button"
            onClick={handleDelete}
            style={buttonStyles}
            data-uie-name="do-delete-group-from-leave-modal"
          >
            {translate('leaveGroupAdminModalDeleteAction')}
          </Button>

          <Button
            type="button"
            variant={ButtonVariant.SECONDARY}
            onClick={handleClose}
            style={buttonStyles}
            data-uie-name="do-cancel-leave-group-admin"
          >
            {translate('leaveGroupAdminModalCancelAction')}
          </Button>
        </div>
      </div>
    </ModalComponent>
  );
};
