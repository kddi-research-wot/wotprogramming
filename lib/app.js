"use strict";

var express = require("express");
var passport = require("passport");
var session = require("express-session");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var GitHubStrategy = require("passport-github2").Strategy;
var partials = require("express-partials");
var logger = require("./logger");
var db = require("./db");
var socketio = require("socket.io");
var requrl = require("url");

var fs = require("fs-extra");
require("date-utils");

var serverConf = JSON.parse(fs.readFileSync(__dirname + "/../" + "config.json", "utf8"));
var githubConf = serverConf.GITHUB;
var GITHUB_CLIENT_ID = githubConf.CLIENT_ID;
var GITHUB_CLIENT_SECRET = githubConf.CLIENT_SECRET;
var SERVER_URL = serverConf.SERVER_URL;
var GITHUB_CALLBACK_URL = "http://" + SERVER_URL + "/auth/github/callback";

// 集約例外
process.on("uncaughtException", function (err) {
  logger.fatal(err);
  console.log(err);
  process.exit(1);
});

logger.info("Start WoT Programming Application");

// Express 設定
var app = express();
app.use(express.static(__dirname + "/../public"));
app.set("views", __dirname + "/../views");
app.set("view engine", "ejs");
app.use(partials());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session({ secret: "keyboard cat", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport セッション設定
passport.serializeUser(function (user, done) {
  var data = user._json;
  logger.info("GitHub login: " + data.login);
  logger.info("GitHub name: " + data.name);
  logger.info("GitHub company: " + data.company);
  logger.info("GitHub blog: " + data.blog);
  logger.info("GitHub location: " + data.location);
  logger.info("GitHub email: " + data.email);
  logger.info("GitHub hireable: " + data.hireable);
  logger.info("GitHub bio: " + data.bio);
  logger.info("GitHub created_at: " + data.created_at);
  logger.info("GitHub followers: " + data.followers);
  logger.info("GitHub following: " + data.following);
  logger.info("GitHub gists_url: " + data.gists_url);
  done(null, user);
});
passport.deserializeUser(function (obj, done) {
  logger.debug("セッションdeserializeUser username:" + obj.username);
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK_URL
},
    function (accessToken, refreshToken, profile, done) {
      logger.debug("GITHUB displayName:" + profile.displayName);
      logger.debug("GITHUB id:" + profile.id);
      logger.debug("GITHUB username:" + profile.username);

      process.nextTick(function () {
        return done(null, profile);
      });
    }
));

// リクエストのセッションにログインユーザが存在するか確認
var isLogined = function (req, res, next) {
  if (req.session.passport.user) {
    // ログイン済み時
    req.user = req.session.passport.user.username;
    next();
    return;
  }
  logger.debug("未ログイン：リダイレクト:/auth/github");
  res.redirect("/auth/github");
};

// URLを自動付与
app.get("/", isLogined, function (req, res) {
  var data = { "store": { "user": req.user } };

    // 最新履歴取得
  db.getUrlUser(data, function (results) {
    if (results.length > 0) {
      res.redirect("/" + results[0].url);
      logger.debug("最新履歴取得 URL:" + results[0].url);
    } else {
            // なければ新規
      db.getUrl(data, function (url) {
        res.redirect("/" + url);
        logger.info("新規URL「" + url + "」を発行しました User: "
　　　　　　　　　　　　+ req.session.passport.user.username);
      });
    }
  });
});

app.get("/login", function (req, res) {
  logger.debug("redirect: /auth/github");
  res.redirect("/auth/github");
});

app.get("/logout", function (req, res) {
  logger.info("Logout User: " + req.session.passport.user.username);
  req.session.destroy(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("https://github.com/logout");
    }
  });
});

// GitHub認証
app.get("/auth/github", function (req, res, next) {
  var callbackURL = "/auth/github/callback";
  if (SERVER_URL != "") {
    callbackURL = req.protocol + "://" + SERVER_URL + callbackURL;
  }
  if (req.query.redirect_uri_text) {
    callbackURL += "?redirect_uri_text=" + req.query.redirect_uri_text;
  }

  passport.authenticate("github", {
        scope: ["user:email"],
        callbackURL: callbackURL
  })(req, res, next);
});

