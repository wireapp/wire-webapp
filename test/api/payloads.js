/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

/* eslint no-undef: "off" */

const lorem_ipsum =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

/** @type {any} */
const entities = {
  picture: [
    {
      content_length: 26466,
      data: null,
      content_type: 'image/jpeg',
      id: '6cb67e89-d48a-50e2-88f1-1733fff5c119',
      info: {
        height: 280,
        tag: 'smallProfile',
        original_width: 1886,
        width: 280,
        name: null,
        correlation_id: '0d095659-68b7-477e-a7d2-7cecd876617f',
        original_height: 1333,
        nonce: '0d095659-68b7-477e-a7d2-7cecd876617f',
        public: true,
      },
    },
    {
      content_length: 179848,
      data: null,
      content_type: 'image/jpeg',
      id: '2ea9f416-28dc-5d86-9d34-a30863833c2a',
      info: {
        height: 1333,
        tag: 'medium',
        original_width: 1886,
        width: 1886,
        name: null,
        correlation_id: '0d095659-68b7-477e-a7d2-7cecd876617f',
        original_height: 1333,
        nonce: '0d095659-68b7-477e-a7d2-7cecd876617f',
        public: true,
      },
    },
  ],
  connection: {
    status: 'accepted',
    conversation: '45c8f986-6c8f-465b-9ac9-bd5405e8c944',
    to: '7025598b-ffac-4993-8a81-af3f35b7147f',
    from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
    last_update: '2015-01-07T16:08:36.537Z',
    message: `Hi Jane Doe,\nLet's connect.\nJohn Doe`,
  },
  conversation: {
    creator: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
    members: {
      self: {
        status: 0,
        last_read: '1.800122000a4b6e15',
        cleared: '1.800122000a4b6e15',
        otr_muted_ref: '2015-01-13T10:41:55.032Z',
        otr_muted_status: 0,
        status_time: '2015-01-13T10:41:55.032Z',
        status_ref: '0.0',
        id: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        archived: null,
      },
      others: [
        {
          status: 0,
          id: '2441243e-6d3e-4ebc-9f04-f3236e9b5862',
        },
        {
          status: 0,
          id: '7025598b-ffac-4993-8a81-af3f35b7147f',
        },
        {
          status: 0,
          id: '7a3740af-8591-4f92-ae8f-9f0c4a9ca19a',
        },
        {
          status: 0,
          id: 'e6ebfe31-25d1-408f-97fa-8e601b8ee352',
        },
      ],
    },
    name: 'Very funny conversation about foo bar',
    id: '537992e5-3782-4b6c-8718-a5db2cb786ee',
    type: 0,
    last_event_time: '2015-01-13T10:41:55.032Z',
    last_event: '1.800122000a4b6e15',
    team: '537992e5-3782-4b6c-8718-a5db2cc786ee',
  },
};

entities.clients = {
  john_doe: {
    permanent: {
      cookie: 'webapp@2153234453@permanent@1458071394172',
      time: '2016-03-15T19:59:20.278Z',
      address: '62.96.148.44',
      model: 'Chrome',
      id: '93fa36b916a91118',
      type: 'permanent',
      class: 'desktop',
      label: 'Windows 10',
    },
    plain: {
      class: 'desktop',
      id: '93fa36b916a91118',
    },
    temporary: {
      cookie: 'webapp@2153234453@temporary@1458070104403',
      time: '2016-03-15T19:28:25.685Z',
      address: '62.96.148.44',
      model: 'Chrome (Temporary)',
      id: '9d1b37cab836df45',
      type: 'temporary',
      class: 'desktop',
      label: 'Windows 10',
    },
  },
  jane_roe: {
    plain: {
      class: 'phone',
      id: '2b22b7c59aab5f8',
    },
  },
};

entities.user = {
  john_doe: {
    email: 'jd@wire.com',
    accent_id: 1,
    picture: entities.picture,
    name: 'John Doe',
    id: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
    qualified_id: {id: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5', domain: ''},
    locale: 'en',
  },
  jane_roe: {
    email: 'jr@wire.com',
    accent_id: 1,
    picture: entities.picture,
    name: 'Jane Roe',
    handle: 'jaro',
    id: '7025598b-ffac-4993-8a81-af3f35b7147f',
    qualified_id: {id: '7025598b-ffac-4993-8a81-af3f35b7147f', domain: ''},
  },
};

const payload = {
  clients: {
    get: {
      one: entities.clients.john_doe.permanent,
      many: [entities.clients.john_doe.temporary, entities.clients.john_doe.permanent],
    },
  },
  connections: {
    get: {
      has_more: false,
      connections: [entities.connection, entities.connection],
    },
  },
  conversations: {
    get: {
      has_more: false,
      conversations: [entities.conversation, entities.conversation],
    },
    last_events: {
      get: {
        has_more: false,
        conversations: [
          {
            event: '13c.800122000a64b3ee',
            id: '00b9f353-ab33-4432-86ae-c97c8e3551a0',
          },
          {
            event: '5b9.800122000a65563d',
            id: '0245764a-fad1-4640-b0f6-731d8bd76ead',
          },
          {
            event: '31.800122000a64b25f',
            id: '032f6fb9-524f-4a76-a12a-948033bfff86',
          },
          {
            event: '7.800112314201e3bf',
            id: '0595ee86-32bb-40cc-bc13-d8fd594d4f68',
          },
          {
            event: '1.800122000a64b529',
            id: '0925d3a9-65a8-4445-b6dd-56f82a1ec75b',
          },
        ],
      },
    },
    knock: {
      post: {
        conversation: 'aaab1f35-b6cd-4766-8c42-f465b2bc86a5',
        time: Date.now(),
        data: {
          nonce: '37f91c89-29e5-471f-8b52-4cecd94c9279',
        },
        from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        id: '4.800122000a4b6a29',
        type: 'conversation.knock',
      },
    },
    hot_knock: {
      post: {
        conversation: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        time: Date.now(),
        data: {
          nonce: '37f91c89-29e5-471f-8b52-4cecd94c9279',
          ref: '4.800122000a4b6a29',
        },
        from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        id: '5.800122000a4b6a2a',
        type: 'conversation.hot-knock',
      },
    },
  },
  search: {
    suggestions: {
      get: {
        took: 14,
        found: 0,
        documents: [
          {
            email: 'jd@wire.com',
            connected: false,
            total_mutual_friends: 0,
            mutual_friends: [],
            weight: 2399,
            accent_id: 4,
            name: 'John Doe',
            id: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
            blocked: false,
            level: 1,
          },
          {
            email: 'jr@wire.com',
            connected: false,
            total_mutual_friends: 0,
            mutual_friends: [],
            weight: 2399,
            accent_id: 1,
            name: 'Jane Roe',
            id: '7025598b-ffac-4993-8a81-af3f35b7147f',
            blocked: false,
            level: 1,
          },
        ],
        returned: 2,
      },
    },
  },
  self: {
    get: entities.user.john_doe,
  },
  users: {
    get: {
      one: [entities.user.john_doe],
      many: [entities.user.john_doe, entities.user.jane_roe],
    },
  },
};

export {lorem_ipsum, entities, payload};
