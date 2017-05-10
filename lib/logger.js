"use strict";
var fs = require("fs-extra");
var log4js = require("log4js"),
  logger;

fs.mkdirsSync(__dirname + "/../logs/");

log4js.configure({
    appenders: [
        {
            "type": "dateFile",
            "category": "request",
            "filename": __dirname + "/../logs/wotpro.log",
            "pattern": "-yyyy-MM-dd"
        },
        { "type": "console" }],
    "levels": {
        "access": "ALL",
        "system": "ALL",
        "error": "ALL"
    }
});
logger = log4js.getLogger("request");

module.exports = logger;
