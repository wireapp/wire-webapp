/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {FEATURE_KEY, FeatureStatus, FeatureMLS, FeatureMLSE2EId} from '@wireapp/api-client/lib/team';

import {hasTeamFeatureChanged} from './TeamFeatureUtil';

describe('TeamFeatureUtil', () => {
  describe('hasTeamFeatureChanged', () => {
    it('should return true when features were undefined previously but now feature exists', () => {
      const prevFeatureList = undefined;
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {} as unknown as FeatureMLS,
      };

      expect(hasTeamFeatureChanged({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toBe(true);
    });

    it('should return false when features were undefined previously but feature is not included in the new list', () => {
      const prevFeatureList = undefined;
      const newFeatureList = {};

      expect(hasTeamFeatureChanged({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toBe(false);
    });

    it('should return true when feature was added', () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: undefined,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {} as unknown as FeatureMLS,
      };

      expect(hasTeamFeatureChanged({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toBe(true);
    });

    it('should return true when feature was removed', () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {} as unknown as FeatureMLS,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLS]: undefined,
      };

      expect(hasTeamFeatureChanged({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toBe(true);
    });

    it('should return false when feature was never there', () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: undefined,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLS]: undefined,
      };

      expect(hasTeamFeatureChanged({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toBe(false);
    });

    it('should return true when feature status has changed', () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.ENABLED,
          config: {
            defaultProtocol: ConversationProtocol.MLS,
          },
        } as unknown as FeatureMLS,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.DISABLED,
          config: {
            defaultProtocol: ConversationProtocol.MLS,
          },
        } as unknown as FeatureMLS,
      };

      expect(hasTeamFeatureChanged({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toBe(true);
    });

    it('should return true when feature config has changed', () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.ENABLED,
          config: {
            defaultProtocol: ConversationProtocol.MLS,
          },
        } as unknown as FeatureMLS,
      };

      const newFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.ENABLED,
          config: {
            defaultProtocol: ConversationProtocol.PROTEUS,
          },
        } as unknown as FeatureMLS,
        [FEATURE_KEY.MLSE2EID]: {} as unknown as FeatureMLSE2EId,
      };

      expect(hasTeamFeatureChanged({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toBe(true);
    });
  });
});
