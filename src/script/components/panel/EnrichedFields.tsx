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
import React, {useEffect, useState} from 'react';
import {container} from 'tsyringe';

import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';

import type {User} from '../../entity/User';
import {RichProfileRepository} from '../../user/RichProfileRepository';

export interface EnrichedFieldsProps {
  onFieldsLoaded?: (richFields: RichInfoField[]) => void;
  richProfileRepository?: RichProfileRepository;
  showDomain?: boolean;
  user: User;
}

export const useEnrichedFields = (
  user: User,
  {addEmail, addDomain}: {addDomain: boolean; addEmail: boolean},
  richProfileRepository: RichProfileRepository = container.resolve(RichProfileRepository),
  onFieldsLoaded: (richFields: RichInfoField[]) => void = noop,
) => {
  const [fields, setFields] = useState<RichInfoField[]>([]);
  const {email} = useKoSubscribableChildren(user, ['email']);
  useEffect(() => {
    let cancel = false;
    const returnFields: RichInfoField[] = addEmail && email ? [{type: t('userProfileEmail'), value: email}] : [];

    if (addDomain && user.domain) {
      returnFields.push({
        type: t('userProfileDomain'),
        value: user.domain,
      });
    }

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
  }, [user, addEmail && email]);
  return fields;
};

const EnrichedFields: React.FC<EnrichedFieldsProps> = ({
  onFieldsLoaded = noop,
  showDomain = false,
  richProfileRepository = container.resolve(RichProfileRepository),
  user,
}) => {
  const fields = useEnrichedFields(
    user,
    {addDomain: showDomain, addEmail: true},
    richProfileRepository,
    onFieldsLoaded,
  );
  return (
    fields && (
      <div className="enriched-fields">
        {fields.map(({type, value}) => (
          <div key={type} className="enriched-fields__entry">
            <div className="enriched-fields__entry__key" data-uie-name="item-enriched-key">
              {type}
            </div>
            <div className="enriched-fields__entry__value" data-uie-name="item-enriched-value" data-uie-value={value}>
              {value}
            </div>
          </div>
        ))}
      </div>
    )
  );
};

export default EnrichedFields;

registerStaticReactComponent<EnrichedFieldsProps>('enriched-fields', EnrichedFields);
