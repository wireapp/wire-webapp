/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {registerReactComponent} from 'Util/ComponentUtil';
import {Conversation} from '../entity/Conversation';
import SVGProvider from '../auth/util/SVGProvider';
import {LegalHoldModalViewModel} from '../view_model/content/LegalHoldModalViewModel';
import {CSS_SQUARE} from 'Util/CSSMixin';

export interface LegalHoldDotProps {
  conversation?: ko.Observable<Conversation>;
  isLarge?: boolean;
  isPending?: boolean;
  legalHoldModal?: LegalHoldModalViewModel;
}

const LegalHoldDot: React.FunctionComponent<LegalHoldDotProps> = ({
  conversation,
  isPending,
  isLarge,
  legalHoldModal,
}) => {
  const isInteractive = !!legalHoldModal;
  return (
    <div
      className={`legal-hold-dot${isLarge ? ' legal-hold-dot--large' : ''}${
        !isPending ? ' legal-hold-dot--active' : ''
      }`}
      onClick={(event: React.MouseEvent): void => {
        event.stopPropagation();
        if (isInteractive) {
          if (isPending) {
            legalHoldModal.showRequestModal(true);
            return;
          }
          if (conversation) {
            legalHoldModal.showUsers(conversation);
            return;
          }
          legalHoldModal.showUsers();
        }
      }}
      css={{
        ...CSS_SQUARE(isLarge ? 48 : 16),
        alignItems: 'center',
        borderRadius: '50%',
        cursor: isInteractive && 'pointer',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {isPending && (
        <svg
          width={16}
          height={16}
          dangerouslySetInnerHTML={{__html: SVGProvider['pending-icon']?.documentElement?.innerHTML}}
          className="pending-icon"
        />
      )}
    </div>
  );
};

export default LegalHoldDot;

registerReactComponent('legal-hold-dot', {
  component: LegalHoldDot,
  optionalParams: ['conversation', 'large', 'isPending', 'legalHoldModal'],
  template:
    '<span data-bind="react: {conversation, isPending: ko.unwrap(isPending), isLarge: large, legalHoldModal}"></span>',
});
