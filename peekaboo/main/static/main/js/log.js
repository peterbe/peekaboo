var Log = (function() {
  var latest = null;
  var reload_interval = null;

  function make_timeago($element) {
    var datetime = $element.attr('datetime');
    var format = $element.attr('data-format');
    var parsed = moment(datetime);
    $element.text(parsed.format(format));
    $element.timeago();
  }

  function open_edit_entry(id) {
    var url = getURL(id);
    $('#edit-entry form')
      .attr('action', url)
      .data('id', id);
    $.getJSON(url, function(response) {
      var container = $('#edit-entry');
      if (response.thumbnail) {
        $('.thumbnail img', container)
          .attr('src', response.thumbnail.url)
          .attr('width', response.thumbnail.width)
          .attr('height', response.thumbnail.height);
        $('.thumbnail', container).show();
      } else {
        $('.thumbnail', container).hide();
      }
      $.each(response, function(key, value) {
        $('[name="' + key + '"]', container).val(value);
      });
      container.modal();
    });
  }

  /* these three from https://developer.mozilla.org/en-US/docs/Printing */
  function closePrint () {
    document.body.removeChild(this.__container__);
  }

  function setPrint () {
    this.contentWindow.__container__ = this;
    this.contentWindow.onbeforeunload = closePrint;
    this.contentWindow.onafterprint = closePrint;
    this.contentWindow.print();
  }

  function printPage (sURL) {
    var oHiddFrame = document.createElement("iframe");
    oHiddFrame.onload = setPrint;
    oHiddFrame.style.visibility = "hidden";
    oHiddFrame.style.position = "fixed";
    oHiddFrame.style.right = "0";
    oHiddFrame.style.bottom = "0";
    oHiddFrame.src = sURL;
    document.body.appendChild(oHiddFrame);
  }

  function open_print_entry(id) {
    var url = getPrintURL(id);
    /* SADLY Firefox does not support printing PDFs in iframes :(
     * Waiting for:
     * https://bugzilla.mozilla.org/show_bug.cgi?id=874200
     *
     * Also, see...
     * https://bugzilla.mozilla.org/show_bug.cgi?id=647658
     * http://storage.michaelaquilina.com/ff-print/
     * http://stackoverflow.com/questions/15011799/firefox-19-print-pdf-from-javascript
     * http://jsfiddle.net/hytcX/3/
     *
     * So for now, we have to rely on window.open(url) or use Chrome :)
     */
    //printPage(url);
    open(url);
  }

  function submit_edit_entry(event) {
    var $form = $(this);
    var req = $.post($form.attr('action'), $form.serializeObject());
    req.then(function(response) {
      var $entry = $('#entry-' + $form.data('id'));
      _fill_row_data($entry, response);
      $entry.addClass('new');
      $('#edit-entry').modal('hide');
    });
    req.fail(function(jqXHR, textStatus, errorThrown) {
      Utils.ajax_error("Unable to save",
                       "An error occured when trying to save the edit.");
      console.warn('textStatus', textStatus);
      console.warn('errorThrown', errorThrown);

    });
    return false;
  }

  function add_rows(rows, highlight) {
    var parent = $('#entries');
    var template = $('#entry-template .entry');
    $.each(rows, function(i, row) {
      var copy = template.clone();
      if (highlight) {
        copy.addClass('new');
        setTimeout(function() {
          $('.new').removeClass('new');
        }, 3 * 1000);
      }
      copy.data('id', row.id);
      copy.attr('id', 'entry-' + row.id);
      _fill_row_data(copy, row);
      $('button.edit', copy).on('click', function() {
        open_edit_entry($(this).parents('.entry').data('id'));
        return false;
      });
      $('button.print', copy).on('click', function() {
        open_print_entry($(this).parents('.entry').data('id'));
        return false;
      });
      $('button.delete', copy).on('click', function() {
        $('.delete-confirmation').hide();
        var parent = $(this).parents('.entry');
        $('.delete-confirmation', parent).show();
        return false;
      });
      $('button.delete-confirm', copy).on('click', function() {
        var $form = $('#delete-entry form');
        var $parent = $(this).parents('.entry');
        var id = $parent.data('id');
        $('input[name="id"]', $form).val(id);
        var url = getURL(id, true);
        $.post(url, $form.serializeObject(), function(response) {
          $parent.fadeOut(400);
        });
        return false;
      });
      $('button.delete-cancel', copy).on('click', function() {
        var parent = $(this).parents('.entry');
        $('.delete-confirmation', parent).hide();
        return false;
      });
      copy.prependTo(parent);
      make_timeago($('time', copy));
    });
  }

  function modify_rows(rows, highlight) {
    $.each(rows, function(i, row) {
      var entry = $('#entry-' + row.id);
      if (highlight) {
        entry.addClass('new');
        setTimeout(function() {
          $('.new').removeClass('new');
        }, 3 * 1000);
      }
      _fill_row_data(entry, row);
      make_timeago($('time', entry));
    });
  }

  function toggle_show_confirmation(element) {
  }

  function _fill_row_data(container, data) {
    container.data('modified', data.modified_iso);
    $('.name', container).text(data.name);
    $('.job_title', container).text(data.job_title);
    $('.company', container).text(data.company);
    $('.visiting', container).text(data.visiting);
    $('.email a', container)
      .attr('href', 'mailto:' + data.email)
      .text(data.email);
    $('time', container)
      .attr('datetime', data.created_iso)
      .text(data.created);
    if (data.thumbnail) {
      $('a', container)
        .attr('title', data.name)
        .attr('href', data.picture_url)
        .magnificPopup({type:'image'});
      $('img', container)
        .attr('src', data.thumbnail.url)
        .attr('width', data.thumbnail.width)
        .attr('height', data.thumbnail.height)
        .attr('alt', data.name)
        .show();
    } else {
      $('img', container).hide();
    }
  }

  function getURL(id, delete_, print) {
    var locale = location.pathname.split('/')[1];
    var location_ = location.pathname.split('/')[3];
    var start = '/' + locale + '/log/' ;
    if (id) {
      if (delete_) {
        return start + 'entry/' + id + '/delete/';
      } else if (print) {
        //return start + 'entry/' + id + '/print/?print=&iframe=true';
        return start + 'entry/' + id + '/print.pdf';
      } else {
        return start + 'entry/' + id + '/';
      }
    }
    return start + location_ + '/entries/';
  }

  function getPrintURL(id) {
    return getURL(id, false, true);
  }

  function fetch(highlight) {
    var req = $.getJSON(getURL(), {latest: latest});
    req.then(function(response) {
      if (response.latest) {
        latest = response.latest;
      }
      add_rows(response.created, highlight);
      modify_rows(response.modified, highlight);
    });
    req.fail(function(jqXHR, textStatus, errorThrown) {
      // it failed :(
      Utils.ajax_error("Auto-refresh stopped working",
                       "An error happened server-side. Reload this page to re-enable auto-refresh.");
      clearInterval(reload_interval);
      $('#auto-refresh-enabled').hide();
      $('#auto-refresh-stopped').show();
      console.warn('textStatus', textStatus);
      console.warn('errorThrown', errorThrown);
    });
  }

  return {
    init: function() {
      fetch(false);
      setTimeout(function() {
        reload_interval = setInterval(function() {
          fetch(true);
        }, 5 * 1000);
      }, 10 * 1000);
      $('#edit-entry form').submit(submit_edit_entry);
    }
  };
})();


$.fn.serializeObject = function() {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function() {
    if (o[this.name] !== undefined) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};


$(function() {
  Log.init();
});
