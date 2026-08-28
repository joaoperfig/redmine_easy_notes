# frozen_string_literal: true

require 'redmine'

Redmine::Plugin.register :redmine_easy_notes do
  name 'Redmine Easy Notes'
  author 'joaoperfig'
  description 'Adds a one-line "Add note" box under the issue history, so a comment can be ' \
              'left without opening the full issue edit form.'
  version '1.0.0'
  url 'https://github.com/joaoperfig/redmine_easy_notes'
  author_url 'https://github.com/joaoperfig'

  # The markup mirrors Redmine 7's journal header (sprite_icon, flex .journal-header,
  # textarea_tag). Earlier versions are untested -- widen this if you verify one.
  requires_redmine version_or_higher: '7.0.0'
end

require File.expand_path('lib/redmine_easy_notes/hooks', __dir__)
