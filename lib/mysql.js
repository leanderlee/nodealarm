
var Client = require('mysql').Client;
var client = new Client();
client.user = 'leander';
client.password = 'leanderiscool';
client.database = 'dbHelloAlarm';
client.connect();

module.exports = client;