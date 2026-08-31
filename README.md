# Redmine Easy Notes

Adds a one-line "Add note" box under the issue history, so leaving a comment does
not mean opening the whole issue edit form.

Redmine has no way to add a note without revealing the full editor, which also
exposes the subject, description and every other attribute. That makes it easy to
change the issue by accident on the way to commenting. See
[feature #3143](https://www.redmine.org/issues/3143), open since 2009 and still
not in core.

## What you get

A bar styled like a journal entry appears below the notes. It contains:

* a one-line text field, placeholder "Add your note"
* an "Open full editor" icon that swaps the bar for the full editor (jstoolbar,
  preview, `@`-mention autocomplete, private notes, attachments), keeping
  whatever was typed
* a public/private toggle: a `spy-off` icon labelled "Public Note" that flips to
  `spy` labelled "Private Note", coloured like a checked checkbox
* an "Add Note" button, disabled until the field has something in it

## Keys and behaviour

| Action | Result |
|---|---|
| Enter | Submits the note |
| Shift+Enter | Opens the full editor, keeping the text and adding the line break |
| Cancel in the full editor | Discards the note and returns to the one-liner, both boxes empty |
| Drop a file on the one-liner | Opens the full editor, attaches the file and inserts the inline image markup, exactly as core does |
| Quote on an existing note | Lands in this editor instead of reopening the issue edit form |

Quoting keeps whatever was already being written and appends the quote after it.
Quoting a private note keeps the reply private. If the issue edit form is already
open when you click Quote, quoting is left alone: you are editing the issue, so
the quote stays where you are looking.

The toggle and the full editor's "Private notes" checkbox are two views of one
value and stay in sync both ways, so the bar cannot claim a note is public while
the checkbox disagrees. Cancel does not reset it: the toggle is visible on the
bar, and quietly flipping a note back to public is the one mistake here with a
real consequence.

There is one note being composed at a time, and one of the two editors is
showing it. Switching hands the text over instead of leaving a copy behind, so
the two boxes cannot drift apart and show different things.

## Why it cannot cause an edit conflict

The form submits only `issue[notes]`, plus `issue[private_notes]` where
permitted, to the stock `PATCH /issues/:id`. It never sends `lock_version`, so a
note cannot fail with `ActiveRecord::StaleObjectError` because somebody else
touched the issue meanwhile. That is the actual complaint in #3143, and core does
the same thing in its own `conflict_resolution` handling.

No Ruby is monkey-patched. There is no new controller, route, model, migration or
permission. `Issue#safe_attributes` guards `notes` with `notes_addable?`, while
`subject`, `description` and `lock_version` sit behind `attributes_editable?`, so
core itself refuses anything this form does not send.

## The one wrapped function

Sending the Quote button here needs a single client-side wrapper, around
`showAndScrollTo`. Core's quote button posts to `journals#new`, and the response
script (`app/views/journals/new.js.erb`) reveals the edit form and writes into
`#issue_notes`. That view has no hook, and the quote block is built server-side,
so there is nothing else to intercept.

The wrapper acts only on `showAndScrollTo("add_notes")`, which nothing else on
the issue page passes; the Edit link passes `"update"`. Every other call is
delegated to the original function untouched. If a future Redmine stops calling
it, the wrapper never fires and quoting falls back to core's behaviour rather
than breaking.

## Permissions

The bar renders only when `@issue.notes_addable?`, which is the "Add notes"
(`add_issue_notes`) permission. The private toggle and checkbox appear only with
`set_notes_private`. The attachment field appears only when
`attachments_addable?`.

## Requirements

Redmine 7.0.0 or later. The markup mirrors Redmine 7's journal header
(`sprite_icon`, flex `.journal-header`, `textarea_tag`), so earlier versions are
untested. No gems, no migrations.

## Install

```bash
cd {REDMINE_ROOT}/plugins
git clone https://github.com/joaoperfig/redmine_easy_notes.git
cd ..
RAILS_ENV=production bin/rails assets:precompile
```

Then restart Redmine. The restart is not optional. Propshaft resolves
`.manifest.json` once at boot, so a running server keeps serving the old asset
digests and the plugin looks like it did nothing.

## Theming

The private toggle's colour is read at runtime from the computed `accent-color`
of the real "Private notes" checkbox, so a theme that sets `accent-color` on
checkboxes is matched without configuration. Where that resolves to `auto`, the
CSS system colour `AccentColor` is used. To force a colour, set the property:

```css
#easy-notes { --easy-notes-private-color: #e90062; }
```

The "Add Note" button is an `<input type="submit">` rather than a
`<button type="submit">` on purpose. Themes reliably style `input[type=submit]`
and frequently miss the `button` form, so a `button` silently loses the theme's
colours and hover.

## Licence

GPL-2.0-or-later, matching Redmine.

The `spy` and `spy-off` icons in `assets/images/icons.svg` come from
[Tabler Icons](https://tabler.io/icons) (MIT, (c) 2020-2024 Pawel Kuna), the same
set Redmine core draws its own sprite from, so they match visually.
