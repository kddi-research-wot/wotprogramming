"use strict";


// 最大画像サイズ(バイト)
var MAX_IMAGE_SIZE = 200000;
// 編集が完了してレンダリング開始までの間隔(ms)
var INTERVAL_FOR_RENDERING = 500;
// 編集が完了して編集中を解除するまでの間隔(ms)
var EDITING_TIMER = 1000;
// チューター画面情報受信のポーリング間隔(ms)
var TUTOR_POLLING = 10000;
// 編集画面セッション維持のポーリング間隔(ms)
var SESSION_KEEP = 10000;

// 編集画面セッション維持ポーリングを行った回数
var keepSessionCounter;
var MAX_SESSION_COUNTER = 9999;

var senduser = "";

// JSの無限ループ対応（loop-protect.js）の設定
window.runnerWindow = loopProtect;
loopProtect.method = "window.top.runnerWindow.protect";

var main = (function ($, socket) {
  var editors = {};
  var editStats = {};
  var $editingLabels = {};
  var $consoleLog;
  var viewframe;

    // 編集エリア関連
  var $editorPanels = null;
  var $editorPanelArr = [];
  var $editorPanelShowArr = [];
  var $editorResizeArr = [];
  var $resizeWrapperArr = [];
  var $editorShowBtnArr = [];

  var viewTimer = null;
  var resizeTimer = null;
  var tutorTimer = null;
  var teaching = false;
    // チャット入力中ユーザ
  var typingUsers = [];
  var voiceUserList = [];

  var approveVoiceChat = false;
  var voiceChatWindow = null;
  var keepSending = false;

    // 画面サイズ関連
  var EDITOR_MIN_WIDTH = 120;
  var RESIZE_BAR_WIDTH = 2;
  var EDITOR_RIGHT_ADJUST = 3;
  var EDITOR_BOTTOM_ADJUST = 33;

    // 編集パネルの幅を設定する
  var setEditorPanelWidth = function () {
    var width = $editorPanels.width(),
      panelWidth = 100,
      showPanels = [],
      pos = 0;

    $editorPanelShowArr = [];
    $editorShowBtnArr.forEach(function ($ele, idx) {
      if ($ele.is(":checked")) {
        showPanels.push(idx);
      }
    });

    panelWidth = (width / showPanels.length);
    $editorPanelArr.forEach(function ($ele, idx) {
      pos = showPanels.indexOf(idx);
      if (pos >= 0) {
        $ele.css("left", pos * panelWidth);

        $ele.width(panelWidth);
        $ele.show();
        $editorPanelShowArr.push($ele);
      } else {
        $ele.hide();
      }
    });

        // リサイズバーの位置決定
    for (var i = 0; i < showPanels.length - 1; i++) {
      $editorResizeArr[i].show();
      $editorResizeArr[i].css("left", panelWidth - RESIZE_BAR_WIDTH - EDITOR_MIN_WIDTH);

      $resizeWrapperArr[i].show();
      $resizeWrapperArr[i].css("left", i * panelWidth + EDITOR_MIN_WIDTH);
      $resizeWrapperArr[i].css("width", 2 * panelWidth - 2 * EDITOR_MIN_WIDTH);
    }
    for (var i = showPanels.length - 1; i < $editorResizeArr.length; i++) {
      $editorResizeArr[i].hide();
      $resizeWrapperArr[i].hide();
    }

    resizeEditorScrollbar();

        // 画面最小幅を決定
    $editorPanels.css("min-width", $editorPanelShowArr.length * EDITOR_MIN_WIDTH);
  };

    // 編集エリアのスクロールバー表示
  var resizeEditorScrollbar = function () {
    var counter = 0;

    if ($("#editorHTML").is(":visible")) {
      $("#editorHTML").css("height", $editorPanels.height() - EDITOR_BOTTOM_ADJUST);
      $("#editorHTML").css("width",
          $editorPanelShowArr[counter].width() - EDITOR_RIGHT_ADJUST);
      editors.html.resize();
      counter = counter + 1;
    }

    if ($("#editorCSS").is(":visible")) {
      $("#editorCSS").css("height", $editorPanels.height() - EDITOR_BOTTOM_ADJUST);
      $("#editorCSS").css("width",
          $editorPanelShowArr[counter].width() - EDITOR_RIGHT_ADJUST);
      editors.css.resize();
      counter = counter + 1;
    }

    if ($("#editorJS").is(":visible")) {
      $("#editorJS").css("height", $editorPanels.height() - EDITOR_BOTTOM_ADJUST);
      $("#editorJS").css("width",
          $editorPanelShowArr[counter].width() - EDITOR_RIGHT_ADJUST);
      editors.js.resize();
      counter = counter + 1;
    }

    if ($("#consoleLog").is(":visible")) {
      $("#consoleLog").css("height", $editorPanels.height() - EDITOR_BOTTOM_ADJUST);
      $("#consoleLog").css("width",
          $editorPanelShowArr[counter].width() - EDITOR_RIGHT_ADJUST);
      counter = counter + 1;
    }

        // iframe の横幅変更
    if ($("#editorHTML").is(":visible")) {
      var editPanelWidth = $("#editorPanelOutput").width();
      $("#viewFrame").css("width", editPanelWidth - EDITOR_RIGHT_ADJUST);
      $("#viewFrame").css("height", $editorPanels.height() - EDITOR_BOTTOM_ADJUST);
    }
  };

    // 画面リサイズ時の処理
  var resizeEditorPanelWidth = function () {
    if (!resizeTimer) {
      resizeTimer = setTimeout(function () {
                // 画面リサイズ時に編集パネルの幅を変更する
        var $ele,
          widthArr = [],
          sumWidth = 0, leftPoint = 0,
          wholeWidth = $editorPanels.width();

                // 幅を比率を変えずに拡大・縮小する
        $editorPanelShowArr.forEach(function ($ele_) {
          var width = $ele_.width();
          widthArr.push($ele_.width());
          sumWidth += width;
        });
        for (var i = 0; i < widthArr.length; i++) {
          widthArr[i] = wholeWidth * widthArr[i] / sumWidth;
        }
                // 最小幅を維持する
        for (var i = 0; i < widthArr.length - 1; i++) {
          if (widthArr[i] < EDITOR_MIN_WIDTH) {
            widthArr[i + 1] = widthArr[i + 1] - (EDITOR_MIN_WIDTH - widthArr[i]);
            widthArr[i] = EDITOR_MIN_WIDTH;
          }
        }
                // コントロールを再配置する
        for (var i = 0; i < $editorPanelShowArr.length; i++) {
          $ele = $editorPanelShowArr[i];
          $ele.css("left", leftPoint);
          $ele.width(widthArr[i]);

          if (i < $editorPanelShowArr.length - 1) {
            $editorResizeArr[i].css("left",
                widthArr[i] - RESIZE_BAR_WIDTH - EDITOR_MIN_WIDTH);
            $resizeWrapperArr[i].css("left", leftPoint + EDITOR_MIN_WIDTH);
            $resizeWrapperArr[i].css("width",
                widthArr[i] + widthArr[i + 1] - 2 * EDITOR_MIN_WIDTH);
          }
          leftPoint += widthArr[i];
        }

        resizeEditorScrollbar();
        $("#viewFrame").show();

                // 画面リサイズ時にヘッダサイズに合わせて移動
        $("#editorPanels").css("top", $("#header").outerHeight());

        resizeTimer = null;
      }, 100);
    }
  };

  var dragStartPoint = 0;
  var resizeIdx = 0;
  var startWidthL = 0;
  var startWidthR = 0;
  var startLeftR = 0;

    // リサイズバー移動開始時の情報取得
  var dragStartEditorPanel = function (event, ui) {
    dragStartPoint = ui.position.left;
    resizeIdx = parseInt(ui.helper[0].id.slice(-1), 10);

    if (resizeIdx == ($editorPanelShowArr.length - 2)) {
      $("#viewFrame").hide();
    }

    startWidthL = $editorPanelShowArr[resizeIdx].width();
    startWidthR = $editorPanelShowArr[resizeIdx + 1].width();
    startLeftR = $editorPanelShowArr[resizeIdx + 1].position().left;
  };

    // リサイズバー移動中に編集パネルの幅を変更する
  var dragEditorPanel = function (event, ui) {
        // バー表示
    var $ele1, $ele2, diff = 0, width1 = 0;

    $ele1 = $editorPanelShowArr[resizeIdx];
    $ele2 = $editorPanelShowArr[resizeIdx + 1];

    diff = ui.position.left - dragStartPoint;

    width1 = startWidthL + diff;

    $ele1.width(width1);
    $ele2.css("left", startLeftR + diff);
    $ele2.width(startWidthR - diff);
    $editorResizeArr[resizeIdx].css("left", $ele2.position().left);

    resizeEditorScrollbar();
  };

    // ACE Editorの初期化
  var createEditor = function (ele, mode) {
    var editor = ace.edit(ele);

    editor.setOptions({
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true
    });
    editor.getSession().setMode(mode);

        // Event
    editor.getSession().on("change", function (e, sender) {
      var codeType;

            // どのパネルが編集されたか判断する
      for (var key in editors) {
        if (editors[key].getSession() == sender) {
          codeType = key;
          break;
        }
      }

      if (editStats[codeType].action == "setValue") {
                // setValue()は "remove"イベントと"insert"イベントが発行されるため"remove"はつぶす
        if (e.action == "remove") {
          return;
        }
        editStats[codeType].action = e.action;
      } else if (editStats[codeType].send) {
                    // コード登録の送信中の場合は保留する
        editStats[codeType].edit = true;
      } else {
                    // コードを送信する
        sendCode(codeType);
      }

            // レンダリングする
      if (viewTimer) {
        clearTimeout(viewTimer);
      }
      viewTimer = setTimeout(function () {
        viewTimer = null;
        viewRender();
      }, INTERVAL_FOR_RENDERING);
    });
    return editor;
  };

    // コードを送信する
  var sendCode = function (codeType) {
    editStats[codeType].edit = false;
    editStats[codeType].send = true;
    socket.emit("code-set", getEmitData({
            "codeType": codeType,
            "code": editors[codeType].getValue(),
            "versionNo": editStats[codeType].versionNo
    }));
  };

    // コード登録の受信
  socket.on("code-set", function (data) {
    var codeType = data.codeType;

    if (store.socketId == data.store.socketId) {
            // 自分のコード登録を受信した場合
            // バージョンNo.を画面データ書き換えた後に更新するようにここに変更
      editStats[codeType].send = false;
      editStats[codeType].versionNo = data.versionNo;

      if (editStats[data.codeType].edit) {
                // 編集コードが未送信で保留されている場合は送信する
        sendCode(codeType);
      }
    } else {
            // 他ユーザのコード登録を受信した場合

            // 他ユーザによる編集中状態にする
      $editingLabels[codeType].text(data.store.user + "が編集中");
      $editingLabels[codeType].show();
      editors[codeType].setReadOnly(true);

            // 親の要素に色を付ける
      $editingLabels[codeType].parent().css("background-color", "red");

            // 1秒後に編集中を解除する
      if (editStats[codeType].editingTimer) {
        clearTimeout(editStats[codeType].editingTimer);
      }
      editStats[codeType].editingTimer = setTimeout(function () {
        var editor = editors[codeType];
        $editingLabels[codeType].hide();
        editor.setReadOnly(false);
        editor.getSession().selection.clearSelection();

                // 親の要素に色を付ける
        $editingLabels[codeType].parent().css("background-color", "white");
      }, EDITING_TIMER);

            // コードを受信データで書き換える
      setEditorCode(codeType, data.code, data.versionNo);

            // // ステータスを画面データ書き換えた後に更新するようにここに変更
      editStats[codeType].send = false;
            // // バージョンNo.を画面データ書き換えた後に更新するようにここに変更
      editStats[codeType].versionNo = data.versionNo;
    }
  });

    // ACE Editorに値をセットする
  var setEditorCode = function (codeType, code, versionNo) {
    editStats[codeType].versionNo = versionNo;
    editStats[codeType].action = "setValue";
    editors[codeType].setValue(code);
  };

    // ビュー（iframe）レンダリング
  var viewRender = function () {
    var doc = viewframe.document;
    var viewHtml = getViewHtml();

    doc.open();
    doc.write(viewHtml);
    doc.close();

        // 別ウィンドウを表示している場合はそちらも反映する（最後に開いた別ウィンドウだけ）
    if (_doc) {
      _doc.open();
      _doc.write(viewHtml);
      _doc.close();
    }
  };

    // 別ウィンドウ
  var _doc;

    // ビュー（別ウィンドウ）
  var openViewWindow = function () {
    var win;
    win = window.open("about:blank", "render");
    _doc = win.document;
    _doc.open();
    _doc.write(getViewHtml());
    _doc.close();
  };

    // JavaScriptを作成
  var createScriptBlob = function () {
    var blob;
    var js;

    js = editors.js.getValue();
    js = loopProtect.rewriteLoops(js);
    js = "console.log = "
            + "function() { parent.postMessage(JSON.stringify(arguments), '*'); }; "
            + "try { "
            + js
            + " } catch (e) { "
            + "  console.log(e.name + ': ' + e.message); "
            + "}";
    blob = new Blob([js], { type: "application/javascript; version = 1.7" });

    return URL.createObjectURL(blob);
  };

    // CSSを作成
  var createCssBlob = function () {
    var blob;

    var css = editors.css.getValue();
    blob = new Blob([css], { type: "text/css" });

    return URL.createObjectURL(blob);
  };

    // 表示用にCSSとJavaScriptをマージしたHTMLを返す
  function getViewHtml() {
    var html = editors.html.getValue(),
      js = editors.js.getValue(),
      css = editors.css.getValue(),
      pos;
    var cssBlob = createCssBlob();
    var jsBlob = createScriptBlob();
    if (css != "") {
      css = "<link href='" + cssBlob + "'  type='text/ css' rel='stylesheet' ></link>";
      pos = html.indexOf("</head>");
      if (pos < 0) {
        html = html + css;
      } else {
        html = html.substr(0, pos) + css + html.substr(pos);
      }
    }
    if (js != "") {
      js = loopProtect.rewriteLoops(js);
      js = "<script type='application/javascript; version = 1.7' src='" + jsBlob + "'>"
          + "</script >\n";

      pos = html.indexOf("</head>");
      if (pos < 0) {
        html = html + js;
      } else {
        html = html.substr(0, pos) + js + html.substr(pos);
      }
    }
    return html;
  }

    // Socket送信データの作成
  var getEmitData = function (obj1) {
    return $.extend({ "store": store }, obj1);
  };

    // 最新コードをDBから取得し、ACE Editorにセットする
  var getCode = function () {
    socket.emit("code-get", getEmitData());
    socket.on("code-get", function (results) {
      for (var i = 0; i < results.length; i++) {
        setEditorCode(results[i].code_type, results[i].code, results[i].version_no);
      }
      editStats.html.action = "wait";
      editStats.css.action = "wait";
      editStats.js.action = "wait";

            // 初期表示にエディタの背景が青くなるのをクリアする
      editors.html.getSession().selection.clearSelection();
      editors.css.getSession().selection.clearSelection();
      editors.js.getSession().selection.clearSelection();
    });
  };

    // コメントを取得してセットする
  var getComment = function () {
    $("#comment").val("");
    socket.emit("comment-get", getEmitData());
    socket.on("comment-get", function (results) {
      if (results.length == 0) {
        store.comment = null;
      } else {
        store.comment = results[0].comment;
      }
      $("#comment").val(unEscapeHTML(store.comment));
    });
  };

    // コメントを送信する
  var sendComment = function () {
    socket.emit("comment-set", getEmitData({
                "comment": escapeHTML($("#comment").val())
    }));
  };

    // コメント登録の受信
  socket.on("comment-set", function (data) {
    var comment = data.comment;
    if (store.socketId == data.store.socketId) {
            // 自分のコメント登録を受信した場合
    } else {
            // 他ユーザのコメント登録を受信した場合
            // コメントを受信データで書き換える
      $("#comment").val(unEscapeHTML(comment));
    }
  });

    // URLに紐づいたクラス名を取得する
  var getUrlClass = function () {
    socket.emit("urlClass-get", getEmitData());
    socket.on("urlClass-get", function (results) {
      if (results.length == 0) {
        store.className = null;
      } else {
        store.className = results[0].class_name;
      }
      $("#className").html(store.className);
    });
  };

    // チューター情報受信のポーリングを開始する
  var startTutorPolling = function () {
    if (tutorTimer) {
      clearInterval(tutorTimer);
    }
        // 10秒待たずに1回確認する
    socket.emit("tutor-get", getEmitData());
    tutorTimer = setInterval(function () {
      if (store.className) {
        socket.emit("tutor-get", getEmitData());
      } else {
        clearInterval(tutorTimer);
        tutorTimer = null;
        $("#btnQuestion").hide();
      }
    }, TUTOR_POLLING);
  };

    // セッションキープのポーリングを開始する
  var keepSessionTimer = null;
  var keepSessionPolling = function () {
    if (keepSessionTimer) {
      clearInterval(keepSessionTimer);
    }
        // 10秒待たずに1回確認する
    socket.emit("keep-session", getEmitData());
    keepSending = true;
    keepSessionTimer = setInterval(function () {
      if (store.className) {
        keepSessionCounter = keepSessionCounter + 1;
        if (keepSessionCounter > MAX_SESSION_COUNTER) {
          keepSessionCounter = 1;
        }
        if (!keepSending) {
          keepSending = true;
          socket.emit("keep-session", getEmitData({
                        "keepSessionCounter": keepSessionCounter
          }));
        }
      } else {
        clearInterval(keepSessionTimer);
        keepSessionTimer = null;
      }
    }, SESSION_KEEP);
  };

    // DIALOG: チャット
  var createChatDialog = function () {
    $("#chatDialog").dialog({
            autoOpen: false,
            modal: false,
            width: 600,
            minWidth: 280,
            height: 240,
            resizable: true,
            open: function (event, ui) {
                // タイトルバー右にある閉じるボタンのみ消す
              $(".ui-dialog-titlebar-close").hide();
              $("#chatSendMsg").css("width", ($(this).width() - 125));
            },

            // ダイアログのリサイズ
            resize: function () {
              $("#chatSendMsg").css("width", ($(this).width() - 125));
            },
    });

    $("#chatSendBtn").on("click", function () {
            // htmlエスケープ
      var text = escapeHTML($("#chatSendMsg").val());
            // URLをリンクに置換
      text = text.replace(/(http(s)?:\/\/[\x21-\x7e]+)/gi,
          "<a href='$1' target='_blank'>$1</a>");
      socket.emit("chat-send", getEmitData({
                "chatMsg": text
      }));
      $("#chatSendMsg").val("");
      socket.emit("typing-send", getEmitData({
                "typingUser": store.user,
                "label": false
      }));
    });

    $("#chatSendMsg").on("keypress", function (e) {
      if (e.which == 13) {
        $("#chatSendBtn").click();
      }
    });

    $("#chatSendMsg").on("keyup", function (e) {
      var labelState = false;
            // テキストがある場合のみ
      if ($("#chatSendMsg").val() != "") {
        labelState = true;
      }
      socket.emit("typing-send", getEmitData({
                "typingUser": store.user,
                "label": labelState
      }));
    });
    socket.on("typing-send", function (data) {
      if (store.socketId != data.store.socketId) {
        typingLabelWriter(data);
      }
    });

    socket.on("chat-get", function (data) {
            // チューターの場合はなぜか2回呼ばれるが原因不明
      $("#chatLog").empty();
      data.forEach(function (value, index) {
        $("#chatLog").append("<div>" + value.chatUser + ": " + value.chatMsg + "</div>");
      });
      $("#chatLog").scrollTop($("#chatLog")[0].scrollHeight);
    });

    socket.on("chat-send", function (data) {
      $("#chatLog").append("<div>" + data.chatUser + ": " + data.chatMsg + "</div>");
      $("#chatLog").scrollTop($("#chatLog")[0].scrollHeight);
    });

        // Voice chat
    $("#chatVoice").on("click", function () {
      voiceUserList = [];
            // 発信をサーバに送信
      socket.emit("voice-call-send", getEmitData({
                "senduser": store.user
      }));
    });

        // 発信をサーバから受信
    socket.on("voice-call-receive", function (data) {
      var mode = "";
      $("#voicechatDialog").dialog({
                autoOpen: false,
                modal: true,
                width: 200,
                height: 120,
                resizable: false,
                open: function (event, ui) {
                    // タイトルバー右にある閉じるボタンのみ消す
                  $(".ui-dialog-titlebar-close").hide();
                },
                close: function () {
                  if (mode == "calling") {
                        // 取消をサーバに送信
                    socket.emit("voice-call-cancel", getEmitData());
                  }
                }
      });
      $("#chatVoice").hide();

      senduser = data.senduser;
      if (data.senduser == store.user) {
                // 自分
        if (store.socketId == data.store.socketId) {
          $("#voicechatDialog").dialog("open");
          $("#CallBtn").hide();

          approveVoiceChat = true;
          mode = "calling";
          $("#voicechatMsg").html("発信中・・・");
          $("#CancelBtn").show();
          $("#CancelBtn").on("click", function () {
            approveVoiceChat = false;
                        // 取消をサーバに送信
            socket.emit("voice-call-cancel-all", getEmitData());
            socket.emit("voice-end", getEmitData());
            $("#voicechatDialog").dialog("close");
          });
        }
      } else {
        $("#voicechatDialog").dialog("open");

        approveVoiceChat = false;
        mode = "receiving";
        $("#voicechatMsg").html("リクエスト着信中・・・");
        $("#CallBtn").show();
        $("#CallBtn").off("click");
        $("#CallBtn").on("click", function () {
          approveVoiceChat = true;
                    // 着信をサーバに送信
          socket.emit("voice-call-receive", getEmitData({
                        "senduser": data.senduser,
                        "receiveuser": store.user
          }));
        });

        $("#CancelBtn").show();
        $("#CancelBtn").off("click");
        $("#CancelBtn").on("click", function () {
                    // 取消をサーバに送信
          approveVoiceChat = false;
          socket.emit("voice-call-cancel", getEmitData());
          socket.emit("voice-call-close", getEmitData());
          $("#voicechatDialog").dialog("close");
        });

        socket.emit("voice-user-list", getEmitData());
      }
    });

        // 音声チャット発信者以外のユーザリストを作成
    socket.on("voice-user-list", function (data) {
      if (store.user == senduser && store.user != data.store.user) {
        var haveNot = true;
        for (var i = 0; i < voiceUserList.length; i++) {
          if (voiceUserList.indexOf(data.store.user) >= 0) {
            haveNot = false;
            break;
          }
        }
        if (haveNot) {
          voiceUserList.push(data.store.user);
        }
      }
    });

        // 全員キャンセルしたら発信者のダイアログを消す
    socket.on("voice-call-cancel", function (data) {
      if (store.user == senduser) {
        for (var i = 0; i < voiceUserList.length; i++) {
          if (voiceUserList.indexOf(data.store.user) >= 0) {
            voiceUserList.splice(voiceUserList.indexOf(data.store.user), 1);
            break;
          }
        }
        if (voiceUserList.length < 1) {
          $("#voicechatDialog").dialog("close");
          approveVoiceChat = false;
          socket.emit("voice-end", getEmitData());
        }
      }
    });

        // 同ユーザの着信を消す
    socket.on("voice-call-close", function (data) {
      if (data.store.user == store.user) {
        $("#voicechatDialog").dialog("close");
        approveVoiceChat = false;
      }
    });

        // 取消をサーバから受信
    socket.on("voice-cancel", function (data) {
      if (data.senduser != store.user) {
        $("#voicechatDialog").dialog("close");
        approveVoiceChat = false;
      }
    });

        // 着信をサーバから受信
    socket.on("voice-bgn", function (data) {
            // 自分がOKしている場合のみ
      if (approveVoiceChat) {
                // 開始
        $("#voicechatDialog").dialog("close");
        voiceChatWindow = window.open("https://" + document.location.hostname + "/" + "voicechat?user=" + store.user + "&senduser=" + data.senduser + "&receiveuser=" + data.receiveuser + "&url=" + store.url, "voicechat");
        socket.emit("voice-call-close", getEmitData());
      }
    });

        // voice終了
    socket.on("voice-end", function (data) {
      $("#chatVoice").show();
    });
  };

    // 入力中ラベル表示制御
  var typingLabelWriter = function (data) {
    if (data.label) {
      var findSameUser = false;
      for (var i = 0; i < typingUsers.length; i++) {
        if (data.typingUser == typingUsers[i]) {
          findSameUser = true;
        }
      }
      if (!findSameUser) {
        typingUsers.push(data.typingUser);
      }
    } else {
      for (var i = 0; i < typingUsers.length; i++) {
        if (data.typingUser == typingUsers[i]) {
          typingUsers.splice(i, 1);
          break;
        }
      }
    }
    if (typingUsers.length > 0) {
      var typer = "";
      for (var i = 0; i < typingUsers.length; i++) {
        if (typer != "") {
          typer = typer + ", ";
        }
        typer = typer + typingUsers[i];
      }
      $("#typingLabel").text(typer + " 入力中・・・");
    } else {
      $("#typingLabel").text("");
    }
  };

    // MENU: 新規
  var setMenuUrlNew = function () {
    $("#urlNewMenu").on("click", function () {
      store.className = "";
      $("#className").html(store.className);
      socket.emit("url-get", getEmitData());
      socket.on("url-get", function (data) {
        store.url = data.store.url;
        window.history.pushState({}, "", "/" + store.url);
        getCode();
        getComment();
        $("#clearConsoleLog").click();
        socket.emit("url-join", getEmitData());
      });
    });
  };

    // MENU: URL履歴
  var setMenuUrlHistory = function () {
    var $dlg = $("#urlHistoryDialog");
    $dlg.dialog({
            autoOpen: false,
            modal: true,
            width: 500,
            height: 500,
            resizable: false,
            buttons: {
                "Close": function () {
                  $(this).dialog("close");
                }
            }
    });
    $("#urlHistory").on("click", function () {
      socket.emit("url-history", getEmitData());
    });

    socket.on("url-history", function (results) {
      $dlg.dialog("open");
      $("#uList").empty();
      var uList = '<table id="historyTable">'
                + "<tr>"
                + "    <th>No.</th>"
                + "    <th>Date</th>"
                + "    <th>URL</th>"
                + "    <th>Code Name</th>"
                + "</tr>";
      for (var i = 0; i < results.length; i++) {
        uList = uList + '<tr class="openHistory" id="openHistory' + (i + 1) + '">'
                   + '<td class="number">' + (i + 1) + "</td>"
                   + "<td>" + results[i].upd_date + "</td>"
                   + '<td class="tdUrl">' + results[i].url + "</td>"
                   + '<td class="comment">' + results[i].comment + "</td>"
                   + "</tr>";
      }
      uList = uList + "</table>";
      $("#uList").append(uList);

      $("#historyTable tr td").click(function () {
        var url = $(this).parent().children().eq(2).text();
        window.location.href = url;
      });
    });
  };

    // MENU: 画像ファイル
  var setMenuUploadImage = function () {
    $("#uploadImageDialog").dialog({
            autoOpen: false,
            modal: true,
            width: 700,
            height: 400,
            resizable: false,
            buttons: {
                "Close": function () {
                  $(this).dialog("close");
                }
            }
    });

    $("#btnImageUpload").on("click", function () {
      var fileReader = new FileReader();
      var sendFile = $("#fileInput")[0].files[0];

            // サイズチェック 200KB
      var imageSize = sendFile.size;
      if (imageSize > (MAX_IMAGE_SIZE * 1.024)) {
        $("#uploadImageDialog").dialog("close");
        $("#messageText").empty();
        var num = Math.round(imageSize / 1024);
        num = String(num).replace(/(\d)(?=(\d{3})+$)/g, "$1,");
        $("#messageText").append("選択した画像のサイズは" + num + "KBです<br>画像のサイズは200KBまでです");
        $("#messageDialog").dialog("open");
        return;
      }

            // jpg, png, gif 以外エラー
      if (sendFile.type != "image/jpeg" && sendFile.type != "image/jpg"
          && sendFile.type != "image/png" && sendFile.type != "image/gif") {
        $("#uploadImageDialog").dialog("close");
        $("#messageText").empty();
        $("#messageText").append("jpg, png, gifのファイルを選択してください");
        $("#messageDialog").dialog("open");
        return;
      }

            // 半角英数字_-以外はエラー
      var data = getEmitData();
      data.user = store.user;
      data.name = sendFile.name;

      fileReader.readAsBinaryString(sendFile);

      fileReader.onload = function (event) {
        data.file = event.target.result;
        socket.emit("add-image", data);
      };
    });

    socket.on("add-image", function (results) {
      $("#fileInput").val("");
      $("#choosedFile").val("");
      socket.emit("user-image", getEmitData());
    });

    $("#fileInput").change(function () {
      var fileName = $("#fileInput")[0].files[0].name;
      $("#choosedFile").val(fileName);
    });

        // メニュー画像ファイル押下
    $("#uploadImageOpen").on("click", function () {
      $("#fileInput").val("");
      $("#choosedFile").val("");
      socket.emit("user-image", getEmitData());
    });

        // テーブル表示処理
    socket.on("user-image", function (results) {
      $("#uploadImageDialog").dialog("open");
      $("#imageList").empty();
      var imageList = '<table id="imageTable">'
                + "<tr>"
                + "    <th>Thumbnail</th>"
                + "    <th>URL</th>"
                + "    <th>Date Time</th>"
                + "    <th></th>"
                + "</tr>";
      for (var i = 0; i < results.length; i++) {
        var dateArr = results[i].ins_date.split(" ");
        imageList = imageList + '<tr class="openImage" id="openImage_'
                    + results[i].imageID + '">'
                    + '<td class="thumbnail"><img src="'
                    + results[i].path + results[i].file_name
                    + '" class="imageSize"> </td>'
                    + '<td class="url">'
                    + results[i].path + results[i].file_name + "</td>"
                    + '<td class="date">' + dateArr[0] + "<br>" + dateArr[1] + "</td>"
                    + '<td class="action"><button id="imageDeleteBtn"'
                    + 'class="imageDeleteBtn ui-button ui-widget'
                    + 'ui-state-default ui-corner-all ui-button-text-only"'
                    + 'value="' + results[i].imageID + '">削除</button></td>'
                    + "</tr>";
      }
      imageList = imageList + "</table>";
      $("#imageList").append(imageList);

      $(".imageDeleteBtn").click(function () {
        var data = getEmitData();
        data.imageID = $(this).val();
        data.filepath = $(this).parent().parent().children().eq(1).text();
                // 確認用ダイアログ
        $("#confirmDialog").dialog({
                    autoOpen: false,
                    modal: true,
                    width: 500,
                    height: 300,
                    resizable: false,
                    buttons: {
                        "OK": function () {
                          $(this).dialog("close");
                          socket.emit("delete-image", data);
                        },
                        "キャンセル": function () {
                          $(this).dialog("close");
                          $("#fileInput").val("");
                          socket.emit("user-image", getEmitData());
                        }
                    }
        });
        var imageThumnail = $(this).parent().parent().children().eq(0).html();
        $("#uploadImageDialog").dialog("close");
        $("#confirmText").empty();
        $("#confirmText").append("以下のファイルを削除しますよろしいですか<br>"
                  + imageThumnail + "<br>" + data.filepath);
        $("#confirmDialog").dialog("open");
      });
    });

    socket.on("delete-image", function (result) {
      $("#fileInput").val("");
      socket.emit("user-image", getEmitData());
    });
  };

    // MENU: ダウンロード押下
  var setMenuDownload = function () {
    $("#downloadMenu").on("click", function () {
            // var data = {};
      var srcHtml = $.parseHTML(editors.html.getValue(), true);

      var nodeNames = [];
      $.each(srcHtml, function (i, el) {
        if (el.nodeName == "SCRIPT" && el.src.indexOf($.trim(location.host)) != -1) {
          nodeNames.push(el.src.split(location.host)[1]);
        } else if (el.nodeName == "LINK" && ($.trim(el.type)) == "text/css"
                 && el.href.indexOf($.trim(location.host)) != -1) {
          nodeNames.push(el.href.split(location.host)[1]);
        }
      });

      socket.emit("download-file", getEmitData({
                "filename": nodeNames
      }));
    });
  };

    // ダウンロードファイル受信
  socket.on("download-file", function (data) {
    var zip = new JSZip();
    for (var i = 0; i < data.nodeNames.length; i++) {
      var filePath = data.nodeNames[i].split("/");
      var folder = zip;
      for (var j = 0; j < filePath.length - 1; j++) {
        if (filePath[j] != "") {
          folder = folder.folder(filePath[j]);
        }
      }
      folder.file(filePath[filePath.length - 1], data.fileData[i]);
    }
    zip.file(store.url + ".html", editors.html.getValue());
    zip.file(store.url + ".js", editors.js.getValue());
    zip.file(store.url + ".css", editors.css.getValue());
    zip.generateAsync({ type: "blob" })
            .then(function (content) {
              saveAs(content, "wotpro.zip");
            });
  });

    // MENU: クラス参加
  var setMenuClassSet = function () {
    var $dlg = $("#classSetDialog"),
      $msg = $("#classSetMsg"),
      $className = $("#classNameSet"),
      $password = $("#classPasswordSet"),
      eventName = "class-set";

    $dlg.dialog({
            autoOpen: false,
            modal: true,
            width: 300,
            height: 180,
            resizable: false,
            buttons: [{
                "text": "OK",
                "click": function () {
                  classDialogOkBtn();
                }
            }, {
                "text": "cancel",
                "click": function () {
                  $dlg.dialog("close");
                }
            }]
    });

    var classDialogOkBtn = function () {
      $msg.html("");
      socket.emit(eventName, getEmitData({
                "className": $className.val(),
                "password": $password.val()
      }));
    };

        // エンターキーで実行する処理
    $("#classNameSet").on("keypress", function (e) {
      if (e.which == 13) {
        classDialogOkBtn();
      }
    });

        // エンターキーで実行する処理
    $("#classPasswordSet").on("keypress", function (e) {
      if (e.which == 13) {
        classDialogOkBtn();
      }
    });

    socket.on(eventName, function (data) {
      if (data.msg) {
        $msg.html(data.msg);
      } else {
        store.className = data.className;
        $("#className").html(store.className);
        $dlg.dialog("close");
      }
    });

    $("#classSetMenu").on("click", function () {
      $dlg.dialog("open");
    });
  };

    // MENU: Sign Out
  var setMenuSignOut = function () {
    $("#signOut").on("click", function () {

      window.location.href = "logout";
    });
  };

    // BUTTON: 質問
  var setButtonQuestion = function () {
    var $dlg = $("#questionDialog"),
      $btn = $("#btnQuestion"),
      eventName = "q-set";

    $dlg.dialog({
            autoOpen: false,
            modal: true,
            width: 500,
            height: 300,
            resizable: false,
            buttons: [{
                "text": "OK",
                "click": function () {
                    // htmlエスケープ
                  var text = escapeHTML($("#questionContent").val());
                    // URLをリンクに置換
                  text = text.replace(/(http(s)?:\/\/[\x21-\x7e]+)/gi,
                       "<a href='$1' target='_blank'>$1</a>");

                  socket.emit(eventName, getEmitData({
                        "content": text
                  }));
                  $dlg.dialog("close");
                }
            }, {
                "text": "cancel",
                "click": function () {
                  $dlg.dialog("close");
                }
            }]
    });

    $btn.on("click", function () {
      $("#questionContent").val("");
      $dlg.dialog("open");
    });

    $btn.hide();
  };

    // BUTTON: 指導完了
  var setButtonQuestionEnd = function () {
    var $btn = $("#btnQEnd"),
      eventName = "q-end";

    $btn.hide();
    teaching = false;
    $btn.on("click", function () {
      socket.emit(eventName, getEmitData());
    });
    socket.on(eventName, function (data) {
      store.qId = "";
      $btn.hide();
      teaching = false;
            // テキストボックスクリア
      $("#typingLabel").text("");
      typingUsers = [];
      $("#chatSendMsg").val("");
      $("#chatDialog").dialog("close");
      if (store.tutor) {
        window.close();
      }
    });
  };

    // メッセージなど表示用ダイアログ
  var setMessageDialog = function () {
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
  };

    // ---------------------
    // Initialize
    // ---------------------
  var init = function () {
        // header
    $("button").button();
    $('input[type="button"]').button();

    $("#menu").menu({
            position: { my: "left top", at: "bottom" }
    });
    $("#editorShowBtnGroup").buttonset();

        // editors
    $editorPanels = $("#editorPanels");
    $editorPanelArr = [$("#editorPanelHTML"), $("#editorPanelCSS"),
                       $("#editorPanelJS"), $("#editorPanelConsole"),
                       $("#editorPanelOutput")];
    $editorResizeArr = [$("#editorResize0"), $("#editorResize1"),
                        $("#editorResize2"), $("#editorResize3")];
    $resizeWrapperArr = [$("#resizeWrapper0"), $("#resizeWrapper1"),
                         $("#resizeWrapper2"), $("#resizeWrapper3")];
    $editorShowBtnArr = [$("#editorShowHTML"), $("#editorShowCSS"),
                         $("#editorShowJS"), $("#editorShowConsole"),
                         $("#editorShowOutput")];

    $(".editor-resize").draggable({
            "axis": "x",
            "containment": "parent",
            "start": dragStartEditorPanel,
            "stop": resizeEditorPanelWidth,
            "drag": dragEditorPanel
    });
    $(window).on("resize", resizeEditorPanelWidth);

    editors = {
            "html": createEditor("editorHTML", "ace/mode/html"),
            "css": createEditor("editorCSS", "ace/mode/css"),
            "js": createEditor("editorJS", "ace/mode/javascript")
    };

    editors.html.$blockScrolling = Infinity;
    editors.css.$blockScrolling = Infinity;
    editors.js.$blockScrolling = Infinity;

    $editorShowBtnArr.forEach(function ($ele, idx) {
      $ele.on("change", setEditorPanelWidth);
    });
    setEditorPanelWidth();

    editStats.html = { "action": "init", "edit": false, "send": false,
                       "versionNo": 0, "editingTimer": null };
    editStats.css = { "action": "init", "edit": false, "send": false,
                      "versionNo": 0, "editingTimer": null };
    editStats.js = { "action": "init", "edit": false, "send": false,
                     "versionNo": 0, "editingTimer": null };
    $editingLabels = {
            "html": $("#editingLabelHTML"),
            "css": $("#editingLabelCSS"),
            "js": $("#editingLabelJS")
    };
    Object.keys($editingLabels).forEach(function (key) {
      $editingLabels[key].hide();
    });
    viewframe = $("#viewFrame")[0].contentWindow;

        // コンソールパネル設定
    $consoleLog = $("#consoleLog");
    $(window).on("message", function (event) {
      var data = JSON.parse(event.originalEvent.data);
      for (var i in data) {
        $consoleLog.prepend("<div>" + data[i] + "</div>");
      }
    });
    $("#clearConsoleLog").on("click", function () {
      $consoleLog.empty();
    });

        // 別画面表示
    $("#openViewWindow").on("click", function () {
      openViewWindow();
    });

        // コメント変更
    $("#comment").on("change", function () {
      sendComment();
    });

        // ユーザー名設定
    $("#userName").html(store.user);

        // メニュー設定
    setMenuUrlNew();
    setMenuUrlHistory();
    setMenuClassSet();
    setMenuUploadImage();
    setMenuDownload();
    setMenuSignOut();

        // BUTTON: 質問
    setButtonQuestion();

        // BUTTON: 指導完了
    setButtonQuestionEnd();

        // DIALOG: チャット
    createChatDialog();

        // 指導開始イベント受信
    socket.on("q-bgn", function (data) {
      store.qId = data.store.qId;
      socket.emit("chat-get", getEmitData());
      $("#chatDialog").dialog("open");
      $("#chatSendMsg").val("");
      $("#typingLabel").text("");
      typingUsers = [];
      $("#btnQEnd").show();
      teaching = true;
      $("#btnQuestion").hide();
    });

        // セッション維持受信
    socket.on("keep-session", function (data) {
      keepSending = false;
    });

        // チューター情報取得イベント受信
    socket.on("tutor-get", function (data) {
      if (!store.tutor && !teaching) {
        if (data.length > 0) {
          $("#btnQuestion").show();
        } else {
          $("#btnQuestion").hide();
        }
      }
    });

        // メッセージ表示
    setMessageDialog();
    socket.on("message", function (data) {
      $("#messageText").empty();
      $("#messageText").append(data.msg);
      $("#messageDialog").dialog("open");
    });

        // 初期データ取得
    socket.on("connected", function (data) {
      store.socketId = data.socketId;
      getUrlClass();
      getCode();
      getComment();
      socket.emit("url-join", getEmitData());
      socket.on("url-join", function (data_) {
        if (store.tutor) {
                    // 指導開始イベント送信
          socket.emit("q-bgn", getEmitData());
        }
      });
    });
        // セッション維持
    keepSessionCounter = 0;
    keepSessionPolling();

        // チューター情報の受信開始
    startTutorPolling();
  };

  return { init: init };
})(jQuery, socket);

$(function () {
  main.init();
});

/**
 * HTMLエスケープ
 *
 * @param {String} str 変換したい文字列
 */
var escapeHTML = function (str) {
  if (str == null || str == "") {
    return "";
  }
  return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

/**
 * HTMLアンエスケープ
 *
 * @param {String} str 変換したい文字列
 */
var unEscapeHTML = function (str) {
  if (str == null || str == "") {
    return "";
  }

  return str
        .replace(/(&lt;)/g, "<")
        .replace(/(&gt;)/g, ">")
        .replace(/(&quot;)/g, '"')
        .replace(/(&#39;)/g, "'")
        .replace(/(&amp;)/g, "&");
};
