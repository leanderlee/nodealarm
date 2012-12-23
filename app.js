// node app.js [port=8301 [production=false]]

global.production = !!(process && process.argv[3]);
global.port = process.argv[2] || 8888;

var nodejs = require('./server');
var server = nodejs.server;
console.log('Starting server...\nListening on port ' + global.port);

if (global.production) {
	console.log('\nRunning in PRODUCTION mode.');
} else {
	console.log('\nRunning in development mode.');
}

server.listen(global.port);
