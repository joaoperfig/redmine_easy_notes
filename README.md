# Redmine Easy Notes

Adds a one-line **Add note** box under the issue history, so leaving a comment does
not mean opening the whole issue edit form.

Redmine has no way to add a note without revealing the full editor, which also
exposes the subject, description and every other attribute — so it is easy to
change the issue by accident on the way to commenting. This is
[feature #3143](https://www.redmine.org/issues/3143), open since 2009 and still
not in core.

## What it looks like

A bar styled like a journal entry appears below the notes:

* a one-line text field (*"Add your note"*),
* an **Open full editor** icon, which swaps the bar for the full editor —
  jstoolbar, preview, `@`-mention autocomplete, private notes and attachments —
  carrying over whatever was typed,
* a **public/private toggle** — a `spy-off` icon labelled *"Public Note"* that
  flips to `spy`, labelled *"Private Note"*, coloured like a checked checkbox,
* an **Add Note** button, disabled until the field has something in it.

The toggle and the full editor's *Private notes* checkbox are two views of one
value and stay in sync in both directions, so the bar can never claim a note is
public while the checkbox says otherwise. It appears only where the *Private
notes* checkbox would — the `set_notes_private` permission.

**Cancel** in the full editor returns to the one-liner. Dropping a file on the
one-liner opens the full editor and attaches it, inserting the inline image
markup exactly as core does.

The **Quote** button on an existing note also lands here instead of reopening the
issue edit form. Whatever was already being written is kept and the quote is
appended after it, and quoting a private note keeps the reply private. If the
issue edit form happens to be open already, quoting is left alone — you are
editing the issue, so the quote stays where you are looking.

## Why it cannot cause an edit conflict

The form submits **only** `issue[notes]` (plus `issue[private_notes]` where
permitted) to the stock `PATCH /issues/:id`. It never sends `lock_version`, so a
note can never fail with `ActiveRecord::StaleObjectError` because somebody else
touched the issue meanwhile — which is the actual complaint in #3143. Core itself
does the same thing in its `conflict_resolution` handling.

No Ruby is monkey-patched, and there is no new controller, route, model,
migration or permission: `notes` is guarded by `notes_addable?` in
`Issue#safe_attributes` while `subject`, `description` and `lock_version` sit
behind `attributes_editable?`, so core refuses anything this form does not send.

## The one wrapped function

Redirecting the **Quote** button needs a single client-side wrapper, around
`showAndScrollTo`. Core's quote button posts to `journals#new` and the response
script — `app/views/journals/new.js.erb` — reveals the edit form and writes into
`#issue_notes`. That view has no hook and the quote block is built server-side,
so there is nothing else to intercept.

The wrapper only acts on `showAndScrollTo("add_notes")`, which nothing else on
the issue page passes (the Edit link passes `"update"`); everything else is
delegated to the original untouched. If a future Redmine stops calling it, the
wrapper never fires and quoting falls back to core's own behaviour rather than
breaking.

## Permissions

The bar renders only when `@issue.notes_addable?` — the **Add notes**
(`add_issue_notes`) permission. The *Private notes* checkbox appears only with
`set_notes_private`, and the attachment field only when `attachments_addable?`.

## Requirements

Redmine **>= 7.0.0**. The markup mirrors Redmine 7's journal header
(`sprite_icon`, flex `.journal-header`, `textarea_tag`); earlier versions are
untested. No gems, no migrations.

## Install

```bash
cd {REDMINE_ROOT}/plugins
git clone https://github.com/joaoperfig/redmine_easy_notes.git
cd ..
RAILS_ENV=production bin/rails assets:precompile
```

Then restart Redmine. The restart is not optional: Propshaft resolves
`.manifest.json` once at boot, so a running server keeps serving the old asset
digests and the plugin looks like it did nothing.

## Theming

The private-toggle colour is read at runtime from the computed `accent-color` of
the real *Private notes* checkbox, so a theme that sets `accent-color` on
checkboxes is matched without configuration. Where that resolves to `auto` the
CSS system colour `AccentColor` is used. To force a colour, set the property:

```css
#easy-notes { --easy-notes-private-color: #e90062; }
```

The **Add Note** button is an `<input type="submit">` rather than a
`<button type="submit">` on purpose: themes reliably style
`input[type=submit]` and frequently miss the `button` form, so a `button`
silently loses the theme's colours and hover.

## Licence

GPL-2.0-or-later, matching Redmine.

The `spy` and `spy-off` icons in `assets/images/icons.svg` are from
[Tabler Icons](https://tabler.io/icons) (MIT, © 2020-2024 Paweł Kuna) — the same
set Redmine core draws its own sprite from, so they match visually.
