"use strict";

var init = function () {
  $("#messageDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 500,
        height: 300,
        resizable: false,
        buttons: {
            "OK": function () {
              $(this).dialog("close");
            }
        }
  });

  $("#messageText").empty();
  $("#messageText").append(store.msg);
  $("#messageDialog").dialog("open");
};

$(function () {
  init();
});

