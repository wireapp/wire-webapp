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

import {BackendClient} from './backendClient';

export class ConversationRepository extends BackendClient {
  //  POST https://staging-nginz-https.zinfra.io/conversations
  //  >>> Request: {"access":["invite","code"],"conversation_role":"wire_member","access_role_v2":["team_member","non_team_member","guest","service"],"name":"Tracking","team":{"managed":false,"teamid":"b1a4d1d0-2502-4e9b-9455-b5323745eee7"},"qualified_users":[],"users":["ec653fd3-ea6e-4ebd-80ac-36d8fcb50e07"]}
  // >>> Response (201): {"access":["invite","code"],"access_role":"non_activated","access_role_v2":["team_member","non_team_member","guest","service"],"add_permission":null,"cells_state":"disabled","creator":"3d24c4a8-e625-4f8b-ae64-db5b0e28ec47","group_conv_type":"group_conversation","id":"38d5084c-45d1-46e5-9a9c-002613bd3700","last_event":"0.0","last_event_time":"1970-01-01T00:00:00.000Z","members":{"others":[{"conversation_role":"wire_member","id":"ec653fd3-ea6e-4ebd-80ac-36d8fcb50e07","qualified_id":{"domain":"staging.zinfra.io","id":"ec653fd3-ea6e-4ebd-80ac-36d8fcb50e07"},"status":0}],"self":{"conversation_role":"wire_admin","hidden":false,"hidden_ref":null,"id":"3d24c4a8-e625-4f8b-ae64-db5b0e28ec47","otr_archived":false,"otr_archived_ref":null,"otr_muted_ref":null,"otr_muted_status":null,"qualified_id":{"domain":"staging.zinfra.io","id":"3d24c4a8-e625-4f8b-ae64-db5b0e28ec47"},"service":null,"status":0,"status_ref":"0.0","status_time":"1970-01-01T00:00:00.000Z"}},"message_timer":null,"name":"Tracking","protocol":"proteus","qualified_id":{"domain":"staging.zinfra.io","id":"38d5084c-45d1-46e5-9a9c-002613bd3700"},"receipt_mode":null,"team":"b1a4d1d0-2502-4e9b-9455-b5323745eee7","type":0}

  public async inviteToConversation(inviteeId: string, inviterToken: string, teamId: string, conversationName: string) {
    await this.axiosInstance.post(
      'conversations',
      {
        access: ['invite', 'code'],
        conversation_role: 'wire_member',
        access_role_v2: ['team_member', 'non_team_member', 'guest', 'service'],
        name: conversationName,
        team: {
          managed: false,
          teamid: teamId,
        },
        qualified_users: [],
        users: [inviteeId],
      },
      {
        headers: {
          Authorization: `Bearer ${inviterToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
