exports.bind = function (server) {
    
    var mysql = require('./lib/mysql');
    
    function make_string(length) {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length = length || 20;
        var randomstring = '';
        for (var i=0; i<string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum,rnum+1);
        }
        return randomstring;
    }
    
    server.all('/logout', function (req, res) {
        mysql.query('UPDATE sessions SET valid=0 WHERE cookie=? LIMIT 1', [req.session.sauce]);
        req.session.destroy();
        res.writeHead(302, { 'Location' : '/' });
        res.end('');
    });
    server.all('/json/check-email', function (req, res) {
        var email = req.param('email', '');
        mysql.query('SELECT id FROM users WHERE email=? LIMIT 1', [email], function (err, row) {
            if (row.length) {
                res.end('true');
            } else {
                res.end('false');
            }
        });
    });
    server.post('/json/login', function (req, res) {
        var timestamp = Math.round((new Date()).getTime()/1000);
        var email = req.param('email', '');
        var password = req.param('password', '');
        mysql.query('SELECT id, password, salt FROM users WHERE email=?', [email], function (err, row) {
            if (row.length) {
                var crypto = require('crypto/sha1');
                var salt = row[0].salt;
                var hashed = crypto.hex_sha1(salt + password + salt);
                var sauce = make_string(10) + '.' + email + ':' + row[0].id + '.' + timestamp;
                if (hashed == row[0].password) {
                    var sql = 'INSERT INTO sessions (cookie, user_id,timestamp,user_agent,ip_address,valid) VALUES (?,?,?,?,?,1)';
                    var params = [sauce, row[0].id, timestamp, req.headers['user-agent'], req.connection.remoteAddress];
                    mysql.query(sql, params, function () {
                        req.session.sauce = sauce;
                        req.session.logged_in = true;
                        res.end(JSON.stringify({ success: true, email: email, user_id: row[0].id }));
                    });
                } else {
                    res.end(JSON.stringify({ error: true, message: 'your password is invalid' }));
                }
            } else {
                res.end(JSON.stringify({ error: true, message: 'your email is invalid' }));
            }
        });
    });
    server.all('/json/get-prefs', function (req, res) {
        res.end('');
    });
    server.all('/json/set-prefs', function (req, res) {
        res.end('');
    });
    server.all('/json/register', function (req, res) {
        var email = req.param('email', '');
        var password = req.param('password', '');
        if (email.length > 100 || !email.match(/^[\w\.%+-]+@([\w-]+\.)+\w+$/)) {
            res.end(JSON.stringify({ success: false, message: 'your email address is invalid' }));
            return;
        }
        if (password.length > 25 || password.length < 6) {
            res.end(JSON.stringify({ success: false, message: 'your password must be between 6 and 25 characters' }));
            return;
        }
        var salt = make_string();
        var crypto = require('crypto/sha1');
        var hashed = crypto.hex_sha1(salt + password + salt);
        mysql.query('SELECT id FROM users WHERE email=? LIMIT 1', [email], function (err, row) {
            if (row.length) {
                res.end(JSON.stringify({ success: false, message: 'you already exist in the database...' }));
            } else {
                mysql.query('INSERT INTO users (email,password,salt,status) VALUES (?,?,?,1)', [email,hashed,salt], function (err, row) {
                    if (!err && row.affectedRows) {
                        res.end(JSON.stringify({ success: true, 'user_id': row.insertId }))
                    } else {
                        res.end(JSON.stringify({ success: false, 'message': row.message }))
                    }
                });
            }
        });
    });
    server.all('/json/get-location', function (req, res) {
        var ip = req.connection.remoteAddress.split('.');
        var ipnum = 16777216*parseInt(ip[0]) + 65536*parseInt(ip[1]) + 256*parseInt(ip[2]) + parseInt(ip[3]);
        console.log(ipnum);
        var sql = 'SELECT b.* FROM ip_location2 as a, ip_locations3 as b WHERE ? >= a.start_ip_num AND ? <= a.end_ip_num AND a.loc_id=b.loc_id LIMIT 1';
        mysql.query(sql, [ipnum, ipnum], function (err, row) {
            res.end(JSON.stringify(row[0]));
        });
    });
    server.all('/json/get-weather', function (req, res) {
        var Client = require('mysql').Client;
        var client = new Client();
        client.user = 'leander';
        client.password = 'leanderiscool';
        client.connect();
        client.query('use dbHelloAlarm', function (err) {
            // ipnum = 16777216*w + 65536*x + 256*y + z
            var ip = req.connection.remoteAddress.split('.');
            var ipnum = 16777216*parseInt(ip[0]) + 65536*parseInt(ip[1]) + 256*parseInt(ip[2]) + parseInt(ip[3]);
            console.log(ipnum);
            var sql = 'SELECT b.* FROM ip_location2 as a, ip_locations3 as b WHERE ? >= a.start_ip_num AND ? <= a.end_ip_num AND a.loc_id=b.loc_id LIMIT 1';
            client.query(sql, [ipnum, ipnum], function (err, row) {
                var Weather = new require('./lib/weather').Weather;
                var weather = new Weather();
                var options = {
                    'query': { 'weather': row[0].city + ',' + row[0].region },
                    'format': 'plain'
                };
                weather.forecast(options, function(data) {
                    var sys = require('sys');
                    var xml2js = require('xml2js');
                    var parser = new xml2js.Parser();
                    parser.addListener('end', function (result) {
                        result = result.weather;
                        var temp = result.current_conditions.temp_c['@'].data;
                        var condition = result.current_conditions.condition['@'].data;
                        var city = result.forecast_information.city['@'].data;
                        res.end(JSON.stringify({ 'temp': temp, 'condition': condition, 'city': city }));
                    });
                    parser.parseString(data);
                })
            });
        });
    });
    server.all('/talk', function (req, res) {
        var say = req.param('text', '');
        if (say) {
            var http = require('http');
            var options = {
                host: 'translate.google.com',
                port: 80,
                path: '/translate_tts?tl=en&q=' + escape(say),
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            };
            http.get(options, function (sub_get) {
                res.writeHead(sub_get.statusCode, sub_get.headers);
                sub_get.on('data', function (chunk) {
                    res.write(chunk);
                });
                sub_get.on('complete', function () {
                    res.end();
                });
            });
        } else {
            res.end();
        }
    });
    server.all('/', function (req, res) {
        res.render('index.html', { title: 'Jarvis' });
    });
    
};
