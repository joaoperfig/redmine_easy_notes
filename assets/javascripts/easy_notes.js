/* Redmine Easy Notes -- quick "add note" bar on the issue page. */
(function () {
  'use strict';

  if (typeof jQuery === 'undefined') { return; }

  jQuery(function ($) {
    var $wrap = $('#easy-notes');
    if ($wrap.length === 0) { return; }

    var $mini     = $('#easy-notes-mini');
    var $full     = $('#easy-notes-full');
    var $input    = $('#easy-notes-input');
    var $textarea = $('#easy-notes-textarea');
    var $form     = $('#easy-notes-form');
    var $toggle   = $('#easy-notes-private-toggle');
    var $private  = $('#easy-notes-private');
    var $miniSubmit = $('#easy-notes-mini-submit');

    /* --- position -----------------------------------------------------------
       The bar has to live inside an element carrying .journals, because that is
       what scopes core's journal-header styling. #history is that element, so
       appending puts the bar directly under the notes and it inherits the look
       for free. */
    var $history = $('#history');
    if ($history.length) {
      $history.append($wrap);
    } else {
      // No history block (shouldn't happen on issues/show) -- fall back to the
      // end of the issue details so the bar is at least reachable.
      $('div.issue.details').last().after($wrap);
    }
    $wrap.show();

    /* --- Add Note stays disabled while the one-liner is empty ---------------
       'input' covers typing, pasting, cutting, undo and drag-and-drop of text;
       'change' is a belt-and-braces for anything that sets the value without
       firing 'input'. Whitespace alone does not count as content, which keeps
       this consistent with the submit guard below. */

    function syncMiniSubmit() {
      if ($miniSubmit.length === 0) { return; }
      $miniSubmit.prop('disabled', $.trim($input.val()).length === 0);
    }

    $input.on('input change', syncMiniSubmit);
    syncMiniSubmit();

    /* --- public / private toggle -------------------------------------------
       The toggle and the full editor's checkbox are two views of one value, so
       they are kept in sync in both directions. Anything else lets the bar claim
       a note is public while the checkbox says otherwise. */

    function isPrivate() {
      return $toggle.hasClass('private');
    }

    function paintToggle() {
      var on = isPrivate();
      var label = $toggle.data(on ? 'label-private' : 'label-public');

      // Redmine puts a jQuery UI tooltip on every [title]. It caches the title
      // and restores that cached value when the tooltip closes, so simply
      // rewriting the attribute is not enough: toggling while the tooltip is
      // open would revert the label as soon as the pointer left. Destroy first,
      // then re-init through core's own helper so the options stay in step.
      var hadTooltip = !!$toggle.data('ui-tooltip');
      if (hadTooltip) {
        try { $toggle.tooltip('destroy'); } catch (e) { /* not initialised */ }
      }

      $toggle
        .toggleClass('private', on)
        .attr('aria-pressed', on ? 'true' : 'false')
        .attr('title', label);

      if (hadTooltip && typeof window.setupHoverTooltips === 'function') {
        window.setupHoverTooltips($toggle.parent());
      }
    }

    function setPrivate(on) {
      $toggle.toggleClass('private', !!on);
      if ($private.length) { $private.prop('checked', !!on); }
      paintToggle();
    }

    if ($toggle.length) {
      // Resolve the colour a checked checkbox actually paints, so a theme that
      // sets accent-color on checkboxes is matched instead of guessed at.
      if ($private.length && window.getComputedStyle) {
        var accent = window.getComputedStyle($private.get(0)).accentColor;
        if (accent && accent !== 'auto' && accent !== '') {
          $wrap.get(0).style.setProperty('--easy-notes-private-color', accent);
        }
      }

      setPrivate($private.length ? $private.prop('checked') : false);

      $toggle.on('click', function (e) {
        e.preventDefault();
        setPrivate(!isPrivate());
      });

      // Changing the checkbox in the full editor must move the toggle too.
      $private.on('change', function () {
        setPrivate($private.prop('checked'));
      });
    }

    function expand(carryText) {
      // Carry the one-liner over, but never clobber text the user already typed
      // in the full editor and then cancelled out of.
      if (carryText && $input.val().length && $textarea.val().length === 0) {
        $textarea.val($input.val());
      }
      // Carry the toggle state onto the checkbox.
      if ($toggle.length && $private.length) {
        $private.prop('checked', isPrivate());
      }
      $mini.hide();
      $full.show();
      $textarea.trigger('focus');
    }

    function collapse() {
      // Deliberately does NOT copy back into the one-liner.
      $full.hide();
      $mini.show();
      // The one-liner may have been emptied since the button was last enabled.
      syncMiniSubmit();
      $input.trigger('focus');
    }

    $('#easy-notes-expand').on('click', function (e) {
      e.preventDefault();
      expand(true);
    });

    $('#easy-notes-cancel').on('click', function (e) {
      e.preventDefault();
      collapse();
    });

    /* --- quoting an existing note ------------------------------------------
       Core's quote button is a Stimulus action posting to journals#new, and the
       response script (app/views/journals/new.js.erb) does:

         $('#update').show(); showAndScrollTo("add_notes");
         var notes = $('#issue_notes').val(); if (notes > "") { notes = notes + "\n\n" }
         $('#issue_notes').blur().focus().val(notes + <quote>);
         [ $('#issue_private_notes').prop('checked', true); ]

       so by default quoting reopens the whole issue edit form. That view has no
       hook, and the quote block is built server-side, so the only interception
       point is showAndScrollTo. "add_notes" is passed by nothing else on this
       page -- the Edit link passes "update" -- which makes the test safe.

       If core ever stops calling showAndScrollTo("add_notes"), none of this
       fires and quoting simply falls back to core's own behaviour. */

    var $coreUpdate  = $('#update');
    var $coreNotes   = $('#issue_notes');
    var $corePrivate = $('#issue_private_notes');
    var coreShowAndScrollTo = window.showAndScrollTo;

    // If the user already had core's edit form open, they are editing the issue
    // and quoting should stay where they are looking. Recorded at click time
    // because the response script shows #update before showAndScrollTo runs, so
    // by then it is too late to tell. Stimulus is bound to the link itself and
    // only starts an async POST, so this delegated handler still sees the
    // pre-request state.
    var coreFormWasOpen = false;
    $(document).on('click', '[data-action*="quote-reply#quote"]', function () {
      coreFormWasOpen = $coreUpdate.length ? $coreUpdate.is(':visible') : false;
    });

    function adoptQuote(previousNotes, wasPrivate) {
      var written = $coreNotes.val();
      var quote = written;

      // The response appends to whatever core's textarea held, so take that
      // prefix -- and the "\n\n" separator core adds -- back off.
      if (previousNotes && written.indexOf(previousNotes) === 0) {
        quote = written.slice(previousNotes.length);
      }
      quote = quote.replace(/^\s*\n/, '');

      var nowPrivate = $corePrivate.length ? $corePrivate.prop('checked') : false;

      // Leave core's form exactly as it was; it is not the editor in use.
      $coreNotes.val(previousNotes);
      if ($corePrivate.length) { $corePrivate.prop('checked', wasPrivate); }

      if ($.trim(quote).length === 0) { return; }

      // Keep whatever was already being written. expand() carries the one-liner
      // across under the usual rule, so this covers text in either editor.
      expand(true);

      var existing = $textarea.val();
      if ($.trim(existing).length) {
        $textarea.val(existing.replace(/\s*$/, '') + '\n\n' + quote);
      } else {
        $textarea.val(quote);
      }

      // Quoting a private note keeps the reply private. Core only ever turns
      // this on, so this never silently makes a note public.
      if (nowPrivate && !wasPrivate) { setPrivate(true); }

      var el = $textarea.get(0);
      $textarea.trigger('focus');
      if (el.setSelectionRange) {
        el.setSelectionRange(el.value.length, el.value.length);
      }
      if ($wrap.get(0).scrollIntoView) {
        $wrap.get(0).scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }

    if (typeof coreShowAndScrollTo === 'function' && $coreNotes.length) {
      window.showAndScrollTo = function (id, focus) {
        if (id === 'add_notes' && !coreFormWasOpen) {
          var previousNotes = $coreNotes.val();
          var wasPrivate = $corePrivate.length ? $corePrivate.prop('checked') : false;
          // Hide core's form again in the same tick, so it never paints.
          $coreUpdate.hide();
          setTimeout(function () { adoptQuote(previousNotes, wasPrivate); }, 0);
          return;
        }
        return coreShowAndScrollTo.apply(this, arguments);
      };
    }

    /* Enter in the one-liner submits. The button lives outside the form (it uses
       the form= attribute) so the browser will not do this for us.

       Shift+Enter means "this is going to be more than one line", so it moves to
       the full editor instead of submitting. The one-liner is an <input>, which
       cannot hold a line break, so nothing is inserted natively and both keys
       arrive here as keyCode 13. */
    $input.on('keydown', function (e) {
      if (e.which !== 13) { return; }
      e.preventDefault();

      if (e.shiftKey) {
        expand(true);
        var el = $textarea.get(0);
        // Add the line break the user asked for, but not a leading blank line
        // when there was nothing typed yet.
        if (el.value.length) { $textarea.val(el.value + '\n'); }
        if (el.setSelectionRange) {
          el.setSelectionRange(el.value.length, el.value.length);
        }
        return;
      }

      $form.trigger('submit');
    });

    $form.on('submit', function (e) {
      if ($full.is(':hidden')) {
        $textarea.val($input.val());
        if ($toggle.length && $private.length) {
          $private.prop('checked', isPrivate());
        }
      }
      if ($.trim($textarea.val()).length === 0) {
        e.preventDefault();
        ($full.is(':hidden') ? $input : $textarea).trigger('focus');
      }
    });

    /* --- dropping a file on the one-liner ----------------------------------
       Open the full editor and hand the files to core's uploader. Setting
       handleFileDropEvent.target to the textarea is what makes core insert the
       inline !image! markup, since it checks that the drop target is a
       .wiki-edit field. */
    if (window.File && window.FileList && window.FormData &&
        typeof window.uploadAndAttachFiles === 'function') {

      $mini.on('dragover dragenter', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $mini.addClass('fileover');
      });

      $mini.on('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $mini.removeClass('fileover');
      });

      $mini.on('drop', function (e) {
        var dt = e.originalEvent && e.originalEvent.dataTransfer;
        if (!dt || !dt.files || dt.files.length === 0) { return; }

        e.preventDefault();
        e.stopPropagation();
        $mini.removeClass('fileover');

        expand(true);

        var $fileField = $form.find('input:file.filedrop').first();
        if ($fileField.length === 0) { return; }

        if (typeof window.handleFileDropEvent === 'function') {
          window.handleFileDropEvent.target = $textarea.get(0);
        }
        window.uploadAndAttachFiles(dt.files, $fileField);
      });
    }
  });
})();
