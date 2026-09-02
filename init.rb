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

  # Switchable per project, under Project settings -> Modules. Where it is off,
  # the issue page is left exactly as core renders it: no bar, no stylesheet, no
  # script, and therefore core's own Quote behaviour.
  #
  # A module only appears in that list if at least one permission names it,
  # because AccessControl.available_project_modules is derived from the
  # permission list. So this marker permission exists only to register the
  # module. It is public on purpose: Role#setable_permissions subtracts the
  # public permissions, so it never shows in the role form, no role gains or
  # loses anything, and nobody has to re-tick a box after installing this.
  project_module :easy_notes do
    permission :view_easy_notes, {}, public: true
  end
end

require File.expand_path('lib/redmine_easy_notes/hooks', __dir__)
