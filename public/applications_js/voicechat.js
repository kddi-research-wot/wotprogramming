"use strict";

var main = (function ($, socket) {
  var getEmitData = function (obj1) {
    return $.extend({ "store": store }, obj1);
  };

    // ---------------------
    // Initialize
    // ---------------------
  var init = function () {
    $(window).on("beforeunload", function (e) {
      socket.emit("voice-end", getEmitData());
    });
  };

  return { init: init };
})(jQuery, socket);

$(function () {
  main.init();
});
