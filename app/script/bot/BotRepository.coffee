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
z.bot ?= {}

class z.bot.BotRepository
  constructor: (@bot_service, @conversation_repository) ->
    @logger = new z.util.Logger 'z.bot.BotRepository', z.config.LOGGER.OPTIONS

  # Add bot to conversation.
  add_bot: (bot_name, create_conversation = true) =>
    bot_result = undefined

    @bot_service.fetch_bot bot_name
    .then (result) =>
      bot_result = result
      @logger.info "Info for bot '#{bot_name}' retrieved", bot_result
      if create_conversation
        @conversation_repository.create_new_conversation [], bot_result.name or bot_name
    .then (conversation_et) =>
      conversation_et ?= @conversation_repository.active_conversation()
      @conversation_repository.add_bot conversation_et, bot_result.provider, bot_result.service
      amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et
