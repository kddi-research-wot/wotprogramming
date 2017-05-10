"use strict";

// チューター画面セッション維持のポーリング間隔(ms)
var SESSION_KEEP = 10000;

// 編集画面セッション維持ポーリングを行った回数
var keepSessionCounter;
var MAX_SESSION_COUNTER = 9999;

var tutor = (function ($) {
  var getEmitData = function (obj1) {
    return $.extend({ "store": store }, obj1);
  };

    // チューター情報送信のポーリングを開始する
  var tutorTimer = null;
  var startTutorWaitPolling = function () {
    if (tutorTimer) {
      clearInterval(tutorTimer);
    }
        // 10秒待たずに1回確認する
    socket.emit("class-join", getEmitData());
    tutorTimer = setInterval(function () {
      if (store.className) {
        keepSessionCounter = keepSessionCounter + 1;
        if (keepSessionCounter > MAX_SESSION_COUNTER) {
          keepSessionCounter = 1;
        }
        socket.emit("class-join", getEmitData({
                    "keepSessionCounter": keepSessionCounter
        }));
      } else {
        clearInterval(tutorTimer);
        tutorTimer = null;
      }
    }, SESSION_KEEP);
  };

    // ---------------------
    // 初期化
    // ---------------------
  var init = function () {
    $("button").button();

    socket.on("q-get", function (results) {
      var $qList = $("#qList"),
        str = "";

      $qList.empty();
      results.forEach(function (value, index) {
        if (value.e_date != null) {
                    // 指導完了済み
          str = '<div class="question2">'
                    + '<div class="subject">'
                    + (index + 1) + ": "
                    + value.q_date + "&nbsp;ユーザID：" + value.q_user + "&nbsp;"
                    + '<div class="content">'
                    + value.q_content.replace(/\r?\n/g, "<br>")
                    + "</div>"
                    + "</div>"
                    + "</div>";
        } else {
                    // 指導受付中
          str = '<div class="question">'
                    + '<a href="' + value.url + "?q=" + value.q_id + '"target="_blank">'
                    + '<div class="subject">'
                    + (index + 1) + ": "
                    + value.q_date + "&nbsp;ユーザID：" + value.q_user + "&nbsp;"
                    + '<div class="content">'
                    + value.q_content.replace(/\r?\n/g, "<br>")
                    + "</div>"
                    + "</div>"
                    + "</a>"
                    + "</div>";
        }
        $qList.append(str);
      });
    });
    socket.on("q-upd", function (result) {
      socket.emit("q-get", getEmitData());
    });
    socket.on("new-question", function (result) {
            // Let's check if the browser supports notifications
      var noticeText = "新しい質問を受け付けました";
      noticeText = noticeText + " ユーザ:" + result.store.user;
      noticeText = noticeText + " " + result.content.slice(0, 20);
      if (!("Notification" in window)) {
                // do nothing
      } else if (Notification.permission === "granted") {
        new Notification(noticeText);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission(function (permission) {
          if (permission === "granted") {
            new Notification(noticeText);
          }
        });
      }
    });

    socket.on("class-new", function (result) {
      $("#msg").html("");
      if (result.msg) {
                // ダイアログのメッセージとタイトルを設定
        $("#show_dialog").html(result.msg);

                // ダイアログを作成
        $("#show_dialog").dialog({
                    modal: true,
                    title: "メッセージダイアログ",
                    buttons: {
                        "OK": function () {
                          $(this).dialog("close");
                          return false;
                        }
                    }
        });
      } else {
        store.className = result.className;
        $("#classNameDisp").html(store.className);

                // チューター情報の送信開始
        keepSessionCounter = 0;
        startTutorWaitPolling();
      }
    });

    socket.on("class-confirm-new", function (result) {
            // ダイアログのメッセージを設定
      $("#show_dialog").html(result.msg);
            // ダイアログを作成
      $("#show_dialog").dialog({
                modal: true,
                title: "確認ダイアログ",
                buttons: {
                    "OK": function () {
                      $(this).dialog("close");
                      socket.emit("class-make", getEmitData({
                            "className": result.className,
                            "password": result.password
                      }));
                    },
                    "キャンセル": function () {
                      $(this).dialog("close");
                      return false;
                    }
                }
      });
    });

    $("#className").on("keypress", function (e) {
      if (e.which == 13) {
        $("#btnOK").click();
      }
    });
    $("#password").on("keypress", function (e) {
      if (e.which == 13) {
        $("#btnOK").click();
      }
    });
    $("#btnOK").on("click", function () {
      socket.emit("class-new", getEmitData({
                "className": $("#className").val(),
                "password": $("#password").val()
      }));
    });

    $("#userName").html(store.user);
  };

  return { init: init };
})(jQuery);

$(function () {
  tutor.init();
});
