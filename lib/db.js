"use strict";
var fs = require("fs-extra");
var db = (function () {
  var logger = require("./logger"),
    mysql = require("mysql");
  var mysqlConf = JSON.parse(fs.readFileSync(__dirname
      + "/../" + "config.json", "utf8")).MYSQL;
  var con = mysql.createConnection(mysqlConf);

  var execQuery = function (sql, params, func) {
    con.query(sql, params, function (err, results) {
      if (err) {
        throw err;
      }
      func(results);
    });
  };

    // create UNIQUE URL
  var getUrl = function (data, funcCallback) {
    var chars = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
                   "k", "m", "n", "p", "q", "r", "s", "t", "u", "w", "x", "y", "z"],
      url = "",
      sql, params = [],
      subFunc, subFuncCallback;

    sql = "insert ignore into t_url "
            + "     ( url "
            + "     , ins_date "
            + "     , ins_user "
            + "     , upd_date "
            + "     , upd_user) "
            + "values "
            + "     ( ?, now(), ?, now(), ?)";
    params = [url, data.store.user, data.store.user];

    subFunc = function (cb) {
            // 生成したURLをDB登録
      params[0] = url;
      execQuery(sql, params, cb);
    };
    subFuncCallback = function (result) {
      if (result.affectedRows > 0) {
                // URLが重複していなかった場合はそのURLを返す
        funcCallback(url);
        logger.debug("URL���쐬���܂��� URL:" + url);
      } else {
                // URLが重複していた場合は1桁追加して再挑戦
        url = url + chars[Math.floor(Math.random() * chars.length)];
        subFunc(subFuncCallback);
      }
    };

        // 3桁のURLを生成
    for (var i = 0; i < 5; i++) {
      url = url + chars[Math.floor(Math.random() * chars.length)];
    }
    subFunc(subFuncCallback);
  };

    // コードを返す
  var getCode = function (data, func) {
    var sql, params = [];
    sql = "select code_type "
            + "     , code "
            + "     , version_no "
            + "  from t_code"
            + " where url = ? ";
    params = [data.store.url];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

  var setCode = function (data, func) {
    var sql, params = [];

        // Update
    sql = "update t_code "
            + "   set code = ? "
            + "     , version_no = version_no + 1 "
            + "     , upd_date = now() "
            + "     , upd_user = ? "
            + " where url = ? "
            + "   and code_type = ? "
            + "   and version_no = ? ";
    params = [data.code, data.store.user, data.store.url, data.codeType, data.versionNo];
    execQuery(sql, params, function (result) {
      if (result.affectedRows > 0) {
        func(result);
      } else {
                // Insert (ignore)
        sql = "insert ignore into t_code "
                    + "     ( url "
                    + "     , code_type "
                    + "     , code "
                    + "     , version_no "
                    + "     , ins_date "
                    + "     , ins_user "
                    + "     , upd_date "
                    + "     , upd_user) "
                    + "values "
                    + "     (?, ?, ?, 1, now(), ?, now(), ?)";
        params = [data.store.url, data.codeType, data.code,
                  data.store.user, data.store.user];
        execQuery(sql, params, function (result_) {
          func(result_);
        });
      }
    });
  };

    // URL存在確認 有り:1 無し:0
  var isUrl = function (data, func) {
    var sql, params = [];
    sql = "select exists(select * "
            + " from t_url "
            + " where url = ?) url ";
    params = [data.store.url];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

    // コメントを返す
  var getComment = function (data, func) {
    var sql, params = [];
    sql = "select comment"
            + "  from t_url"
            + " where url = ? ";
    params = [data.store.url];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

  var setComment = function (data, func) {
    var sql, params = [];

        // Update
    sql = "update t_url "
            + "   set comment = ? "
            + "     , upd_date = now() "
            + "     , upd_user = ? "
            + " where url = ? ";
    params = [data.comment, data.store.user, data.store.url];
    execQuery(sql, params, function (result) {
      func(result);
    });
  };

  var chkClassPassword = function (data, func) {
    var sql, params = [];
    sql = "select class_name "
            + "  from t_class "
            + " where class_name = ? "
            + "   and password = ? ";
    params = [data.className, data.password];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

  var chkClass = function (data, func) {
    var sql, params = [];
    sql = "select class_name "
            + "  from t_class "
            + " where class_name = ? ";
    params = [data.className];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

  var setClass = function (data, func) {
    var sql, params = [];
    sql = "insert ignore into t_class "
            + "     ( class_name "
            + "     , password "
            + "     , ins_date "
            + "     , ins_user "
            + "     , upd_date "
            + "     , upd_user) "
            + "values "
            + "     (?, ?, now(), ?, now(), ?)";
    params = [data.className, data.password, data.store.user, data.store.user];
    execQuery(sql, params, function (result) {
      func(result);
    });
  };

    // URLに登録されたクラス名を返します
  var getUrlClass = function (data, func) {
    var sql, params = [];
    sql = "select class_name "
            + "  from t_url_class "
            + " where url = ? "
            + " order by upd_date desc ";
    params = [data.store.url];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

    // URLにクラス名を登録します
  var setUrlClass = function (data, func) {
    var sql, params = [];
    sql = "delete from t_url_class "
            + "where url = ? ";
    params = [data.store.url];
    execQuery(sql, params, function (result) {
      sql = "insert ignore into t_url_class "
                + "     ( url "
                + "     , class_name "
                + "     , ins_date "
                + "     , ins_user "
                + "     , upd_date "
                + "     , upd_user) "
                + "values "
                + "     ( ?, ?, now(), ?, now(), ?)";
      params = [data.store.url, data.className, data.store.user, data.store.user];
      execQuery(sql, params, function (result_) {
        func(result_);
      });
    });
  };

    // URLにユーザーを登録します
  var setUrlUser = function (data, func) {
    var sql, params = [];

        // Insert (ignore)
    sql = "insert ignore into t_url_user "
            + "     ( url "
            + "     , user_name "
            + "     , ins_date "
            + "     , ins_user "
            + "     , upd_date "
            + "     , upd_user) "
            + "values "
            + "     ( ?, ?, now(), ?, now(), ?)";
    params = [data.store.url, data.store.user, data.store.user, data.store.user];
    execQuery(sql, params, function (result) {
      if (result.affectedRows > 0) {
        func(result);
      } else {
                // Update
        sql = "update t_url_user "
                    + "   set upd_date = now() "
                    + "     , upd_user = ? "
                    + " where url = ? "
                    + "   and user_name = ? ";
        params = [data.store.user, data.store.url, data.store.user];
        execQuery(sql, params, function (result_) {
          func(result_);
        });
      }
    });
  };
    // ユーザーに紐付くURLを取得します
  var getUrlUser = function (data, func) {
    var sql, params = [];
    sql = "select a.url "
            + "     , ifnull(b.comment, '') comment "
            + "     , a.user_name "
            + "     , date_format(a.ins_date, '%Y/%m/%d %H:%i') ins_date "
            + "     , a.ins_user "
            + "     , date_format(a.upd_date, '%Y/%m/%d %H:%i') upd_date "
            + "     , a.upd_user "
            + "  from t_url_user a "
            + "       inner join t_url b"
            + "          on a.url = b.url "
            + " where a.user_name = ? "
            + " order by a.upd_date desc "
            + " limit 20 ";
    params = [data.store.user];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };
    // コードスナップショットIDを取得します
  var getSSID = function (data, func) {
    var sql, params = [];
    sql = "insert into t_ss_id "
            + "     ( url "
            + "     , ins_date "
            + "     , ins_user) "
            + "values "
            + "     ( ?, now(), ?) ";
    params = [data.store.url, data.store.user];
    execQuery(sql, params, function (result) {
      func(result.insertId);
    });
  };

    // コードスナップショットを作成します
  var setSS = function (data, func) {
    getSSID(data, function (result) {
      var ssId = ssId = result,
        sql, params = [];
      sql = "insert into t_ss "
                + "     ( ss_id "
                + "     , code_type "
                + "     , code "
                + "     , ins_date "
                + "     , ins_user "
                + "     , upd_date "
                + "     , upd_user) "
                + "select ? "
                + "     , code_type "
                + "     , code "
                + "     , now() "
                + "     , ? "
                + "     , now() "
                + "     , ? "
                + "  from t_code "
                + " where url = ? ";
      params = [ssId, data.store.user, data.store.user, data.store.url];
      execQuery(sql, params, function (result_) {
        func(ssId);
      });
    });
  };

    // 質問を登録します
  var setQuestion = function (data, func) {
    setSS(data, function (result) {
      var ssId = result,
        sql, params = [];
      sql = "insert into t_question "
                + "     ( q_content "
                + "     , q_date "
                + "     , q_user "
                + "     , q_ss_id "
                + "     , ins_date "
                + "     , ins_user "
                + "     , upd_date "
                + "     , upd_user) "
                + "values "
                + "     ( ?, now(), ?, ?, now(), ?, now(), ?) ";
      params = [data.content, data.store.user, ssId, data.store.user, data.store.user];
      execQuery(sql, params, function (result_) {
        func(result_.insertId);
      });
    });
  };

    // 質問テーブルに指導開始を登録します
  var setQuestionBgn = function (data, func) {
    var sql, params = [];
    sql = "update t_question "
            + "   set t_user = ? "
            + "     , t_bgn_date = now() "
            + "     , upd_date = now() "
            + "     , upd_user = ? "
            + " where q_id = ? ";
    params = [data.store.user, data.store.user, data.store.qId];
    execQuery(sql, params, function (result) {
      func(result.insertId);
    });
  };

    // 質問テーブルに指導完了を登録します
  var setQuestionEnd = function (data, func) {
    setSS(data, function (result) {
      var ssId = result,
        sql, params = [];
      sql = "update t_question "
                + "   set t_end_date = now() "
                + "     , t_end_ss_id = ? "
                + "     , upd_date = now() "
                + "     , upd_user = ? "
                + " where q_id = ? ";
      params = [ssId, data.store.user, data.store.qId];
      execQuery(sql, params, function (result_) {
        func(result_.insertId);
      });
    });
  };

    // クラスに登録された質問を返します
  var getQuestions = function (data, func) {
    var sql, params = [];
        // e_date��NULL���擪�ɂ��č~���\�[�g
    sql = "select a.q_id "
            + "     , a.q_content "
            + "     , date_format(a.q_date, '%Y/%m/%d %H:%i') q_date "
            + "     , a.q_user "
            + "     , c.url "
            + "     , date_format(a.t_end_date, '%Y/%m/%d %H:%i') e_date "
            + "  from t_question a "
            + "       inner join t_ss_id b"
            + "          on a.q_ss_id = b.ss_id "
            + "       inner join t_url_class c"
            + "          on b.url = c.url "
            + " where c.class_name = ? "
            + " order by t_end_date is null desc, q_date desc ";
    params = [data.store.className];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

    // チャットのメッセージを保存します
  var setChat = function (data, func) {
    var sql, params = [];
    sql = "insert into t_chat "
            + "     ( q_id "
            + "     , chat_msg "
            + "     , chat_date "
            + "     , chat_user "
            + "     , ins_date "
            + "     , ins_user) "
            + "values "
            + "     ( ?, ?, now(), ?, now(), ?) ";
    params = [data.store.qId, data.chatMsg, data.store.user, data.store.user];
    execQuery(sql, params, function (result) {
      func(result);
    });
  };

    // 質問IDに登録されたチャットメッセージを返します
  var getChat = function (data, func) {
    var sql, params = [];
    sql = "select chat_msg "
            + "     , date_format(chat_date, '%Y/%m/%d %H:%i') chat_date "
            + "     , chat_user "
            + "  from t_chat "
            + " where q_id = ? "
            + " order by chat_id ";
    params = [data.store.qId];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

    // ユーザーに紐付く画像情報を取得します
  var getUserImageInfo = function (data, func) {
    var sql, params = [];
    sql = "select a.image_id "
            + "     , a.ins_user "
            + "     , DATE_FORMAT(a.ins_date,'%Y/%m/%d %H:%i:%S') ins_date "
            + "     , a.file_name "
            + "     , a.path "
            + "  from t_image a "
            + " where a.ins_user = ? "
            + " order by a.ins_date desc "
            + " limit 20 ";
    params = [data.store.user];
    execQuery(sql, params, function (results) {
      func(results);
    });
  };

    // 画像情報を削除します
  var deleteImageInfo = function (data, func) {
    var sql, params = [];
    sql = "delete from t_image "
            + "where image_id = ? ";
    params = [data.image_id];
    execQuery(sql, params, function (result) {
      func(result);
    });
  };

    // 画像情報を削除します
  var setImageInfo = function (data, func) {
    var sql, params = [];
    sql = "insert into t_image "
            + "     ( ins_user "
            + "     , ins_date "
            + "     , file_name "
            + "     , path) "
            + "values "
            + "     ( ?, now(), ?, ?) ";
    params = [data.user, data.name, data.path];
    execQuery(sql, params, function (result) {
      func(result);
    });
  };

  return {
        getUrl: getUrl,
        getCode: getCode,
        setCode: setCode,
        getComment: getComment,
        setComment: setComment,
        chkClassPassword: chkClassPassword,
        chkClass: chkClass,
        setClass: setClass,
        getUrlClass: getUrlClass,
        setUrlClass: setUrlClass,
        setUrlUser: setUrlUser,
        getUrlUser: getUrlUser,
        isUrl: isUrl,
        getUserImageInfo: getUserImageInfo,
        setImageInfo: setImageInfo,
        deleteImageInfo: deleteImageInfo,
        setQuestion: setQuestion,
        setQuestionBgn: setQuestionBgn,
        setQuestionEnd: setQuestionEnd,
        getQuestions: getQuestions,
        setChat: setChat,
        getChat: getChat,
  };
})();

module.exports = db;

