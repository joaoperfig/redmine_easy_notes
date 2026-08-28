# frozen_string_literal: true

module RedmineEasyNotes
  # Renders the quick-note bar from inside issues/show.html.erb.
  #
  # This hook, and not :view_layouts_base_content, is deliberate: the partial needs
  # wikitoolbar_for, which calls heads_for_wiki_formatter, which uses
  # content_for :header_tags. The layout yields :header_tags near the top of <head>,
  # so anything contributed from a hook that fires inside the *layout* arrives too
  # late and the jstoolbar assets are silently never loaded. Hooks that fire inside
  # the template still work, because Rails renders the template before the layout.
  class Hooks < Redmine::Hook::ViewListener
    render_on :view_issues_show_details_bottom, partial: 'hooks/easy_notes'
  end
end
