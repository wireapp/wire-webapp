#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.connect ?= {}

# Connect Repository for all address book interactions with the connect service.
class z.connect.ConnectRepository
  ###
  Construct a new Connect Repository.

  @param connect_service [z.connect.ConnectService] Backend REST API service implementation
  @param connect_google_service [z.connect.ConnectGoogleService] Google REST API implementation
  @param properties_repository [z.properties.PropertiesRepository] Repository for all user property interactions
  ###
  constructor: (@connect_service, @connect_google_service, @properties_repository) ->
    @logger = new z.util.Logger 'z.connect.ConnectRepository', z.config.LOGGER.OPTIONS

  ###
  Retrieve a user's Google Contacts.
  @return [Promise] Promise that resolves with the user's Google contacts that match on Wire
  ###
  get_google_contacts: ->
    return new Promise (resolve, reject) =>
      @connect_google_service.get_contacts()
      .catch (error) =>
        @logger.info 'Google Contacts SDK error', error
        throw new z.connect.ConnectError z.connect.ConnectError::TYPE.GOOGLE_DOWNLOAD
      .then (response) =>
        amplify.publish z.event.WebApp.SEARCH.SHOW
        return @_parse_google_contacts response
      .then (phone_book) =>
        if phone_book.cards.length is 0
          @logger.warn 'No contacts found for upload'
          throw new z.connect.ConnectError z.connect.ConnectError::TYPE.NO_CONTACTS
        else
          @logger.info "Uploading hashes of '#{phone_book.cards.length}' contacts for matching", phone_book
          return @connect_service.post_onboarding phone_book
      .then (response) =>
        @logger.info "Gmail contacts upload successful: #{response.results.length} matches, #{response['auto-connects'].length} auto connects", response
        @properties_repository.save_preference_contact_import_google Date.now()
        resolve response
      .catch (error) =>
        if error instanceof z.connect.ConnectError
          switch error.type
            when z.connect.ConnectError::TYPE.GOOGLE_DOWNLOAD
              reject error
            when z.connect.ConnectError::TYPE.NO_CONTACTS
              resolve []
        else
          if error.code is z.service.BackendClientError::STATUS_CODE.TOO_MANY_REQUESTS
            error_message = 'Backend refused Gmail contacts upload: Endpoint used too frequent'
            @logger.error error_message
          else
            @logger.error 'Gmail contacts upload failed', error
          reject new z.connect.ConnectError z.connect.ConnectError::TYPE.UPLOAD

  ###
  Retrieve a user's macOS address book contacts.
  @return [Promise] Promise that resolves with the user's address book contacts that match on Wire
  ###
  get_macos_contacts: ->
    @_parse_macos_contacts()
    .then (phone_book) =>
      if phone_book.cards.length is 0
        @logger.warn 'No contacts found for upload'
        throw new z.connect.ConnectError z.connect.ConnectError::TYPE.NO_CONTACTS
      else
        amplify.publish z.event.WebApp.SEARCH.SHOW
        @logger.info "Uploading hashes of '#{phone_book.cards.length}' contacts for matching", phone_book
        return @connect_service.post_onboarding phone_book
    .then (response) =>
      @logger.info "macOS contacts upload successful: #{response.results.length} matches, #{response['auto-connects'].length} auto connects", response
      @properties_repository.save_preference_contact_import_macos Date.now()
      return response
    .catch (error) =>
      if error.code is z.service.BackendClientError::STATUS_CODE.TOO_MANY_REQUESTS
        error_message = 'Backend refused macOS contacts upload: Endpoint used too frequent'
        @logger.error error_message
      else
        @logger.error 'macOS contacts upload failed', error
        throw new z.connect.ConnectError z.connect.ConnectError::TYPE.UPLOAD

  ###
  Encode phone book

  @private
  @param phone_book [z.connect.PhoneBook] Object containing un-encoded phone book data
  @return [z.connect.PhoneBook] Object containing encoded phone book data
  ###
  _encode_phone_book: (phone_book) ->
    for entry, index in phone_book.self
      phone_book.self[index] = z.util.encode_sha256_base64 entry

    for card, card_index in phone_book.cards
      for contact, contact_index in card.contact
        card.contact[contact_index] = z.util.encode_sha256_base64 contact
      phone_book.cards[card_index] = card

    return phone_book

  ###
  Parse a user's macOS address book Contacts.
  @private
  @return [z.connect.PhoneBook] Encoded phone book data
  ###
  _parse_macos_contacts: ->
    return new Promise (resolve, reject) =>
      return resolve undefined if not window.wAddressBook
      address_book = window.wAddressBook
      phone_book = new z.connect.PhoneBook @properties_repository.self()

      me = address_book.getMe()
      for email in me.emails
        phone_book.self.push email
      for number in me.numbers
        phone_book.self.push number

      address_book.getContacts ((percentage) =>
        @logger.info 'Importing Contacts', percentage
      ), (contacts) =>
        for contact in contacts
          card =
            contact: []
            card_id: CryptoJS.MD5("#{contact.firstName}#{contact.lastName}").toString()
          for email in contact.emails
            card.contact.push email.toLowerCase().trim()
          for number in contact.numbers
            card.contact.push z.util.phone_number_to_e164 number, navigator.language

          if card.contact.length > 0
            phone_book.cards.push card
        resolve @_encode_phone_book phone_book


  ###
  Parse a user's Google Contacts.
  @private
  @param response [JSON] Response from Google API
  @return [z.connect.PhoneBook] Encoded phone book data
  ###
  _parse_google_contacts: (response) ->
    phone_book = new z.connect.PhoneBook @properties_repository.self()

    # Add self info from Google
    if response.feed.author?
      self = response.feed.author
      google_email = self[0].email.$t.toLowerCase().trim()
      if not @properties_repository.self().email() is google_email
        phone_book.self.push google_email

    # Add Google contacts
    if response.feed.entry?
      users = response.feed.entry
      for user in users
        if user.gd$email? or user.gd$phoneNumber?
          card =
            contact: []
            card_id: user.gd$etag

          if user.gd$email?
            for email in user.gd$email
              card.contact.push email.address.toLowerCase().trim()

          if user.gd$phoneNumber?
            for number in user.gd$phoneNumber
              if number.uri?
                card.contact.push number.uri
              else
                card.contact.push number.$t

          phone_book.cards.push card
    return @_encode_phone_book phone_book