// GitHubコールバック
app.get("/auth/github/callback", function (req, res, next) {
  var redirectUriText = "/";
  if (req.query.redirect_uri_text) {
        // prepend host to avoid open redirects
    redirectUriText = new Buffer(req.query.redirect_uri_text, "base64").toString();
  }
  logger.info("Git Hub Auth");
  passport.authenticate("github", {
        failureRedirect: "/login",
        successRedirect: redirectUriText
  })(req, res, next);
});

// Tutor
app.get("/tutor", function (req, res) {
  if (!req.session.passport.user) {
    var redirectUriText = new Buffer(req.originalUrl);
    res.redirect("/auth/github?redirect_uri_text="
        + redirectUriText.toString("base64"));
  } else {
    req.user = req.session.passport.user.username;
    var data = { "store": {} };
    data.store = {
            "user": req.user
    };
    logger.info("Tutor Login User: " + req.user);
    res.render("tutor", data);
  }
});

// Tutor
app.get("/voicechat", function (req, res) {
  if (!req.session.passport.user) {
    var redirectUriText = new Buffer(req.originalUrl);
    res.redirect("/auth/github?redirect_uri_text="
        + redirectUriText.toString("base64"));
  } else {
    req.user = req.session.passport.user.username;
    var data = { "store": {} };
    var getParam = requrl.parse(req.url, true);
    data.store = {
            "user": req.user,
            "url": getParam.query.url
    };
    logger.info("VoiceChat User: " + req.user);
    res.render("voicechat", data);
  }
});

// その他のURLの場合
app.get("/:url", function (req, res) {
  if (!req.session.passport.user) {
    var redirectUriText = new Buffer(req.originalUrl);
    res.redirect("/auth/github?redirect_uri_text="
        + redirectUriText.toString("base64"));
  } else {
    req.user = req.session.passport.user.username;
    var data = { "store": {} };
    data.store = {
            "user": req.user,
            "url": req.params.url,
            "qId": req.query.q == undefined ? "" : req.query.q,
            "tutor": req.query.q != undefined
    };

    db.isUrl(data, function (results) {
      if (results[0].url == 1) {
        logger.info("Login User: " + req.user + " URL: " + req.params.url);
        res.render("main", data);
      } else {
        logger.error("存在しないURL「" + req.params.url + "」が指定されました User: " + req.user);
        data.store.msg = "存在しないURL「" + req.params.url + "」が指定されました";
        res.render("message", data);
      }
    });
  }
});

// Server
var server = app.listen(3200, function () {
  logger.info("Node.js is listening to PORT:" + server.address().port);
});

// WebSocket
var io = socketio.listen(server),
  nsp = io.nsps["/"];
var activeQList = {};

