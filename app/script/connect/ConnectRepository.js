/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.connect = z.connect || {};

z.connect.ConnectRepository = class ConnectRepository {
  constructor(connect_service, connect_google_service, properties_repository) {
    this.connect_service = connect_service;
    this.connect_google_service = connect_google_service;
    this.properties_repository = properties_repository;
    this.logger = new z.util.Logger('z.connect.ConnectRepository', z.config.LOGGER.OPTIONS);
  }

  /**
   * Get user's contacts for matching.
   * @param {z.connect.ConnectSource} source - Source for phone book retrieval
   * @returns {Promise} Resolves with the matched user IDs
   */
  get_contacts(source) {
    const import_from_icloud = source === z.connect.ConnectSource.ICLOUD;

    const import_promise = import_from_icloud ? this._get_macos_contacts() : this._get_google_contacts();
    return import_promise.then(phone_book => this._upload_contacts(phone_book, source));
  }

  /**
   * Encode phone book
   *
   * @private
   * @param {z.connect.PhoneBook} phone_book - Object containing un-encoded phone book data
   * @returns {z.connect.PhoneBook} Object containing encoded phone book data
   */
  _encode_phone_book(phone_book) {
    const {cards, self} = phone_book;
    self.forEach((contact, contact_index) => {
      self[contact_index] = z.util.encode_sha256_base64(contact);
    });

    cards.forEach((card, card_index) => {
      card.contact.forEach((contact, contact_index) => {
        card.contact[contact_index] = z.util.encode_sha256_base64(contact);
      });
      cards[card_index] = card;
    });

    return phone_book;
  }

  /**
   * Retrieve a user's Google Contacts.
   * @private
   * @returns {Promise} Resolves with the user's Google contacts that match on Wire
   */
  _get_google_contacts() {
    return this.connect_google_service
      .get_contacts()
      .catch(error => {
        this.logger.info('Google Contacts SDK error', error);
        throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD);
      })
      .then(response => {
        amplify.publish(z.event.WebApp.SEARCH.SHOW);
        return this._parse_google_contacts(response);
      });
  }

  /**
   * Retrieve a user's macOS address book contacts.
   * @private
   * @returns {Promise} Resolves with the user's address book contacts that match on Wire
   */
  _get_macos_contacts() {
    return this._parse_macos_contacts();
  }

  /**
   * Parse a user's macOS address book Contacts.
   * @private
   * @returns {Promise} Resolves with encoded phone book data
   */
  _parse_macos_contacts() {
    return new Promise(resolve => {
      if (!window.wAddressBook) {
        return resolve(undefined);
      }
      const address_book = window.wAddressBook;
      const phone_book = new z.connect.PhoneBook();

      const {numbers: self_numbers} = address_book.getMe();
      self_numbers.forEach(number => {
        phone_book.self.push(number);
      });

      address_book.getContacts(
        percentage => {
          this.logger.info('Importing Contacts', percentage);
        },
        contacts => {
          contacts.forEach(({firstName: first_name, lastName: last_name, numbers}) => {
            const card = {
              card_id: CryptoJS.MD5(`${first_name}${last_name}`).toString(),
              contact: [],
            };
            numbers.forEach(number => {
              card.contact.push(z.util.phone_number_to_e164(number, navigator.language));
            });

            if (card.contact.length) {
              phone_book.cards.push(card);
            }
          });

          return resolve(this._encode_phone_book(phone_book));
        }
      );
    });
  }

  /**
   * Parse a user's Google Contacts.
   *
   * @private
   * @param {Array} users - Contacts response from Google API
   * @returns {z.connect.PhoneBook} Encoded phone book data
   */
  _parse_google_contacts({entry: users}) {
    const phone_book = new z.connect.PhoneBook();

    // Add Google contacts
    if (users) {
      users.forEach(user => {
        if (user.gd$phoneNumber) {
          const card = {
            card_id: user.gd$etag,
            contact: [],
          };

          if (user.gd$phoneNumber) {
            user.gd$phoneNumber.forEach(number => {
              if (number.uri) {
                card.contact.push(number.uri);
              } else {
                card.contact.push(number.$t);
              }
            });
          }

          if (card.contact.length) {
            phone_book.cards.push(card);
          }
        }
      });
    }

    return this._encode_phone_book(phone_book);
  }

  /**
   * Upload hashed phone booked to backend for matching.
   *
   * @private
   * @param {z.connect.PhoneBook} phone_book - Encoded phone book data
   * @param {z.connect.ConnectSource} source - Source of phone book data
   * @returns {Promise} Resolves when phone book was uploaded
   */
  _upload_contacts(phone_book, source = z.connect.ConnectSource.GMAIL) {
    const {cards} = phone_book;

    if (!cards.length) {
      this.logger.warn('No contacts found for upload');
      throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.NO_CONTACTS);
    }

    this.logger.info(`Uploading hashes of '${cards.length}' contacts for matching`, phone_book);
    return this.connect_service
      .post_onboarding(phone_book)
      .then(({results}) => {
        this.logger.info(`Upload of '${source}' contacts upload successful: ${results.length} matches`, results);
        this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE);
        return results.map(result => result.id);
      })
      .catch(error => {
        switch (error.type) {
          case z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD:
            throw error;
          case z.connect.ConnectError.TYPE.NO_CONTACTS:
            return {};
          default:
            if (error.code === z.service.BackendClientError.STATUS_CODE.TOO_MANY_REQUESTS) {
              this.logger.error(`Backend refused upload of '${source}' contacts: Endpoint used too frequent`, error);
            } else {
              this.logger.error(`Upload of '${source}' contacts failed`, error);
            }
            throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.UPLOAD);
        }
      });
  }
};
