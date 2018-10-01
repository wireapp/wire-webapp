/* eslint-disable no-magic-numbers, sort-keys */
const faker = require('faker');
const UUID = require('pure-uuid');

function getUUID() {
  return new UUID(4).format();
}

module.exports = {
  getUUID,
  getUrlParameter: (url, parameter) => {
    if (typeof window === 'undefined') {
      return require('url').parse(url, true).query[parameter];
    }
    return new URL(url).searchParams.get(parameter);
  },
  mockUserPayload: userId => {
    return {
      locale: 'en',
      accent_id: 3,
      picture: [
        {
          content_length: 263345,
          data: null,
          content_type: 'image/jpeg',
          id: getUUID(),
          info: {
            height: 960,
            tag: 'medium',
            original_width: 1280,
            width: 1280,
            correlation_id: getUUID(),
            original_height: 960,
            nonce: getUUID(),
            public: true,
          },
        },
      ],
      name: faker.name.findName(),
      id: userId,
      assets: [],
    };
  },
};
