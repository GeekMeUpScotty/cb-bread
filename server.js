(function () {
    'use strict';

    var path = require('path');
    var util = require('util');

    var packageJson = require('./package.json');
    var packageMsg = util.format("\n%s: %s\nVersion %s Copyright %s\n\n", packageJson.name, packageJson.description, packageJson.version, packageJson.copyright);
    var epilogMsg = util.format("For more information see %s/blob/%s/README.md\n\nReport issues at %s", packageJson.repository.url, packageJson.version, packageJson.bugs.url)

    var defaultPageSize = 10;
    var defaultTimeoutSeconds = 60;

    // https://github.com/chevex/yargs
    var yargs = require('yargs')
        .usage(packageMsg + 'Usage: node server [--host=(host)] [--user=(user)] [--password=(password)] [--debug] [--responses] [--listen=8008] [--proxy=my.proxy:8888]')
        .example("node server", "Listens on port 8008 with minimal logging. Requires user to enter Couchbase host, user and password.\n")
        .example("node server -h localhost -u admin", "Listens on port 8008 with minimal logging. Defaults to Couchbase on 'localhost' as user 'admin'. Requires user to enter Couchbase password.\n")
        .example("node server -u admin -p demo01 -l 8080", "Listens on port 8080 with minimal logging. Defaults to Couchbase user 'admin' with password 'demo01'. Requires user to enter Couchbase host name.\n")
        .example("node server --proxy=my.proxy:8888", "Listens on port 8008 and uses the designated network proxy.\n")
        .option('?', {
            alias: 'help',
            describe: 'Display the usage.'
        })
        .version(packageJson.version, 'v', "Show version number.").alias('v', 'version')
        .option('h', {
            alias: 'host',
            describe: 'Set Couchbase host.'
        })
        .option('u', {
            alias: 'user',
            describe: 'Set Couchbase user.'
        })
        .option('p', {
            alias: 'password',
            describe: 'Set Couchbase password.'
        })
        .option('s', {
            alias: 'pagesize',
            describe: 'Set document viewer page size. Negative means reverse sort. [min -1000, max 1000]',
            default: defaultPageSize
        })
        .option('t', {
            alias: 'timeout',
            describe: 'Maximum time in seconds to scan for document query results.',
            default: defaultTimeoutSeconds
        })
        .option('l', {
            alias: 'listen',
            describe: 'Set HTTP listen port.',
            default: process.env.port || 8008
        })
        .option('x', {
            alias: 'proxy',
            describe: 'Enable a request proxy server and port.'
        })
        .option('d', {
            alias: 'debug',
            describe: 'Enable debug level log messages.'
        })
        .option('r', {
            alias: 'responses',
            describe: 'Log responses from server API requests.'
        })
        .epilog(epilogMsg)
        .strict();
    var argv = yargs.argv;
    if (argv.help) {
        yargs.showHelp();
        process.exit(0);
    } else if (argv._ && (argv._.length > 0)) {
        yargs.showHelp();
        console.log("Unknown token: " + argv._);
        process.exit(0);
    }

    var log4js = require('log4js');
    var logger = log4js.getLogger('cb-bread');
    if (argv.debug) {
        logger.setLevel('DEBUG');
    }
    else {
        logger.setLevel('INFO');
    }

    process.on('uncaughtException', function (err) {
        console.trace("Uncaught Exception");
        logger.error("process.on uncaughtException\n" + util.inspect(err) + "\n=== Stack trace ===\n" + err.stack);
    });

    logger.info("Run as 'node server -?' for command-line options.");
    logger.debug('config - responses: ' + argv.responses);
    logger.debug('config - listen: ' + argv.listen);
    logger.debug('config - proxy: ' + argv.proxy);

    if (argv.pagesize === 0) {
        argv.pagesize = defaultPageSize;
    }

    if (argv.proxy) {
        var array = argv.proxy.split(':');
        if (array.length === 2) {
            var host = array[0];
            var port = array[1];
            require('./request-proxy.js')(host, port, logger);
        }
    }

    var express = require('express');
    var app = express();

    // log
    app.use(function (req, res, next) {
        var requestTimeInMs = Date.now();
        res.on('finish', function () {
            var durationInMs = Date.now() - requestTimeInMs;
            logger.debug('[' + req.method + '] ' + durationInMs + 'ms: ' + req.url);
        });
        next();
    });
    // url encoding
    var bodyParser = require('body-parser');
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    // gzip
    var compression = require('compression');
    app.use(compression());
    // redirect all html requests to `index.html`
    app.use(function (req, res, next) {
        if (req.path.split('/')[1] === 'api') {
            // api request
            next();
        }
        else if (path.extname(req.path).length > 0) {
            // normal static file request
            next();
        }
        else {
            // should force return `index.html` for angular.js
            req.url = '/index.html';
            next();
        }
    });

    // static file serve
    app.use(express.static(__dirname + '/app'));

    // http://expressjs.com/guide/error-handling.html
    app.use(function(err, req, res, next){
        logger.error("app.use error\n" + util.inspect(err) + "\n=== Stack trace ===\n" + err.stack);
        res.status(500).send("Server error. Are your credentials correct?");
    });

    // launch api
    var api = require('./api');
    api.initialize(app, argv, logger);

    app.listen(argv.listen);
    logger.info('http://localhost:' + argv.listen + '/');
    process.title = 'cb-bread';
})();