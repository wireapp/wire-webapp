/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {components, GroupBase, OptionProps, OptionsOrGroups} from 'react-select';

import {CheckIcon} from '../../../Icon';
import {Theme} from '../../../Layout';
import {Option} from '../Select';

// eslint-disable-next-line react/display-name
export const SelectOption = (dataUieName: string) => (props: OptionProps<Option>) => {
  const {children, data, isMulti, isSelected, options} = props;

  return (
    <components.Option {...props}>
      <div
        css={{
          ...((isMulti || isGroup(options)) && {
            display: 'grid',
            gridTemplateAreas: `"checkbox label"
                                ". description"`,
            gridTemplateColumns: '22px 1fr',
            columnGap: isGroup(options) ? '5px' : '10px',
          }),
        }}
        {...(dataUieName && {
          'data-uie-name': `option-${dataUieName}`,
          'data-uie-value': (options as Option[]).find(option => option.label === children)?.value,
          'data-uie-selected': isSelected,
        })}
      >
        {isMulti && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => null}
            css={{gridArea: 'checkbox', width: 22, height: 22, cursor: 'pointer', placeSelf: 'center'}}
          />
        )}

        {isGroup(options) && (
          //includes a checkmark character if it is selected and a group
          <div css={{width: 22, height: 22, cursor: 'pointer', placeSelf: 'center'}}>
            {isSelected ? <CheckIcon /> : null}
          </div>
        )}

        <div css={{gridArea: 'label', overflowWrap: 'break-word', overflow: 'hidden'}}>{children}</div>

        {data && data.description && (
          <p
            css={(theme: Theme) => ({
              marginBottom: 0,
              fontSize: theme.fontSizes.medium,
              color: isSelected ? theme.Select.focusedDescriptionColor : theme.Input.labelColor,
              gridArea: 'description',
            })}
          >
            {data.description}
          </p>
        )}
      </div>
    </components.Option>
  );
};

export const isGroup = (options: OptionsOrGroups<Option, GroupBase<Option>>): options is GroupBase<Option>[] => {
  return options?.length > 0 && 'options' in options[0];
};
