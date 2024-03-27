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
import {FEATURE_KEY, FeatureStatus, FeatureMLS, FeatureMLSE2EId, FeatureList} from '@wireapp/api-client/lib/team';

import {FeatureUpdateType, detectTeamFeatureUpdate} from './TeamFeatureConfigChangeDetector';

describe('TeamFeatureUtil', () => {
  describe('hasTeamFeatureChanged', () => {
    it(`returns "unchanged" if feature list didn't exist before and it was added with feature disabled`, () => {
      const prevFeatureList: FeatureList | undefined = undefined;
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLS,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.UNCHANGED,
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it(`returns "unchanged" if feature list didn't exist before and it was added without the feature`, () => {
      const prevFeatureList: FeatureList | undefined = undefined;
      const newFeatureList = {
        [FEATURE_KEY.MLSE2EID]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLSE2EId,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.UNCHANGED,
      });
    });

    it(`returns "unchanged" if feature list didn't exist before and it was added without a feature`, () => {
      const prevFeatureList: FeatureList | undefined = undefined;
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLS,
        [FEATURE_KEY.MLSE2EID]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLSE2EId,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.UNCHANGED,
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it(`returns "unchanged" if the feature was not in the list before and it was added with disabled status`, () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLSE2EID]: {status: FeatureStatus.ENABLED} as unknown as FeatureMLSE2EId,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLSE2EID]: {status: FeatureStatus.ENABLED} as unknown as FeatureMLSE2EId,
        [FEATURE_KEY.MLS]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLS,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.UNCHANGED,
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it('should return "unchanged" if the feature list was not defined previously but feature is not included in the new list', () => {
      const prevFeatureList: FeatureList | undefined = undefined;
      const newFeatureList = {};

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.UNCHANGED,
      });
    });

    it("should return 'unchanged' if the feature config has changed but it's still disabled", () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.DISABLED,
          config: {defaultProtocol: ConversationProtocol.PROTEUS},
        } as unknown as FeatureMLS,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.DISABLED,
          config: {defaultProtocol: ConversationProtocol.MLS},
        } as unknown as FeatureMLS,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.UNCHANGED,
        prev: prevFeatureList[FEATURE_KEY.MLS],
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it(`returns "enabled" if the feature list didn't exist before and it was added with feature enabled`, () => {
      const prevFeatureList: FeatureList | undefined = undefined;
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.ENABLED} as unknown as FeatureMLS,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.ENABLED,
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it(`returns "enabled" if feature didn't exist before and it was added with feature enabled`, () => {
      const prevFeatureList = {};
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.ENABLED} as unknown as FeatureMLS,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.ENABLED,
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it(`returns "enabled" if feature's status has changed from disabled to enabled`, () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLS,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.ENABLED} as unknown as FeatureMLS,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.ENABLED,
        prev: prevFeatureList[FEATURE_KEY.MLS],
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it(`returns "disabled" if feature config was removed from the feature list`, () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLS,
      };
      const newFeatureList = {};

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.DISABLED,
        prev: prevFeatureList[FEATURE_KEY.MLS],
      });
    });

    it(`returns "disabled" after feature status was changed from enabled to disabled`, () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.ENABLED} as unknown as FeatureMLS,
      };
      const newFeatureList = {
        [FEATURE_KEY.MLS]: {status: FeatureStatus.DISABLED} as unknown as FeatureMLS,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.DISABLED,
        prev: prevFeatureList[FEATURE_KEY.MLS],
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });

    it('should return "config changed" when feature config has changed and feature is still enabled', () => {
      const prevFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.ENABLED,
          config: {
            defaultProtocol: ConversationProtocol.PROTEUS,
          },
        } as unknown as FeatureMLS,
      };

      const newFeatureList = {
        [FEATURE_KEY.MLS]: {
          status: FeatureStatus.ENABLED,
          config: {
            defaultProtocol: ConversationProtocol.MLS,
          },
        } as unknown as FeatureMLS,
        [FEATURE_KEY.MLSE2EID]: {} as unknown as FeatureMLSE2EId,
      };

      expect(detectTeamFeatureUpdate({prevFeatureList, newFeatureList}, FEATURE_KEY.MLS)).toEqual({
        type: FeatureUpdateType.CONFIG_CHANGED,
        prev: prevFeatureList[FEATURE_KEY.MLS],
        next: newFeatureList[FEATURE_KEY.MLS],
      });
    });
  });
});