io.sockets.on("connection", function (socket) {
  logger.debug("sockets つなぎました socket.id:" + socket.id);
  logger.debug(JSON.stringify(socket.handshake));

  var makeUrl4Class = function (className) {
    return "class." + className;
  };

  socket.emit("connected", { "socketId": socket.id });

  socket.on("url-join", function (data) {
    logger.debug("url-join user:" + data.store.user + " url:" + data.store.url);
    var url = data.store.url,
      keys = [];

        // leave
    keys = Object.keys(socket.rooms);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] != socket.id) {
        socket.leave(keys[i]);
      }
    }

        // join
    socket.join(url);

        // 質問がアクティブの場合は指導状態にする
    if (!data.store.tutor && activeQList[url]) {
      data.store.qId = activeQList[url];
      socket.emit("q-bgn", data);
    }

    socket.emit("url-join", data);
  });
  socket.on("url-leave", function (data) {
    logger.debug("url-leave user:" + data.store.user + " url:" + data.store.url);
    socket.leave(data.store.url);
  });
  socket.on("url-get", function (data) {
    logger.debug("url-get user:" + data.store.user + " url:" + data.store.url);
    db.getUrl(data, function (url) {
      data.store.url = url;
      socket.emit("url-get", data);
    });
  });
  socket.on("urlClass-get", function (data) {
    logger.debug("urlClass-get user:" + data.store.user + " url:" + data.store.url);
    db.getUrlClass(data, function (results) {
      socket.emit("urlClass-get", results);
    });
  });

    // コードを取得
  socket.on("code-get", function (data) {
    logger.debug("code-get user:" + data.store.user + " url:" + data.store.url);

        // URLとユーザーを紐づける
    db.setUrlUser(data, function (result) { });
        // 保存済みのコードを取得
    db.getCode(data, function (results) {
      var _results = results;

      if (results.length == 3) {
        socket.emit("code-get", _results);
      } else {
                // テンプレートデータを取得
        data.store.url = "000";
        db.getCode(data, function (templates) {
          templates.forEach(function (template) {
            if (!_results.some(function (_result) {
              return _result.code_type == template.code_type;
            })) {
              _results.push(template);
            }
          });
          socket.emit("code-get", _results);
        });
      }
    });
  });

    // コメントを取得
  socket.on("comment-get", function (data) {
    logger.debug("comment-get user:" + data.store.user + " url:" + data.store.url);
    db.getComment(data, function (results) {
      socket.emit("comment-get", results);
    });
  });
    // コメントをDB登録
  socket.on("comment-set", function (data) {
    logger.debug("comment-set user:" + data.store.user + " url:" + data.store.url);
    db.setComment(data, function (result) {
      if (result.affectedRows > 0) {
        io.to(data.store.url).emit("comment-set", data);
      }
    });
  });

    // URL履歴を取得
  socket.on("url-history", function (data) {
    logger.debug("url-history user:" + data.store.user + " url:" + data.store.url);
    db.getUrlUser(data, function (results) {
      socket.emit("url-history", results);
    });
  });

    // 画像を登録
  socket.on("add-image", function (data) {
    logger.debug("add-image user:" + data.user + " FileName:" + data.name);

        // パスの作成
    var writeFile = data.file;
    data.path = "images/" + data.user + "/";
    var writePath = "./public/" + data.path;
    fs.mkdirsSync(writePath);

        // 重複チェック
    try {
      fs.statSync(writePath + data.name);
      var dt = new Date();
      var splitData = data.name.split(".");
      data.name = splitData[0] + "_" + dt.getTime();
      for (var i = 1; i < splitData.length; i++) {
        data.name = data.name + "." + splitData[i];
      }
    } catch (err) {
      logger.debug("image name overlap");
    }

    var writeStream = fs.createWriteStream(writePath + data.name);
    writeStream.on("drain", function () {
      logger.debug("write: drain");
    })
            .on("error", function (e) {
                // エラー処理
              socket.emit("message", {
                    "msg": "画像登録中にエラーが発生しました<br>\n" + e.message
              });
              logger.error("画像登録中にエラーが発生しました:" + e);
            })
            .on("close", function () {
              logger.info("画像が保存されました path: " + data.path
                  + " name: " + data.name + " user: " + data.user);
              logger.debug("write: colse");
            })
            .on("pipe", function (src) {
              logger.debug("write: pipe");
            });
    // バイナリでお願いする
    writeStream.write(writeFile, "binary");
    writeStream.end();

        // DBに情報を保存
    db.setImageInfo(data, function (result) {
      socket.emit("add-image", data);
    });
  });

    // 画像を削除
  socket.on("delete-image", function (data) {
    logger.debug("delete-image user:" + data.store.user + " url:" + data.store.url);
    fs.remove("./public/" + data.filepath, function (err) {
      if (err) {
        logger.error("画像削除に失敗しました" + err);
      }
    });

    db.deleteImageInfo(data, function (result) {
      socket.emit("delete-image", result);
    });
  });

    // 画像情報を取得
  socket.on("user-image", function (data) {
    logger.debug("user-image user:" + data.store.user + " url:" + data.store.url);
    db.getUserImageInfo(data, function (results) {
      socket.emit("user-image", results);
    });
  });

    // ダウンロード
  socket.on("download-file", function (data) {
    logger.debug("ダウンロード user:" + data.store.user + " url:" + data.store.url);
    var nodeNames = data.filename;
    var fileData = [];
    var newNodeNames = [];

    for (var i = 0; i < nodeNames.length; i++) {
      try {
        fs.statSync("public" + nodeNames[i]);
      } catch (e) {
        logger.warn("存在しないファイルが指定されているので読み飛ばします");
        logger.warn(e);
        continue;
      }
      fileData.push(fs.readFileSync("public" + nodeNames[i], "utf8"));
      newNodeNames.push(nodeNames[i]);
    }

    socket.emit("download-file", {
            "fileData": fileData,
            "nodeNames": newNodeNames
    });
  });

    // コードをDB登録
  socket.on("code-set", function (data) {
    db.setCode(data, function (result) {
      if (result.affectedRows > 0) {
        data.versionNo = data.versionNo + 1;
        io.to(data.store.url).emit("code-set", data);
      }
    });
  });

    // クラス名でROOMにJOIN
  socket.on("class-join", function (data) {
    logger.debug("tutor class-join " + data.keepSessionCounter
        + " user:" + data.store.user + " url:" + data.store.url);

        // leave
    var keys = Object.keys(socket.rooms);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] != makeUrl4Class(data.store.className)) {
        socket.leave(keys[i]);
      }
    }

    socket.join(makeUrl4Class(data.store.className));
    socket.emit("q-upd", data);
  });

    // セッション維持
  socket.on("keep-session", function (data) {
    logger.debug("keep-session " + data.keepSessionCounter + " user:" + data.store.user
        + " url:" + data.store.url + " Class:" + data.store.className + " socketId:"
        + data.store.socketId + " " + socket.handshake.headers["user-agent"]);
    socket.emit("keep-session", data);
  });

  socket.on("class-new", function (data) {
    logger.debug("class-new user:" + data.store.user + " url:" + data.store.url);
    db.chkClassPassword(data, function (results) {
      if (results.length > 0) {
        socket.emit("class-new", data);
      } else {
        db.chkClass(data, function (results_) {
          if (results_.length > 0) {
            socket.emit("class-new", {
                            "msg": "入力が間違っています"
            });
          } else {
            socket.emit("class-confirm-new", {
                            "msg": "「" + data.className + "」を新規登録します、よろしいですか",
                            "className": data.className,
                            "password": data.password
            });
          }
        });
      }
    });
  });

  socket.on("class-make", function (data) {
    logger.debug("class-make user:" + data.store.user + " url:" + data.store.url);
    db.setClass(data, function (result) {
      if (result.affectedRows > 0) {
        socket.emit("class-new", data);
      } else {
        db.chkClassPassword(data, function (results) {
          if (results.length > 0) {
            socket.emit("class-new", data);
          } else {
            socket.emit("class-new", {
                            "msg": "入力が間違っています"
            });
          }
        });
      }
    });
  });
  socket.on("class-set", function (data) {
    logger.debug("class-set user:" + data.store.user + " url:" + data.store.url);
    db.chkClassPassword(data, function (results) {
      if (results.length == 0) {
        socket.emit("class-set", {
                    "msg": "入力が間違っています"
        });
      } else {
        db.setUrlClass(data, function (result) {
          io.to(data.store.url).emit("class-set", data);
        });
      }
    });
  });
  socket.on("q-set", function (data) {
    logger.debug("q-set user:" + data.store.user + " url:" + data.store.url);
    db.setQuestion(data, function (result) {
      io.to(makeUrl4Class(data.store.className)).emit("q-upd", data);
      io.to(makeUrl4Class(data.store.className)).emit("new-question", data);
    });
  });
  socket.on("q-bgn", function (data) {
    logger.debug("q-bgn user:" + data.store.user + " url:" + data.store.url);
    if (activeQList[data.store.url] && activeQList[data.store.url] == data.store.qId) {
      io.to(data.store.url).emit("q-bgn", data);
      io.to(makeUrl4Class(data.store.className)).emit("q-upd", data);
    } else {
      activeQList[data.store.url] = data.store.qId;
      db.setQuestionBgn(data, function () { });
      data.chatMsg = "指導開始";
      db.setChat(data, function (result) {
        io.to(data.store.url).emit("q-bgn", data);
        io.to(makeUrl4Class(data.store.className)).emit("q-upd", data);
      });
    }
  });
  socket.on("q-end", function (data) {
    logger.debug("q-end user:" + data.store.user + " url:" + data.store.url);
    delete activeQList[data.store.url];
    db.setQuestionEnd(data, function (result) {
      io.to(data.store.url).emit("q-end", data);
      io.to(makeUrl4Class(data.store.className)).emit("q-upd", data);
    });
  });
  socket.on("q-get", function (data) {
    logger.debug("q-get user:" + data.store.user + " url:" + data.store.url);
    db.getQuestions(data, function (results) {
      socket.emit("q-get", results);
    });
  });
  socket.on("chat-get", function (data) {
    logger.debug("chat-get user:" + data.store.user + " url:" + data.store.url);
    db.getChat(data, function (results) {
      var retData = [];
      results.forEach(function (value, index) {
        retData.push({
                    "chatMsg": value.chat_msg,
                    "chatUser": value.chat_user
        });
      });
      io.to(data.store.url).emit("chat-get", retData);
    });
  });
  socket.on("chat-send", function (data) {
    logger.debug("chat-send user:" + data.store.user + " url:" + data.store.url);
    io.to(data.store.url).emit("chat-send", {
            "chatMsg": data.chatMsg,
            "chatUser": data.store.user
    });
    db.setChat(data, function (result) { });
  });

  socket.on("typing-send", function (data) {
    logger.debug("入力中 user:" + data.store.user + " url:" + data.store.url);
    io.to(data.store.url).emit("typing-send", data);
  });

    // クライアントから発信を受信
  socket.on("voice-call-send", function (data) {
    logger.debug("voice-call-send user:" + data.store.user + " url:" + data.store.url);

        // 各クライアントに発信を送信
    io.to(data.store.url).emit("voice-call-receive", data);
    data.chatMsg = "音声チャットのリクエストをしました";
    io.to(data.store.url).emit("chat-send", {
            "chatMsg": data.chatMsg,
            "chatUser": data.store.user
    });
    db.setChat(data, function (result) { });
  });

    // リクエストユーザリスト作成
  socket.on("voice-user-list", function (data) {
    io.to(data.store.url).emit("voice-user-list", data);
  });

    // クライアントから着信を受信
  socket.on("voice-call-receive", function (data) {
    logger.debug("voice-call-receive user:" + data.store.user + " url:" + data.store.url);
       // 各クライアントに着信を送信
    io.to(data.store.url).emit("voice-bgn", data);
  });
    // 受信者から取消を受信
  socket.on("voice-call-cancel", function (data) {
    logger.debug("voice-call-cancel user:" + data.store.user + " url:" + data.store.url);

    data.chatMsg = "音声チャットのリクエストを拒否しました";
    io.to(data.store.url).emit("chat-send", {
            "chatMsg": data.chatMsg,
            "chatUser": data.store.user
    });
    db.setChat(data, function (result) { });

        // 全員がキャンセルしたか確認できるのか
    io.to(data.store.url).emit("voice-call-cancel", data);
  });

    // 同ユーザの着信を消す
  socket.on("voice-call-close", function (data) {
    io.to(data.store.url).emit("voice-call-close", data);
  });

    // 発信者から取消を受信
  socket.on("voice-call-cancel-all", function (data) {
    logger.debug("voice-call-cancel user:" + data.store.user + " url:" + data.store.url);

    data.chatMsg = "発信者より音声チャットがキャンセルされました";
    io.to(data.store.url).emit("chat-send", {
            "chatMsg": data.chatMsg,
            "chatUser": data.store.user
    });
    db.setChat(data, function (result) { });

        // 各クライアントに取消を送信
    io.to(data.store.url).emit("voice-cancel", data);
  });

    // voice終了
  socket.on("voice-end", function (data) {
    io.to(data.store.url).emit("voice-end", data);
  });

    // チューター一覧を返す
  socket.on("tutor-get", function (data) {
    logger.debug("tutor-get user:" + data.store.user + " url:" + data.store.url
        + " " + socket.handshake.headers["user-agent"]);
    var tutors = nsp.adapter.rooms[makeUrl4Class(data.store.className)];
    if (tutors) {
      socket.emit("tutor-get", tutors);
    } else {
      socket.emit("tutor-get", { "length": 0 });
    }
  });
});
