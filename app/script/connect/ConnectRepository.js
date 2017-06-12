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
   * Retrieve a user's Google Contacts.
   * @returns {Promise} Resolves with the user's Google contacts that match on Wire
   */
  get_google_contacts() {
    return this.connect_google_service.get_contacts()
    .catch((error) => {
      this.logger.info('Google Contacts SDK error', error);
      throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD);
    })
    .then((response) => {
      amplify.publish(z.event.WebApp.SEARCH.SHOW);
      return this._parse_google_contacts(response);
    })
    .then((phone_book) => {
      if (phone_book.cards.length === 0) {
        this.logger.warn('No contacts found for upload');
        throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.NO_CONTACTS);
      }
      this.logger.info(`Uploading hashes of '${phone_book.cards.length}' contacts for matching`, phone_book);
      return this.connect_service.post_onboarding(phone_book);
    })
    .then((response) => {
      this.logger.info(`Gmail contacts upload successful: ${response.results.length} matches, ${response['auto-connects'].length} auto connects`, response);
      this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE);
      return response;
    })
    .catch((error) => {
      switch (error.type) {
        case z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD:
          throw error;
        case z.connect.ConnectError.TYPE.NO_CONTACTS:
          return {};
        default:
          if (error.code === z.service.BackendClientError.STATUS_CODE.TOO_MANY_REQUESTS) {
            this.logger.error('Backend refused Gmail contacts upload: Endpoint used too frequent', error);
          } else {
            this.logger.error('Gmail contacts upload failed', error);
          }
          throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.UPLOAD);
      }
    });
  }

  /**
   * Retrieve a user's macOS address book contacts.
   * @returns {Promise} Resolves with the user's address book contacts that match on Wire
   */
  get_macos_contacts() {
    // TODO: Delete this block after uptake of wrapper builds including new address book implementation
    if (window.zAddressBook) {
      return Promise.resolve()
      .then(() => {
        const phone_book = this._parse_old_macos_contacts();

        if (phone_book.cards.length === 0) {
          this.logger.warn('No contacts found for upload');
          throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.NO_CONTACTS);
        }

        amplify.publish(z.event.WebApp.SEARCH.SHOW);
        this.logger.info(`Uploading hashes of '${phone_book.cards.length}' contacts for matching`, phone_book);
        return this.connect_service.post_onboarding(phone_book);
      })
      .then((response) => {
        this.logger.info(`macOS contacts upload successful: ${response.results.length} matches, ${response['auto-connects'].length} auto connects`, response);
        this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS);
        return response;
      })
      .catch((error) => {
        switch (error.type) {
          case z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD:
            throw error;
          case z.connect.ConnectError.TYPE.NO_CONTACTS:
            return {};
          default:
            if (error.code === z.service.BackendClientError.STATUS_CODE.TOO_MANY_REQUESTS) {
              this.logger.error('Backend refused macOS contacts upload: Endpoint used too frequent', error);
            } else {
              this.logger.error('macOS contacts upload failed', error);
            }
            throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.UPLOAD);
        }
      });
    }

    return this._parse_macos_contacts()
    .then((phone_book) => {
      if (phone_book.cards.length === 0) {
        this.logger.warn('No contacts found for upload');
        throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.NO_CONTACTS);
      }
      amplify.publish(z.event.WebApp.SEARCH.SHOW);
      this.logger.info(`Uploading hashes of '${phone_book.cards.length}' contacts for matching`, phone_book);
      return this.connect_service.post_onboarding(phone_book);
    })
    .then((response) => {
      this.logger.info(`macOS contacts upload successful: ${response.results.length} matches, ${response['auto-connects'].length} auto connects`, response);
      this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS);
      return response;
    })
    .catch((error) => {
      switch (error.type) {
        case z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD:
          throw error;
        case z.connect.ConnectError.TYPE.NO_CONTACTS:
          return {};
        default:
          if (error.code === z.service.BackendClientError.STATUS_CODE.TOO_MANY_REQUESTS) {
            this.logger.error('Backend refused macOS contacts upload: Endpoint used too frequent');
          } else {
            this.logger.error('macOS contacts upload failed', error);
          }
          throw new z.connect.ConnectError(z.connect.ConnectError.TYPE.UPLOAD);
      }
    });
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
   * Parse a user's macOS address book Contacts.
   * @private
   * @returns {z.connect.PhoneBook} Encoded phone book data
   */
  _parse_macos_contacts() {
    return new Promise((resolve) => {
      if (!window.wAddressBook) {
        return resolve(undefined);
      }
      const address_book = window.wAddressBook;
      const phone_book = new z.connect.PhoneBook(this.properties_repository.self());

      const {emails: self_emails, numbers: self_numbers} = address_book.getMe();
      self_emails.forEach((email) => {
        phone_book.self.push(email);
      });
      self_numbers.forEach((number) => {
        phone_book.self.push(number);
      });

      return address_book.getContacts((percentage) => {
        this.logger.info('Importing Contacts', percentage);
      },
      (contacts) => {
        contacts.forEach(({emails, firstName: first_name, lastName: last_name, numbers}) => {
          const card = {
            card_id: CryptoJS.MD5(`${first_name}${last_name}`).toString(),
            contact: [],
          };
          emails.forEach((email) => {
            card.contact.push(email.toLowerCase().trim());
          });
          numbers.forEach((number) => {
            card.contact.push(z.util.phone_number_to_e164(number, navigator.language));
          });

          if (card.contact.length > 0) {
            phone_book.cards.push(card);
          }
        });
        return resolve(this._encode_phone_book(phone_book));
      });
    });
  }


  // TODO: Delete this block after uptake of wrapper builds including new address book implementation
  _parse_old_macos_contacts() {
    if (!window.zAddressBook) {
      return;
    }

    const address_book = window.zAddressBook();
    const phone_book = new z.connect.PhoneBook(this.properties_repository.self());

    const {emails: self_emails, numbers: self_numbers} = address_book.getMe();
    self_emails.forEach((email) => {
      phone_book.self.push(email);
    });
    self_numbers.forEach((number) => {
      phone_book.self.push(number);
    });

    let index = 0;
    while (index < address_book.contactCount()) {
      const {emails, firstName: first_name, lastName: last_name, numbers} = address_book.getContact(index);
      const card = {
        card_id: CryptoJS.MD5(`${first_name}${last_name}`).toString(),
        contact: [],
      };
      emails.forEach((email) => {
        card.contact.push(email.toLowerCase().trim());
      });
      numbers.forEach((number) => {
        card.contact.push(z.util.phone_number_to_e164(number, navigator.language));
      });

      if (card.contact.length > 0) {
        phone_book.cards.push(card);
      }
      index++;
    }
    return this._encode_phone_book(phone_book);
  }


  /**
   * Parse a user's Google Contacts.
   *
   * @private
   * @param {Array} self - Self response from Google API
   * @param {Array} users - Contacts response from Google API
   * @returns {z.connect.PhoneBook} Encoded phone book data
   */
  _parse_google_contacts({author: self, entry: users}) {
    const phone_book = new z.connect.PhoneBook(this.properties_repository.self());

    // Add self info from Google
    if (self) {
      const google_email = self[0].email.$t.toLowerCase().trim();
      if (!this.properties_repository.self().email() === google_email) {
        phone_book.self.push(google_email);
      }
    }

    // Add Google contacts
    if (users) {
      users.forEach((user) => {
        if ((user.gd$email) || (user.gd$phoneNumber)) {
          const card = {
            card_id: user.gd$etag,
            contact: [],
          };

          if (user.gd$email) {
            user.gd$email.forEach((email) => {
              card.contact.push(email.address.toLowerCase().trim());
            });
          }

          if (user.gd$phoneNumber) {
            user.gd$phoneNumber.forEach((number) => {
              if (number.uri) {
                card.contact.push(number.uri);
              } else {
                card.contact.push(number.$t);
              }
            });
          }

          if (card.contact.length > 0) {
            phone_book.cards.push(card);
          }
        }
      });
    }
    return this._encode_phone_book(phone_book);
  }
};
