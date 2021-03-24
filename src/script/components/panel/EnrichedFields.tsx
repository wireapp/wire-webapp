/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import type {RichInfoField} from '@wireapp/api-client/src/user/RichInfo';
import ko from 'knockout';
import React, {useEffect, useState} from 'react';
import {container} from 'tsyringe';

import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';

import type {User} from '../../entity/User';
import {RichProfileRepository} from '../../user/RichProfileRepository';

export interface EnrichedFieldsProps {
  onFieldsLoaded?: (richFields: RichInfoField[]) => void;
  richProfileRepository?: RichProfileRepository;
  user: User;
}

const EnrichedFields: React.FC<EnrichedFieldsProps> = ({
  onFieldsLoaded = noop,
  richProfileRepository = container.resolve(RichProfileRepository),
  user,
}) => {
  const [fields, setFields] = useState<RichInfoField[]>([]);
  const email: string = useKoSubscribable(user?.email || ko.observable());

  useEffect(() => {
    let cancel = false;
    const returnFields: RichInfoField[] = email ? [{type: t('userProfileEmail'), value: email}] : [];

    const loadRichFields = async () => {
      try {
        const richProfile = await richProfileRepository.getUserRichProfile(user.id);
        returnFields.push(...(richProfile?.fields ?? []));
      } catch {
      } finally {
        if (!cancel) {
          onFieldsLoaded?.(returnFields);
          setFields(returnFields);
        }
      }
    };

    loadRichFields();
    return () => {
      cancel = true;
    };
  }, [user, email]);

  return (
    fields && (
      <div className="enriched-fields">
        {fields.map(({type, value}) => (
          <div key={type} className="enriched-fields__entry">
            <div className="enriched-fields__entry__key" data-uie-name="item-enriched-key">
              {type}
            </div>
            <div className="enriched-fields__entry__value" data-uie-name="item-enriched-value">
              {value}
            </div>
          </div>
        ))}
      </div>
    )
  );
};

export default EnrichedFields;

registerReactComponent<EnrichedFieldsProps>('enriched-fields', {
  component: EnrichedFields,
  optionalParams: ['onFieldsLoaded', 'richProfileRepository'],
  template: '<div data-bind="react: {user: ko.unwrap(user), onFieldsLoaded, richProfileRepository}"></div>',
});
