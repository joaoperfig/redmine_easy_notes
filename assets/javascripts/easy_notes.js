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

    // Enter in the one-liner submits; the button lives outside the form (it uses
    // the form= attribute) so the browser will not do this for us.
    $input.on('keydown', function (e) {
      if (e.which === 13) {
        e.preventDefault();
        $form.trigger('submit');
      }
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
