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

const proto = {
  nested: {
    Article: {
      fields: {
        image: {
          id: 4,
          type: 'Asset',
        },
        permanentUrl: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        summary: {
          id: 3,
          type: 'string',
        },
        title: {
          id: 2,
          type: 'string',
        },
      },
    },
    Asset: {
      fields: {
        notUploaded: {
          id: 3,
          type: 'NotUploaded',
        },
        original: {
          id: 1,
          type: 'Original',
        },
        preview: {
          id: 5,
          type: 'Preview',
        },
        uploaded: {
          id: 4,
          type: 'RemoteData',
        },
      },
      nested: {
        AudioMetaData: {
          fields: {
            durationInMillis: {
              id: 1,
              type: 'uint64',
            },
            normalizedLoudness: {
              id: 3,
              type: 'bytes',
            },
          },
        },
        ImageMetaData: {
          fields: {
            height: {
              id: 2,
              rule: 'required',
              type: 'int32',
            },
            tag: {
              id: 3,
              type: 'string',
            },
            width: {
              id: 1,
              rule: 'required',
              type: 'int32',
            },
          },
        },
        NotUploaded: {
          values: {
            CANCELLED: 0,
            FAILED: 1,
          },
        },
        Original: {
          fields: {
            audio: {
              id: 6,
              type: 'AudioMetaData',
            },
            caption: {
              id: 8,
              type: 'string',
            },
            image: {
              id: 4,
              type: 'ImageMetaData',
            },
            mimeType: {
              id: 1,
              rule: 'required',
              type: 'string',
            },
            name: {
              id: 3,
              type: 'string',
            },
            size: {
              id: 2,
              rule: 'required',
              type: 'uint64',
            },
            source: {
              id: 7,
              type: 'string',
            },
            video: {
              id: 5,
              type: 'VideoMetaData',
            },
          },
          oneofs: {
            metaData: {
              oneof: ['image', 'video', 'audio'],
            },
          },
        },
        Preview: {
          fields: {
            image: {
              id: 4,
              type: 'ImageMetaData',
            },
            mimeType: {
              id: 1,
              rule: 'required',
              type: 'string',
            },
            remote: {
              id: 3,
              type: 'RemoteData',
            },
            size: {
              id: 2,
              rule: 'required',
              type: 'uint64',
            },
          },
          oneofs: {
            metaData: {
              oneof: ['image'],
            },
          },
        },
        RemoteData: {
          fields: {
            assetId: {
              id: 3,
              type: 'string',
            },
            assetToken: {
              id: 5,
              type: 'string',
            },
            encryption: {
              id: 6,
              type: 'EncryptionAlgorithm',
            },
            otrKey: {
              id: 1,
              rule: 'required',
              type: 'bytes',
            },
            sha256: {
              id: 2,
              rule: 'required',
              type: 'bytes',
            },
          },
        },
        VideoMetaData: {
          fields: {
            durationInMillis: {
              id: 3,
              type: 'uint64',
            },
            height: {
              id: 2,
              type: 'int32',
            },
            width: {
              id: 1,
              type: 'int32',
            },
          },
        },
      },
      oneofs: {
        status: {
          oneof: ['notUploaded', 'uploaded'],
        },
      },
    },
    Availability: {
      fields: {
        type: {
          id: 1,
          rule: 'required',
          type: 'Type',
        },
      },
      nested: {
        Type: {
          values: {
            AVAILABLE: 1,
            AWAY: 2,
            BUSY: 3,
            NONE: 0,
          },
        },
      },
    },
    Calling: {
      fields: {
        content: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
      },
    },
    Cleared: {
      fields: {
        clearedTimestamp: {
          id: 2,
          rule: 'required',
          type: 'int64',
        },
        conversationId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
      },
    },
    ClientAction: {
      values: {
        RESET_SESSION: 0,
      },
    },
    Confirmation: {
      fields: {
        firstMessageId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        moreMessageIds: {
          id: 3,
          rule: 'repeated',
          type: 'string',
        },
        type: {
          id: 2,
          rule: 'required',
          type: 'Type',
        },
      },
      nested: {
        Type: {
          values: {
            DELIVERED: 0,
            READ: 1,
          },
        },
      },
    },
    EncryptionAlgorithm: {
      values: {
        AES_CBC: 0,
        AES_GCM: 1,
      },
    },
    Ephemeral: {
      fields: {
        asset: {
          id: 5,
          type: 'Asset',
        },
        expireAfterMillis: {
          id: 1,
          rule: 'required',
          type: 'int64',
        },
        image: {
          id: 3,
          type: 'ImageAsset',
        },
        knock: {
          id: 4,
          type: 'Knock',
        },
        location: {
          id: 6,
          type: 'Location',
        },
        text: {
          id: 2,
          type: 'Text',
        },
      },
      oneofs: {
        content: {
          oneof: ['text', 'image', 'knock', 'asset', 'location'],
        },
      },
    },
    External: {
      fields: {
        encryption: {
          id: 3,
          type: 'EncryptionAlgorithm',
        },
        otrKey: {
          id: 1,
          rule: 'required',
          type: 'bytes',
        },
        sha256: {
          id: 2,
          type: 'bytes',
        },
      },
    },
    GenericMessage: {
      fields: {
        asset: {
          id: 11,
          type: 'Asset',
        },
        availability: {
          id: 19,
          type: 'Availability',
        },
        calling: {
          id: 10,
          type: 'Calling',
        },
        cleared: {
          id: 7,
          type: 'Cleared',
        },
        clientAction: {
          id: 9,
          type: 'ClientAction',
        },
        confirmation: {
          id: 16,
          type: 'Confirmation',
        },
        deleted: {
          id: 14,
          type: 'MessageDelete',
        },
        edited: {
          id: 15,
          type: 'MessageEdit',
        },
        ephemeral: {
          id: 18,
          type: 'Ephemeral',
        },
        external: {
          id: 8,
          type: 'External',
        },
        hidden: {
          id: 12,
          type: 'MessageHide',
        },
        image: {
          id: 3,
          type: 'ImageAsset',
        },
        knock: {
          id: 4,
          type: 'Knock',
        },
        lastRead: {
          id: 6,
          type: 'LastRead',
        },
        location: {
          id: 13,
          type: 'Location',
        },
        messageId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        reaction: {
          id: 17,
          type: 'Reaction',
        },
        text: {
          id: 2,
          type: 'Text',
        },
      },
      oneofs: {
        content: {
          oneof: [
            'text',
            'image',
            'knock',
            'lastRead',
            'cleared',
            'external',
            'clientAction',
            'calling',
            'asset',
            'hidden',
            'location',
            'deleted',
            'edited',
            'confirmation',
            'reaction',
            'ephemeral',
            'availability',
          ],
        },
      },
    },
    ImageAsset: {
      fields: {
        height: {
          id: 3,
          rule: 'required',
          type: 'int32',
        },
        mac: {
          id: 10,
          type: 'bytes',
        },
        macKey: {
          id: 9,
          type: 'bytes',
        },
        mimeType: {
          id: 6,
          rule: 'required',
          type: 'string',
        },
        originalHeight: {
          id: 5,
          rule: 'required',
          type: 'int32',
        },
        originalWidth: {
          id: 4,
          rule: 'required',
          type: 'int32',
        },
        otrKey: {
          id: 8,
          type: 'bytes',
        },
        sha256: {
          id: 11,
          type: 'bytes',
        },
        size: {
          id: 7,
          rule: 'required',
          type: 'int32',
        },
        tag: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        width: {
          id: 2,
          rule: 'required',
          type: 'int32',
        },
      },
    },
    Knock: {
      fields: {
        hotKnock: {
          id: 1,
          options: {
            default: false,
          },
          rule: 'required',
          type: 'bool',
        },
      },
    },
    LastRead: {
      fields: {
        conversationId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        lastReadTimestamp: {
          id: 2,
          rule: 'required',
          type: 'int64',
        },
      },
    },
    LinkPreview: {
      fields: {
        article: {
          id: 3,
          type: 'Article',
        },
        image: {
          id: 8,
          type: 'Asset',
        },
        permanentUrl: {
          id: 5,
          type: 'string',
        },
        summary: {
          id: 7,
          type: 'string',
        },
        title: {
          id: 6,
          type: 'string',
        },
        tweet: {
          id: 9,
          type: 'Tweet',
        },
        url: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        urlOffset: {
          id: 2,
          rule: 'required',
          type: 'int32',
        },
      },
      oneofs: {
        metaData: {
          oneof: ['tweet'],
        },
        preview: {
          oneof: ['article'],
        },
      },
    },
    Location: {
      fields: {
        latitude: {
          id: 2,
          rule: 'required',
          type: 'float',
        },
        longitude: {
          id: 1,
          rule: 'required',
          type: 'float',
        },
        name: {
          id: 3,
          type: 'string',
        },
        zoom: {
          id: 4,
          type: 'int32',
        },
      },
    },
    Mention: {
      fields: {
        userId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        userName: {
          id: 2,
          rule: 'required',
          type: 'string',
        },
      },
    },
    MessageDelete: {
      fields: {
        messageId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
      },
    },
    MessageEdit: {
      fields: {
        replacingMessageId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        text: {
          id: 2,
          type: 'Text',
        },
      },
      oneofs: {
        content: {
          oneof: ['text'],
        },
      },
    },
    MessageHide: {
      fields: {
        conversationId: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        messageId: {
          id: 2,
          rule: 'required',
          type: 'string',
        },
      },
    },
    Reaction: {
      fields: {
        emoji: {
          id: 1,
          type: 'string',
        },
        messageId: {
          id: 2,
          rule: 'required',
          type: 'string',
        },
      },
    },
    Text: {
      fields: {
        content: {
          id: 1,
          rule: 'required',
          type: 'string',
        },
        linkPreview: {
          id: 3,
          options: {
            packed: false,
          },
          rule: 'repeated',
          type: 'LinkPreview',
        },
        mention: {
          id: 2,
          options: {
            packed: false,
          },
          rule: 'repeated',
          type: 'Mention',
        },
      },
    },
    Tweet: {
      fields: {
        author: {
          id: 1,
          type: 'string',
        },
        username: {
          id: 2,
          type: 'string',
        },
      },
    },
  },
  options: {
    java_package: 'com.waz.model',
  },
};

export default proto;
