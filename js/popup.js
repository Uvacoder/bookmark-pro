function init() {
  getBookmarks();
  getTabInfo();
}



var tabTitle, tabUrl;

function getTabInfo() {

  //Get active tab title and URL
  //Append any selected text to title
  chrome.tabs.query({active: true, currentWindow: true}, function(tab){
      chrome.tabs.sendMessage(tab[0].id, {method: "getSelection"},
      function(response){
        if (response) {
          var selectedText = response.data;
        }
        tabUrl = tab[0].url;
        tabTitle = tab[0].title;
        $('#input-url').val(tabUrl);
        if (selectedText) {
          $('#input-title').val('"'+ selectedText +'" - ' + tabTitle);
        } else {
          $('#input-title').val(tabTitle);
        }
      });
  });

  //Bind save event
  //This should use an updated tabTitle and tabUrl value
  $('#saveBookmark').on('click', function(){
    var folderId = $("#select-folder").select2("val");
    tabTitle = $('#input-title').val();
    tabUrl = $('#input-url').val();
    chrome.bookmarks.create({'parentId': folderId, 'title': tabTitle, 'url': tabUrl });
    window.close();
  });

  $(window).keydown(function (e){
      if(e.keyCode == 13){
        if ($('.select2-container--focus').length > 0) {
          return;
        } else {
          $('#saveBookmark').trigger('click');
        }
      } else if (e.keyCode == 27) {
        window.close();
      } else if (e.keyCode == 9) {
        setTimeout(function(e){
          if ($('.select2-container--focus').length > 0) {
            $('#select-folder').select2('open');
          }
        },1 );
      }
  })

  $(document).on('focus', 'input, select', function(e){
    console.log('focus change');
    $('.is-focused').removeClass('is-focused');
    if ($(this).closest('.input-group').length > 0) {
      $(this).closest('.input-group').addClass('is-focused');
    } else if ($(this).closest('.select2-container').length > 0) {
      $('.select2-group').addClass('is-focused');
    }

  });

}

function getBookmarks(){

  //Get recently-saved bookmarks in order to find recently-saved-to folders
  var recentParents = new Array();
  chrome.bookmarks.getRecent(15, function(bookmarks){
    var i;
    var count = 0;
    for (i = 0; i < bookmarks.length; i++) {
      if (!isInArray(parseInt(bookmarks[i].parentId), recentParents) ) {
        if (count < 4) {
          count++;
          recentParents[recentParents.length] = parseInt(bookmarks[i].parentId);
          if (i > 0) {
            chrome.bookmarks.get(bookmarks[i].parentId, function(parent){
              var button = $('<button class="js-use-this-folder">');
              button.attr('data-id', parseInt(parent[0].id));
              button.text(parent[0].title);
              $('#recent-folders').append(button);
            });
          }
        }
      }
    }
    $(document).on('click', '.js-use-this-folder', function(e){
      e.preventDefault();
      $("#select-folder").select2("val", $(this).data('id'));
    });
  });


  var bookmarksBarId;
  //Get bookmarks and create dropdown menu
  chrome.bookmarks.getTree(
    function(bookmarkTreeNode){
      bookmarksBarId = bookmarkTreeNode[0].children[0].id;
      getBookmarkFoldersWithin(bookmarksBarId);
  });

  function getBookmarkFoldersWithin(bookmarksBarId) {
    //Get bookmarks and create dropdown menu
    chrome.bookmarks.getSubTree( bookmarksBarId,
      function(bookmarkTreeNode){
        var bookmarkItems = bookmarkTreeNode[0].children;
        var i;
        var optGroup = $('<optgroup label="Bookmarks Bar">');

        for (i = 0; i < bookmarkItems.length; i++ ) {
          var item = bookmarkItems[i];
          if (item.children) {
            var parent = item;
            var option = $('<option>');
            option.text( decodeEntities(parent.title) );
            option.attr('value', parent.id);
            if (parseInt(parent.id) == parseInt(recentParents[0])) {
              option.attr('selected', 'selected');
            }
            optGroup.append(option);

            var x;
            var hasFolders = false;
            for (x = 0; x < parent.children.length; x++ ) {
              var child = parent.children[x];
              if (child.children) {
                if (hasFolders == false) {
                  var dOptGroup = $('<optgroup label="'+ parent.title +'">');
                  hasFolders = true;
                }
                var dOption = $('<option>');
                dOption.text( decodeEntities(child.title) );
                dOption.attr('value', child.id);
                if (parseInt(child.id) == parseInt(recentParents[0])) {
                  dOption.attr('selected', 'selected');
                }
                dOptGroup.append(dOption);
              }
            }
            $('#select-folder').append(dOptGroup);
          }
        }

        $('#select-folder').prepend(optGroup);

        $('#select-folder').select2({
          escapeMarkup: function (text) { return text; }
          })
          .on("select2:open", function () {
           $('html, body').css('height', '365px');
           $('.select2-search__field').attr('placeholder', 'Search for a folder...');
          })
          .on("select2:close", function () {
           $('html, body').css('height', '190px');
          })
          .on("select2:focus", function () {
           console.log('focus');
          })
    });
  }

}

function isInArray(value, array) {
  return array.indexOf(value) > -1;
}

var decodeEntities = (function() {
  // this prevents any overhead from creating the object each time
  var element = document.createElement('div');

  function decodeHTMLEntities (str) {
    if(str && typeof str === 'string') {
      // strip script/html tags
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
      element.innerHTML = str;
      str = element.textContent;
      element.textContent = '';
    }

    return str;
  }

  return decodeHTMLEntities;
})();

document.addEventListener('DOMContentLoaded', function () {
  init();
});