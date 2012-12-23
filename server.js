//  Vanillla Inc.   Leander and Pierre

require('connect-redis');
var app = require('express');

process.on('uncaughtException', function (err) {
	console.error(err);
	console.log("Node NOT Exiting...");
});

var server = app.createServer();
server.set('views', __dirname + '/views');
server.set('view options', { layout: false });
server.register('.html', require('ejs'));
server.use(app.static(__dirname + '/static'));
server.use(app.errorHandler({ dumpExceptions: true, showStack: true }));
server.use(app.bodyParser());
server.use(app.cookieParser());
server.use(app.session({ secret:
    '1@Ad$fJ6i7632cbd8eWE!091@=9b8#81e!5Y81bcK0.' +
    '\-o-/    bat' +
    '><{{{{"> fish' + 
    '<^__)~~  mouse' +
    'ommmmmmo worm' +
    '!!_@     snail' +
    '())__CRAYON__))>'
}));

var routes = require('./routes');
routes.bind(server);

exports.server = server;
