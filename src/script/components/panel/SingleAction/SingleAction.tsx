/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Button, ButtonVariant, FlexBox} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {singleActionButtonStyle} from './SingleAction.styles';

export interface MenuItem {
  click: () => void;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  identifier: string;
  label: string;
}

export interface SingleActionProps {
  item: MenuItem;
  onCancel: (action: any) => void;
  oneButtonPerRow?: boolean;
}

const SingleAction = ({item, onCancel, oneButtonPerRow = false}: SingleActionProps) => {
  return (
    <FlexBox
      css={{
        rowGap: 8,
        columnGap: 16,
        flexDirection: oneButtonPerRow ? 'column-reverse' : 'row',
        flexWrap: 'wrap-reverse',
      }}
      justify="space-evenly"
      className="modal__buttons"
    >
      <Button
        variant={ButtonVariant.SECONDARY}
        onClick={onCancel}
        data-uie-name="do-close"
        css={singleActionButtonStyle(oneButtonPerRow)}
      >
        {t('modalConfirmSecondary')}
      </Button>
      <Button onClick={item.click} data-uie-name={item.identifier} css={singleActionButtonStyle(oneButtonPerRow)}>
        {item.label}
      </Button>
    </FlexBox>
  );
};

export {SingleAction};
