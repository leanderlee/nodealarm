
// Analytics
var version_string = '0.4';
var analytics_switch = true;
if (analytics_switch) {
	try {
		var mpmetrics = new MixpanelLib("ca914755a14efe61584e8471cddcdd37");
	} catch(err) {
		var null_fn = function () {};
		var mpmetrics = {
			track: null_fn,
			track_funnel: null_fn,
			register: null_fn,
			register_once: null_fn,
			register_funnel: null_fn,
			identify: null_fn
		};
	}
} else {
	var null_fn = function () {};
	var mpmetrics = {
		track: null_fn,
		track_funnel: null_fn,
		register: null_fn,
		register_once: null_fn,
		register_funnel: null_fn,
		identify: null_fn
	};
}

// Language

var User = {
    pref: {},
    check: function (email, callback) {
        $.ajax({
            url: 'json/check-email',
            data: { email: email },
            type: 'POST',
            dataType: 'json',
            success: function (data) {
                if (callback) callback.call(this, data);
            }
        });
    },
    login: function (email, password, on_success, on_fail) {
        $.ajax({
            url: 'json/login',
            data: { email: email, password: password },
            type: 'POST',
            dataType: 'json',
            success: function (data) {
                if (data.success) {
                    if (on_success) on_success.call(this, email);
                } else {
                    if (on_fail) on_fail.call(this, (data.message || ' our programmers are at the zoo'));
                }
            }
        });
    },
    logout: function () {
        $.ajax({
            url: '/logout',
            data: {},
            type: 'GET',
            dataType: 'json',
            success: function (data) {}
        });
    },
    save: function (key, value) {
        User.pref[key] = value;
        User.set_pref(User.pref);
    },
    set_pref: function (obj) {
        $.ajax({
            url: '/json/set-prefs',
            data: { prefs: JSON.stringify(obj) },
            type: 'POST',
            dataType: 'json',
            success: function (data) {}
        });
    },
    get_pref: function (callback) {
        $.ajax({
            url: '/json/get-prefs',
            data: {},
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                callback.call(this, data);
            }
        });
    },
    register: function (email, password, on_success, on_fail) {
        $.ajax({
            url: 'json/register',
            data: { email: email, password: password },
            type: 'POST',
            dataType: 'json',
            success: function (data) {
                if (data.success) {
                    User.login(email, password, on_success, function () {});
                } else {
                    if (on_fail) on_fail.call(this, (data.message || ' our programmers are sleeping'));
                }
            }
        });
    }
};
var Utilities = {
    is_chrome: navigator.userAgent.match(/chrome/gi),
    is_playable: function(type) {
        var a = document.createElement('audio');
        return !!(a.canPlayType && a.canPlayType(type).replace(/no/, ''));
    },
	query_string: function (key) {
		var reQS = new RegExp("[?&]" + key + "=([^&$]*)", "i");
		var offset = location.search.search(reQS);
		return (offset >= 0) ? RegExp.$1 : null;
	},
    cookie: function(name) {
        var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
        return r ? r[1] : undefined;
    }
};
Utilities.mp3able = Utilities.is_playable('audio/mpeg;');
Utilities.oggable = Utilities.is_playable('audio/ogg; codecs="vorbis"');

var Language = {
    day_map: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    mon_map: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    max_day_map: [31,28,31,30,31,30,31,31,30,31,30,31],
    str_to_seconds: function (q) {
        // TODO: More advanced patterns, such as, 9am 3 weeks from now
        //       or 12pm on friday.
        var number_time = q.replace(/(^\s*|\s+)an?\s+/gi, ' 1 ');
        number_time = number_time.replace(/(\d+)$/gi, '$1 m ');
        var time_intervals = {
            's': 1000,
            'm': 60*1000,
            'hr?': 60*60*1000,
            'd': 24*60*60*1000,
            'w': 7*24*60*60*1000,
            'sec.*?': 1000,
            'min.*?': 60*1000,
            'hour.*?': 60*60*1000,
            'day.*?': 24*60*60*1000,
            'week.*?': 7*24*60*60*1000
        };
        var result_string = '';
        var total_offset = 0;
        var interval, i;
        for (interval in time_intervals) {
            if (time_intervals.hasOwnProperty(interval)) {
                var regex = new RegExp('\\d+\\s*' + interval + '(\\s+|\\s*$)', 'gi');
                var match = number_time.match(regex);
                if (match) {
                    for (i = 0; i < match.length; i++) {
                        var number = match[i].match(/^\d+/gi);
                        if (number) {
                            var multiplier = parseFloat(number[0]);
                            var base = time_intervals[interval];
                            total_offset += multiplier * base;
                        }
                    }
                }
            }
        }
        return total_offset;
    },
    str_to_date: function (q) {
        // Is there: tomorrow/tmr or a day/month.
        // If not, assume the closest time.
        // Is there a time? lol
        var tokens = q.match(/[^\s]+/g);
        var d = new Date();

        var found_day = false;
        var found_month = false;
        var found_time = false;

        var day = d.getDate();
        var month = d.getMonth();
        var year = d.getFullYear();
        var hour = 0;
        var minute = 0;

        var i,j,k;

        if (q.match(/(tmr?|tomorrow)/)) {
            day_overflow = 1;
        } else {
            var mon_map = ['jan.*','feb.*?','mar.*?','apr.*?','may','jun.*?','jul.*?','aug.*?','sep.*?','oct.*?','nov.*?','dec.*?'];
            var day_map = ['mon.*','tue.*?','wed.*?','thu.*?','fri.*?','sat.*?','sun.*?'];
            var ord_map = ['(first|1\\s?st)','(second|2\\s?nd)','(third|3\\s?rd)','fourth','fifth','sixth'];
            for (i = 0; i < mon_map.length; i++) {
                for (j = 0; j < tokens.length; j++) {
                    if (tokens[j].match(new RegExp(mon_map[i],'gi'))) {
                        found_month = true;
                        month = i;
                        if (tokens[j-1] === 'of') {
                            if (tokens[j-2].match(/^\d+th$/gi)) {
                                found_day = true;
                                day = parseInt(tokens[j-2].substr(0,tokens[j-2].length-2), 10);
                            } else if (tokens[j-2].match(/week/gi)) {
                                // TODO: <ord> week of <mon>
                            } else {
                                for (k = 0; k < ord_map.length; k++) {
                                    if (tokens[j-2].match(new RegExp(ord_map[k], 'gi'))) {
                                        found_day = true;
                                        day = k+1;
                                        break;
                                    }
                                }
                                // TODO: <ord> <day of week> of <mon>
                            }
                        }
                        if (!found_day && tokens[j+1]) {
                            if (tokens[j+1].match(/\d+/)) {
                                found_day = true;
                                day = parseInt(tokens[j+1], 10);
                            }
                        }
                        if (found_day && (month < d.getMonth() || (month === d.getMonth() && day < d.getDate()))) {
                            year++;
                        }
                    }
                }
            }
            if (!found_month) {
                // No month specified
                // Assume closest month
            }
        }

        // Find time (must be preceded with 'at' or 'for')
        for (j = 0; j < tokens.length; j++) {
            if (tokens[j] === 'at' || tokens[j] === 'for') {
				var time_str = tokens[j+1];
				for (var k = j+2; k < tokens.length; k++) {
					time_str += " " + tokens[k];
				}
                if (time_str.match(/\d{1,2}(:\d{2})?\s*((a|p)\.?m?\.?)?$/gi)) {
                    found_time = true;
                    var match = time_str.match(/\d{1,2}(:\d{2})?/);
                    var time = match[0].split(':');
					var explicit_hour = false;
					var day_overflow = 0;
					var hour_overflow = 0;
                    hour = parseInt(time[0], 10);
                    if (time.length > 1) {
                        minute = parseInt(time[1], 10);
                    }

                    if (hour > 12) {
                        explicit_hour = true;
						day_overflow = hour / 24;
						hour_overflow = 0;
						hour = hour % 24;
                    } else {
						// Invariants: hour < 12, minutes is defined.
						// Check am or pm at end
						if (time_str.match(/pm?\.?$/gi)) {
							hour_overflow = 12;
						} else if (time_str.match(/am?\.?$/gi)) {
							hour_overflow = 0;
						} else {
							// Which makes more sense? next day or today?
							var current_hour = d.getHours();
							if (current_hour > hour) {
								hour_overflow = 12;
							} else {
								hour_overflow = 0;
							}
						}
						if (!found_day && (hour+hour_overflow < d.getHours() || (hour+hour_overflow === d.getHours() && minute < d.getMinutes()))) {
							day_overflow = 1;
						}
					}
					hour += hour_overflow;
					day += day_overflow;
                }
            }
        }
        d.setMinutes(minute);
        d.setHours(hour);
        d.setDate(day);
        d.setMonth(month);
        d.setFullYear(year);
		if (!found_day && !found_month && !found_time) {
			return false;
		} else {
			return d;
		}
    },
    date_to_str: function (d) {
        return Language.day_map[d.getDay()] + ', ' + Language.mon_map[d.getMonth()] + ' ' + d.getDate();
    },
	date_to_time: function (d) {
		var hour = d.getHours() % 12;
		hour += 1;
        return hour + ' ' + d.getMinutes() + (d.getHours() >= 11 ? ' in the afternoon' : ' in the morning');
    }
};

// Mediator
var Mediator = function () {

    var is_logged_in = false;
	var login_email = $.Storage.get('login_email');

    var login = function (email) {
        $.Storage.set('login_email', email);
        login_email = email;
    };
    var logout = function () {
        User.logout();
        login('','');
    };


    // Auto Login - TODO: Verify sauce
    if (login_email) {
        is_logged_in = true;
    }
    User.get_pref(function (prefs) {
        if (prefs) {
            User.pref = prefs;
        }
    });

    return {
        is_logged_in: function () { return is_logged_in; },
        logout: logout,
        login: login
    };
};

// Artist
var Artist = function (speech_tag) {

	var withdrawal_timeout;
    var heard = false;
	var app;
	var apps = [];
    var respond_shown = false;
    var respond_timeout = 10000;

    var machine_name = 'HelloAlarm';
    var about_info = 'HelloAlarm 2011 (v' + version_string + ')';

    var response_bank = {
        'nothing': ['No response from ' + machine_name + '.'],
        'help': ['Here are some hints to help you.'],
        'about': [about_info],
        'greeting': ['Hello! ' + machine_name + ' at your service.'],
        'welcome': ['You are very welcome.', 'It is my pleasure.'],
        'sorry': ['Sorry, I didn\'t get that.', 'Sorry, I didn\'t catch that.', '... um. I\'m not sure what to say.'],
        'noone': ['Nobody hears you.'],
        'okay': ['Sure thing.', 'Yes, sir.', 'Consider it done.', 'Will do.', 'Okay.']
    };

    var say = function (what, callback) {
        speech_tag.unbind('end');
        var a = speech_tag[0];
        a.src = '/talk?text=' + what;
        a.play();
        if (callback) {
            speech_tag.bind('ended', function () {
				speech_tag.unbind('ended');
				callback.call(this);
			});
        }
    };
    var express = function (id, callback) {
        heard = false;
        if (response_bank[id]) {
            resp = response_bank[id][Math.floor(Math.random()*response_bank[id].length)];
        } else {
            resp = id;
        }
        $('#response').removeClass('error').removeClass('okay');
        $('#response').hide().text(resp).fadeIn('fast');
        if (id !== 'nothing') {
            say(resp, callback);
        }
        respond_shown = true;
        withdrawal_timeout = setTimeout(withdraw, respond_timeout);
    };
    var withdraw = function () {
        if (respond_shown) {
            $('#response').fadeOut('fast');
            respond_shown = false;
        }
    };
	var register = function(new_app) {
        if (new_app instanceof Application) {
            apps.push(new_app);
        }
    };
	var nocallback = function() {
		speech_tag.unbind('ended');
    };
    var volume = function(setter) {
        if (setter === undefined) {
            return speech_tag[0].volume;
        } else {
            speech_tag[0].volume = setter;
        }
    };
	var switch_app = function(new_app) {
        heard = false;
        if (new_app instanceof Screen && new_app != app) {
            if (app) {
                app.unbind();
                app.quit();
				nocallback();
				clearTimeout(withdrawal_timeout);
            }
            app = new_app;
            app.draw();
            app.bind();
        }
	};
    var receive = function (files) {
        var i;
        for (i = 0; i < apps.length; i++) {
            if (apps[i].receive) {
                apps[i].receive.call(apps[i], files);
            }
        }
    };
    var hear = function (what) {
        var i;
        heard = true;
        for (i = 0; i < apps.length; i++) {
            if (apps[i].hear) {
                apps[i].hear.call(apps[i], what);
            }
        }
        if (heard) {
            express('nothing');
        }
    };
    var mute = function () {
        $('#command').hide();
    };
    var unmute = function () {
        $('#command').fadeIn(200);
    };

    return {
        express: express,
        withdraw: withdraw,
        switch_app: switch_app,
        register: register,
        receive: receive,
        mute: mute,
        unmute: unmute,
        volume: volume,
        nocallback: nocallback,
        hear: hear,
        say: say
    };
};

// Player

var Player = function (audio_tag) {

    var stop = function () {
        audio_tag[0].pause();
    };
    var play = function (url, onend, loop) {
		audio_tag.attr("loop", loop);
        audio_tag[0].src = url;
        audio_tag[0].play();
        audio_tag.unbind('ended');
        if (onend) {
            audio_tag.bind('ended', onend);
        }
    };
    var volume = function(setter) {
        if (setter === undefined) {
            return audio_tag[0].volume;
        } else {
            audio_tag[0].volume = setter;
        }
    };

    var file_url = function (file) {
        var url;
        if (window.createObjectURL) {
          url = window.createObjectURL(file);
        } else if(window.createBlobURL) {
          url = window.createBlobURL(file);
        } else if(window.URL && window.URL.createObjectURL) {
          url = window.URL.createObjectURL(file);
        } else if(window.webkitURL && window.webkitURL.createObjectURL) {
          url = window.webkitURL.createObjectURL(file);
        }
        return url;
    };

    var load_tags = function (file, callback) {
        if (localStorage[file.name]) {
            return callback(JSON.parse(localStorage[file.name]));
        }
        ID3v2.parseFile(file,function(tags) {
            //to not overflow localstorage
            localStorage[file.name] = JSON.stringify({
                Title: tags.Title,
                Artist: tags.Artist,
                Album: tags.Album,
                Genre: tags.Genre
            });
            callback(tags);
        });
    };

    var playlist = function (files, callback) {
        if (!files) {
            return false;
        }
        var queue = [];
        var i;
        for (i = 0; i < files.length; i++) {
            var file = files[i];
            var path = file.webkitRelativePath || file.mozFullPath || file.fileName || file.path;
            path = path.indexOf('/') >= 0 ? path.substr(path.indexOf('/')) : path;
            var size = file.size || file.fileSize || 4096;
            if (path.indexOf('.AppleDouble') !== -1) { continue; }
            if (size < 4095) { continue; }
            if ((file.name.indexOf('mp3') !== -1 && Utilities.mp3able) ||
                ((file.name.indexOf('ogg') !== -1  || file.name.indexOf('oga') !== -1) && Utilities.oggable)) {
                queue.push(file);
            }
        }
        if (callback) { callback(queue); }
		if (queue.length > 0) {
			mpmetrics.track("Found songs from hard drive.");
		}
        return (queue.length > 0);
    };

    return {
        play: play,
        stop: stop,
        volume: volume,
        playlist: playlist,
        file_url: file_url,
        load_tags: load_tags
    };

};

// Clock/Alarm

var Clock = function (clock_div) {

    var tick = function () {
        var now = new Date();
        var mins = now.getMinutes();
        clock_div.find('.hours').text(now.getHours());
        clock_div.find('.minutes').text((mins > 9 ? mins : '0'+mins));
        clock_div.find('.colon').toggleClass('flash');
        setTimeout(tick, 1000);
    };
    tick();

    return clock_div;

};

var Alarm = function (player, is_mac) {

    var alarm_onzero;
    var alarm_onwake;
    var alarm_waiting;
	var snooze_interval = 300000;
    var alarm_songpool = [];
	var snoozing = false;
	var snooze_count = 0;
	var original_alarm;
    var counting = false;
    var edit_mode = false;

    var wake_attempt = function () {
        if (alarm_songpool && alarm_songpool.length > 0) {
            var random_song = Math.floor(Math.random()*alarm_songpool.length);
            console.log('Chose song ' + random_song);
            var chosen_song = alarm_songpool[random_song];
            player.play(chosen_song, function () { wake_attempt(); }, false);
        } else {
            player.play('/beep.wav', function () { wake_attempt(); }, true);
        }
    };
    var draw_bar = function (ctx, start, length, stroke, radius, colour) {
        ctx.scale(1,0.5);
        ctx.moveTo(0,0);
        ctx.beginPath();
        ctx.lineWidth = stroke;
        ctx.strokeStyle = colour;
        ctx.arc(149, 149, radius, Math.PI*1.5 + (start*2*Math.PI), length*2*Math.PI + Math.PI*1.5 + (start*2*Math.PI), false);
        ctx.stroke();
    };
    var draw_clock = function () {
        var now = new Date();
        $('#alarm .bar').each(function () { $(this)[0].width = $(this)[0].width; }); // This line clears the canvas.
        var t1 = [
            [20, 80, '#4c4c4c', (now.getHours() % 12)/12],
            [15, 88, '#595959', now.getMinutes()/60]
        ];
        t1.sort(function (a, b) { return a[3]-b[3]; });
        draw_bar($('#alarm .bar.bar1')[0].getContext('2d'),        0,          t1[0][3], t1[0][0], t1[0][1], t1[0][2]);
        draw_bar($('#alarm .bar.bar2')[0].getContext('2d'), t1[0][3], t1[1][3]-t1[0][3], t1[1][0], t1[1][1], t1[1][2]);
        if (alarm_waiting) {
            $('#alarm .bar.bar3').show();
            var ah = alarm_waiting.getHours();
            var am = alarm_waiting.getMinutes();
            var nh = now.getHours();
            var nm = now.getMinutes();
            if (ah-nh > 1 || (ah-nh === 1 && am > nm)) {
                draw_bar($('#alarm .bar.bar3')[0].getContext('2d'), nh/12, (ah-nh)/12, 30, 55, '#49a');
            } else {
                if (ah-nh === 1 && am <= nm) { am += 60; }
                draw_bar($('#alarm .bar.bar3')[0].getContext('2d'), nm/60, (am-nm)/60, 30, 55, '#49a');
            }
        } else {
            $('#alarm .bar.bar3').hide();
        }
        setTimeout(function () {
            if (edit_mode || alarm_waiting) {
                draw_clock();
            }
        }, 1000);
    };
    var draw_countdown = function () {
        counting = true;
        if (!alarm_waiting) {
            $('#alarm .details .countdown').html('');
            counting = false;
            return;
        }
        var now = new Date();
        var time = now.getTime();
        var intervals = {
            'd': 24*60*60*1000,
            'h': 60*60*1000,
            'm': 60*1000,
            's': 1000,
            'ms': 1
        };
        var countdown = '';
        n = Math.max(0, alarm_waiting.getTime() - time);
        if (n >= 0) {
            if (n === 0) {
                alarm_off();
                counting = false;
            }
            for (var label in intervals) {
                var number = Math.floor(n/intervals[label]);
                number = isNaN(number) ? 0 : number;
                n -= number*intervals[label];
                n = Math.max(0, n);
                if (label != 'ms') {
                    number = (number > 9 ? number : '0'+number);
                } else if (number <= 9) {
                    number = '00'+number;
                } else if (number <= 99) {
                    number = '0'+number;
                }
                countdown += '<span class="number">' + number + '</span>';
                countdown += '<span class="label">' + label + '</span>';
            }
            $('#alarm .details .countdown').html(countdown);
            if (counting) {
                setTimeout(function () { draw_countdown(); }, 40);
            }
        } else {
            counting = false;
        }
    };
    var draw_details = function (d) {
        if (!counting) draw_countdown();
        $('#alarm .details .date').text(Language.date_to_str(d));
        $('#alarm .details .time .minutes').text((d.getMinutes() > 9 ? d.getMinutes() : '0'+d.getMinutes()));
        $('#alarm .details .time .hours').text((d.getHours() > 12) ? d.getHours() - 12 : (d.getHours() == 0 ? 12 : d.getHours()));
        $('#alarm .details .time .ampm *').removeClass('active');
        if (d.getHours() >= 12) {
            $('#alarm .details .time .ampm .pm').addClass('active');
        } else {
            $('#alarm .details .time .ampm .am').addClass('active');
        }
    };

    var draw = function () {
        draw_clock();
        if (alarm_waiting) {
            $('#alarm .noset').hide();
            $('#alarm .details').show();
            draw_details(alarm_waiting);
        } else {
            $('#alarm .noset').show();
            $('#alarm .details').hide();
        }
        $('#alarm').slideDown(100, function () {
            // Flyin animations
            $('#alarm .clock').animate({opacity: 1, rotate: '+=180'}, 1000+Math.random()*2000);
            $('#alarm .bar.bar1').animate({opacity: 1, rotate: -360*(Math.floor(Math.random()*2)+1)}, 1000+Math.random()*2000);
            $('#alarm .bar.bar2').animate({opacity: 1, rotate: 360*(Math.floor(Math.random()*2)+1)}, 1000+Math.random()*2000);
            $('#alarm .bar.bar3').animate({opacity: 1, rotate: -360*(Math.floor(Math.random()*2)+1)}, 1000+Math.random()*2000);
        });
    };

    var mode = function (edit) {
        if (edit == undefined) {
            return edit_mode;
        }
        else if (!edit) {
            edit_mode = false;
			$('#config').slideUp('fast');
            $('#editbox').fadeOut('fast');
            if (!alarm_waiting) {
                $('#alarm').slideUp('fast');
            }
        } else {
            edit_mode = true;
			mpmetrics.track("Opened clock.");
			if (Utilities.is_chrome) {
				$('#config').slideDown('fast');
			}
            $('#editbox').fadeIn('fast');
            draw();
        }
    };

    var set = function (d, onzero, onwake, snooze) {
        if (alarm_waiting) {
            console.log('Overwrote alarm for ' + d.toString());
        }
		if (!snooze) {
			original_alarm = d;
		}
        alarm_waiting = d;
        alarm_onzero = onzero;
        alarm_onwake = onwake;
        console.log('Set alarm for ' + d.toString());
        draw();
		if (is_mac) {
			var now = new Date();
			var time = Math.round((alarm_waiting.getTime() - now.getTime())/1000);
			alert('setalarm,' + time);
		}
		mpmetrics.track("Set an alarm.");
        return true;
    };
    var unset = function () {
		if (is_mac) {
			var now = new Date();
			var time = Math.round((alarm_waiting.getTime() - now.getTime())/1000);
			alert('cancelalarm,' + time);
		}
        alarm_waiting = null;
        draw();
		mpmetrics.track("Stopped an alarm.");

    };

	var wakeup = function () {
		alarm_onwake && alarm_onwake.call(null, original_alarm);
	};
	var stop_snooze = function () {
		$(document).unbind('keydown mousedown', stop_snooze);
		unset();
		wakeup();
		return false;
	};
	var stop_alarm = function () {
		$(document).unbind('keydown mousedown', stop_alarm);
		if (!snoozing) {
			// User is now considered awake.
			alarm_waiting = null;
			player.stop();
			wakeup();
		} else {
			// Lazyhead is sleeping.
			snooze_count++;
			$(document).bind('keydown mousedown', stop_snooze);
			player.stop();
			alarm_date = new Date();
			alarm_date.setTime(alarm_date.getTime() + snooze_interval);
			set(alarm_date, alarm_onzero, alarm_onwake, true);
		}
		return false;
	};

    var alarm_off = function () {
		$(document).unbind('keydown mousedown', stop_snooze);
        $(document).bind('keydown mousedown', stop_alarm);
        wake_attempt();
        if (alarm_onzero) { alarm_onzero(); }
    };

    return {
        unset: unset,
        set: set,
		setSnooze: function (interval) {
			snoozing = true;
			snooze_interval = interval;
		},
        mode: mode,
		isset: function () {
			return !!alarm_waiting;
		},
        clear_songs: function () {
            alarm_songpool = [];
        },
        add_song: function (url) {
            alarm_songpool.push(url);
        },
        num_songs: function () {
            return alarm_songpool.length;
        },
        volume: function(setter) {
            player.volume(setter);
        }
    };
};

var Application = function () {};
Application.prototype.hear = false;
Application.prototype.receive = function (files) {};

var Screen = function (screen) {
	Application.apply(this, arguments);
	this.screen = screen;
};
Screen.prototype = new Application();
Screen.prototype.draw = function () {
    this.screen.show();
};
Screen.prototype.quit = function () {
    var screen = this.screen;
    screen.animate({ 'height': 0, opacity: 0 }, 300, function () {
        screen.hide().css('opacity', 1);
    });
};
Screen.prototype.bind = function () {};
Screen.prototype.unbind = function () {};

var AlarmApp = function (screen, ui, is_mac) {
	Screen.apply(this, arguments);
    this.ui = ui;
    this.player = new Player($('#alarm_song'));
    this.alarm = new Alarm(this.player, is_mac);
	this.clock = new Clock($('#clock'));

	this.wakeup_reminder = '';
    this.wakeup_script = '';
	this.reminder_question = false;

    this.twitter_wait;
    var twitter_timeout = 20000;

	var app = this;
	var twitter_countdown = function (num, callback) {
        if (num == 0 && callback) {
            callback.call(app);
        } else if (num > 0) {
            app.ui.express(num + '...');
            app.twitter_wait = setTimeout(function () { twitter_countdown(num-1, callback) }, 1200);
        }
    };
	var twitter_threat = function () {
        app.alarm.volume(0.2);
        app.ui.express('Leander, wake up in 10 seconds, or I\'ll post on your twitter!', function () {
            twitter_countdown(10, function () {
                $.ajax({
                    url: 'json/twitter',
                    data: { tweet: 'HelloAlarm: Once again, Leander is sleeping in. You snooze you lose.' },
                    type: 'POST',
                    success: function () {}
                });
                app.ui.express('Now the everyone knows you\'re sleeping in!', function () {
                    app.alarm.volume(1);
                });
            });
        });
    };
	var onzero = function () {
        //app.twitter_wait = setTimeout(function () { twitter_threat(); }, twitter_timeout);
		mpmetrics.track("Alarm went off.");
	};
	var start_presentation = function () {
		var today_app = new TodayApp($('#today_screen'), ui, function () {
			var weather_app = new WeatherApp($('#weather_screen'), ui, function () {
				ui.switch_app(app);
			});
			ui.switch_app(weather_app);
		});
		ui.switch_app(today_app);
	};
	var onwake = function (original_date) {
        app.ui.nocallback();
        clearTimeout(app.twitter_wait);
		var now = new Date();
		var already_script = "";
		if (now.getTime()-original_date.getTime() > 3600000) {
			already_script = "It's already " + Language.date_to_time(original_date) + ".";
		}
		if (app.wakeup_reminder) {
			ui.express(already_script + 'Hey! Remember ' + app.wakeup_reminder + '.', start_presentation);
		} else if (already_script) {
			ui.express(already_script, start_presentation);
		} else {
			start_presentation();
		}

	};

	this.mappings = [
        {
            regex: /(stop|unset|don\'t|do not)\s+.*?(alarm|wake)/gi,
            action: function (q, m) {
                this.alarm.unset();
                this.ui.express('okay');
            }
        },
        {
            regex: /(rmb|remember|remind\s+(me)?).*/gi,
            action: function (q, m) {
                var rmb1_pos = m[0].indexOf('rmb');
                var rmb2_pos = m[0].indexOf('remember');
				var remind_pos = m[0].indexOf('remind');
				if (remind_pos > -1) {
					var me_pos = m[0].indexOf('me');
					var reminder = m[0].substr(me_pos+2);
				} else if (rmb1_pos > -1)  {
					var reminder = m[0].substr(rmb1_pos+3);
				} else {
					var reminder = m[0].substr(rmb2_pos+8);
				}
                var in_pos = reminder.indexOf('in');
				if (in_pos != -1) {
					var time = reminder.substr(in_pos+2);
					var interpretation = Language.str_to_seconds(time);
					if (interpretation) {
						alarm_date = new Date();
						alarm_date.setTime(alarm_date.getTime() + interpretation);
						if (this.alarm.set(alarm_date, onzero, onwake)) {
							this.set_reminder(reminder.substr(0, in_pos));
							this.ui.express('I can remind you ' + reminder + '.');
						}
					}
					if (!this.alarm.isset()) {
						this.set_reminder(reminder);
						this.ui.express('Okay, remind you ' + reminder + '.');
						setTimeout(function () {
							if ($('#command').val() == '') {
								this.ui.express('When do you want me to remind you?');
								this.reminder_question = true;
							}
						}, 5000);
					}
				} else {
					var interpretation = Language.str_to_date(reminder);
					if (interpretation) {
						if (this.alarm.set(interpretation, onzero, onwake)) {
							this.set_reminder(reminder);
							this.ui.express('I can remind you ' + reminder + '.');
						} else {
							this.ui.express('sorry');
						}
					} else {
						this.set_reminder(reminder);
						this.ui.express('Okay, remind you ' + reminder + '.');
						if (!this.alarm.isset()) {
							setTimeout(function () {
								if ($('#command').val() == '') {
									this.ui.express('What time do you want me to remind you?');
									this.reminder_question = true;
								}
							}, 5000);
						}
					}
				}
            }
        },
        {
            regex: /(set|wake)\s+.*(in)\s+.*/gi,
            action: function (q, m) {
                var in_pos = m[0].indexOf('in');
                var time = m[0].substr(in_pos+2);
                var interpretation = Language.str_to_seconds(time);
                if (interpretation) {
                    alarm_date = new Date();
                    alarm_date.setTime(alarm_date.getTime() + interpretation);
                    this.alarm.set(alarm_date, onzero, onwake);
                } else {
                    this.ui.express('sorry');
                }
            }
        },
        {
            regex: /(set|wake)\s+.*?(at|for).+/gi,
            action: function (q, m) {
                var now = new Date();
                var set_pos = m[0].indexOf('set');
                var wake_pos = m[0].indexOf('wake');
                var time = m[0].substr(4);
                var interpretation = Language.str_to_date(time);
                if (interpretation) {
                    this.alarm.set(interpretation, onzero, onwake);
                } else {
                    this.ui.express('sorry');
                }
            }
        },
        {
            regex: /(flexible|snooze)(\s+for (.+))?$/i,
            action: function (q, m) {
				var time = m[3] || "5 minutes";
                var interpretation = Language.str_to_seconds(time);
				if (interpretation) {
					this.alarm.setSnooze(interpretation);
				}
                this.ui.express('okay');
            }
        },
        {
            regex: /(thank.*|thx|great|sweet|graci(as)?)/gi,
            action: function (q, m) {
                this.ui.express('welcome');
            }
        },
        {
            regex: /(don\'t|do not)/gi,
            action: function (q, m) {
                this.clear_reminder();
                this.ui.express('I won\'t.');
            }
        },
        {
            regex: /(hi|hello|what\'s up|hey|sup|wsup)(\s+|$)/gi,
            action: function (q, m) {
                this.ui.express('greeting');
            }
        },
        {
            regex: /(time|what time is it)/gi,
            action: function (q, m) {
                this.clear_reminder();
				var now = new Date();
				var mins = now.getMinutes();
				var hrs = now.getHours() % 12;
                this.ui.express('It is ' + (hrs == 0 ? 12 : hrs) + (mins == 0 ? "" : ":" + mins) + (now.getHours() >= 12 ? " in the afternoon." : " in the morning."));
            }
        },
        {
            regex: /(help|new|confused|wtf|aid)/gi,
            action: function (q, m) {
				$('#helpbox').slideDown('fast');
                this.ui.express('help');
            }
        },
        {
            regex: /^about$/gi,
            action: function (q, m) {
                this.ui.express('about');
            }
        }
    ];

};
AlarmApp.prototype = new Screen();
AlarmApp.prototype.draw = function (q) {
	if (Utilities.query_string('reset')) {
		$.Storage.set('first_login', 'new');
	}
    if ($.Storage.get('first_login') != 'complete') {
        this.ui.express('Start typing in the textbox below!');
        if (Utilities.mp3able) {
            var app = this;
            setTimeout(function () {
                app.ui.express('You can also drag some mp3 files onto this page and use it as your alarm!');
            }, 4000);
        }
        $('#helpbox').slideDown('fast');
        $.Storage.set('first_login','complete');
    }
    this.screen.fadeIn(1000);
    this.clock.fadeIn(1000);
    this.alarm.mode(false);
};
AlarmApp.prototype.hear = function (q) {
	mpmetrics.track("Entered command.", { command: q });
	for (var i = 0; i < this.mappings.length; i++) {
		var mapping = this.mappings[i];
		var regex = this.mappings[i].regex;
		var match;
		if (match = q.match(regex)) {
			mpmetrics.track("Command matched.", { command: q });
			this.mappings[i].action.apply(this, [q, match]);
            this.ui.switch_app(this);
			return;
		}
	}
    if (q.match(/(^\s*|\s+)(clock|alarm|back|stop|quit)[^a-zA-Z0-9]*/gi)) {
        this.ui.switch_app(this);
        return;
    }
};
AlarmApp.prototype.bind = function () {
	var app = this;
	var alarm = this.alarm;
	var ui = this.ui;
    this.clock.click(function () {
        alarm.mode(!alarm.mode());
    });
    $('#music .close').click(function () {
        alarm.clear_songs()
        $('#music .list .song.selected').each(function () {
            alarm.add_song($(this).data('url'));
        });
        $('#config .info .text').text('Selected ' + alarm.num_songs() + ' song' + (alarm.num_songs() == 1 ? '' : 's') + '.');
        if (alarm.num_songs() == 0) {
            $('#config').removeClass('active');
        }
        $('#config .form').html($('#config .form').html());
        $('#music').fadeOut('fast');
    });
    $('#music .inv').click(function () {
        $('#music .list .song').each(function () { $(this).trigger('click'); });
    });
    $('#music .all').click(function () {
        $('#music .list .song').each(function () {
            if (!$(this).hasClass('selected')) {
                $(this).trigger('click');
            }
        });
    });
    $('#config .selection').live('change', function () {
        $('#config .problem').text('');
        $('#config .info .text').text('Reading directory...');
        var files = this.files;
        app.receive(files);
    });
    $('#command textarea').focus();
};
AlarmApp.prototype.unbind = function () {
    this.clock.unbind('click');
    $('#config .selection').die('change');
    $('#music .close').unbind('click');
    $('#music .inv').unbind('click');
    $('#music .all').unbind('click');
    $('#music .selection').unbind('change');
};
AlarmApp.prototype.clear_reminder = function () {
	this.wakeup_reminder = '';
};
AlarmApp.prototype.set_reminder = function (reminder) {
	if (reminder != '' && !this.reminder_question) {
		this.wakeup_reminder = reminder;
	}
};
AlarmApp.prototype.populate_list = function (queue) {
	if (queue.length == 0) return;
	var file = queue.shift();
	var app = this;
	app.player.load_tags(file, function (tags) {
		this.sem--;
		var t2 = guessSong(file.webkitRelativePath || file.mozFullPath || file.fileName);
		var row = $('<tr></tr>').addClass('song');
		var url = app.player.file_url(file);
		row.data('url', url);
		row.click(function () {
			$(this).toggleClass('selected');
		});
		var title = $('<td></td>').text(tags.Title || t2.Title);
		var artist = $('<td></td>').text(tags.Artist || t2.Artist);
		var album = $('<td></td>').text(tags.Album || t2.Album);
		title.appendTo(row);
		artist.appendTo(row);
		album.appendTo(row);
		row.appendTo(app.table);
		app.populate_list(queue);
	});
	setTimeout(function () { app.populate_list(queue); }, 100);
};
AlarmApp.prototype.receive = function (files) {
	$('#config').addClass('active');
	mpmetrics.track("Attempted to change music.");
	var app = this;
	setTimeout(function () {
		app.player.playlist(files, function (queue) {
			$('#config .info .text').text('Found ' + queue.length + ' song' + (queue.length == 1 ? '' : 's') + '.');
			$('#music').fadeIn('fast');
			app.table = $('#music .list').html('');
			app.populate_list.call(app, queue);
		});
	}, 10);
};

var LoginApp = function (screen, ui, ai, onauth, onguest, is_mac) {
    this.screen = screen;
    this.ui = ui;
    this.ai = ai;
    this.on_auth = onauth;
    this.on_guest = onguest;
    this.started_typing = false;
    this.info_string;
    var app = this;
	Screen.apply(this, arguments);
};
LoginApp.prototype = new Screen();
LoginApp.prototype.draw = function () {
    this.screen.show();
    var guest = this.screen.find('.guest');
    guest.show().css('opacity', 0);
    setTimeout(function() { guest.animate({ opacity: 1, 'margin-left': '+=30' }, 800); }, 1500);
    var frame = this.screen.find('.frame');
    frame.css('opacity', 0).scale(1).animate({ opacity: 1, scale: 1.0 }, 300);
    var form = this.screen.find('.form');
    form.css('opacity', 0).scale(1).animate({ opacity: 1, scale: 1.0 }, 200, function () {
        var email = form.find('.email .input');
        if (email.val() === '') {
            email.focus();
        } else {
            form.find('.password .input').focus();
        }
    });
    var logo = this.screen.find('.form .logo');
    logo.css('opacity', 0.8).rotate(0).animate({ opacity: 1, rotate: '+=90' }, 700);
    var textbox = this.screen.find('.form .textbox').css('opacity', 1).css('right', '75px');
    var signup = this.screen.find('.form .signup').css('opacity', 0).css('right', '75px');

    form.find('.password .input').val('');
    var app = this;
    this.help_timer = setTimeout(function () {
        if (!app.started_typing) {
            app.ui.express('Just fill in your email and password to sign up!');
        }
    }, 4000);
};
LoginApp.prototype.set_info = function (what) {
	var info = this.screen.find('.info');
    var app = this;
    app.info_string = what;
	info.css('opacity', 0.3).text('').animate({ opacity: 1 }, 1200);
	var type_what = function () {
		info.text(info.text() + app.info_string.substr(0,1));
		app.info_string = app.info_string.substr(1);
		if (app.info_string.length > 0) {
			setTimeout(type_what, 35);
		}
	}
	type_what();
};
LoginApp.prototype.login = function () {
    this.ai.logout();
    this.ui.mute();
    this.ui.switch_app(this);
};
LoginApp.prototype.hear = function (what) {
    if (what === 'logout') {
        this.login();
    }
};
LoginApp.prototype.bind = function () {
    var screen = this.screen;
    var app = this;
    screen.find('.email .input').change(function (e) {
		if ($(this).val() !== '') {
			var form = $(this).parents('.form');
			User.check($(this).val(), function (data) {
                if (data) {
                    app.set_info('User match found');
                } else {
                    app.set_info('New user profile');
                }
			});
		}
	});
    screen.find('.email .input').blur(function (e) {
        $(this).trigger('change');
    });
    screen.find('.textbox .input').keydown(function (e) {
        var form = app.screen.find('.form');
		if (e.keyCode === 13) {
			User.check(app.screen.find('.form .email .input').val(), function (data) {
                if (!data) {
                    var frame = app.screen.find('.frame');
                    frame.animate({ 'scale': 0.96 }, 100, function () {
                        frame.animate({ 'scale': 1 }, 100);
                    });
                    var logo = app.screen.find('.form .logo');
                    logo.css('opacity', 0.8).rotate(0).animate({ opacity: 1, rotate: '-=90' }, 700);
                    var form = app.screen.find('.form');
                    var email = form.find('.email');
                    var password = form.find('.password');

                    if (email.find('.input').val() === '') {
                        app.set_info('Email required');
                        return;
                    }
                    if (password.find('.input').val() === '') {
                        app.set_info('Password required');
                        return;
                    }

                    email.animate({ 'right': '+=50', opacity: 0 }, 200);
                    password.animate({ 'right': '-=50', opacity: 0 }, 250,
                    function () {
                        var signup = app.screen.find('.signup');
                        var yes = signup.find('.continue');
                        yes.click(function () {
                            User.register(
                                email.find('.input').val(),
                                password.find('.input').val(),
                                function (email) {
                                    app.on_auth.call(app, email);
                                },
                                function (reason) {
                                    app.set_info('Error! :(');
                                    app.ui.express('Registration failed because ' + reason.toLowerCase() + '.');
                                }
                            );
                        });
                        var no = signup.find('.no');
                        no.click(function () {
                            signup.animate({ opacity: 0 }, 300, function () {
                                no.unbind('click');
                                yes.unbind('click');
                                signup.hide();
                                email.animate({ 'right': '75px', opacity: 1 }, 200, function () {
                                    email.find('.input').select().focus();
                                });
                                password.animate({ 'right': '75px', opacity: 1 }, 250);
                                frame.animate({ 'scale': 1.04 }, 100, function () {
                                    frame.animate({ 'scale': 1 }, 100);
                                });
                            });
                        });
                        signup.show().css('opacity', 0).animate({ 'right': '+=75', opacity: 1 }, 300, function () { yes.focus(); });
                    });
                } else {
                    var form = app.screen.find('.form');
                    var email = form.find('.email');
                    var password = form.find('.password');

                    if (email.find('.input').val() === '') {
                        app.set_info('Email required');
                        return;
                    }
                    if (password.find('.input').val() === '') {
                        app.set_info('Password required');
                        return;
                    }

                    User.login(
                        email.find('.input').val(),
                        password.find('.input').val(),
                        function (email) {
                            app.on_auth.call(app, email);
                        },
                        function (reason) {
                            if (reason === 'your password is invalid') {
                                app.set_info('Wrong password!');
                                if (!form.data('shaking')) {
                                    form.data('shaking', true);
                                    form.animate({ 'margin-left': '+=10' }, 100, function () {
                                        form.animate({ 'margin-left': '-=20' }, 100, function () {
                                            form.animate({ 'margin-left': '+=7' }, 100, function () {
                                                password.find('.input').select().focus();
                                                form.data('shaking', false);
                                            });
                                        });
                                    });
                                }
                            } else {
                                app.set_info('Error! :(');
                                app.ui.express('Login failed because ' + reason.toLowerCase() + '.');
                            }
                        }
                    );
                }
            });
		}
	});
    screen.find('.textbox .input').keyup(function (e) {
        app.started_typing = true;
        if ($(this).val().length > 0) {
            $(this).parent().find('.underlay').addClass('active');
        } else {
            $(this).parent().find('.underlay').removeClass('active');
        }
    });
    screen.find('.guest').click(function (e) {
        app.started_typing = true;
        app.on_guest.call(app);
    });
	screen.find('.textbox .input').each(function () {
        $(this).trigger('keyup');
	});
};
LoginApp.prototype.unbind = function () {
    var screen = this.screen;
    screen.find('.email .input').unbind('change');
    screen.find('.email .input').unbind('blur');
    screen.find('.textbox .input').unbind('keydown');
    screen.find('.textbox .input').unbind('keyup');
    screen.find('.guest').unbind('click');
};
LoginApp.prototype.quit = function () {
    var frame = this.screen.find('.frame');
    frame.animate({ opacity: 0, scale: 0.5 }, 300);
    var form = this.screen.find('.form');
    form.animate({ opacity: 0, scale: 0.2 }, 200);
    var guest = this.screen.find('.guest');
    guest.animate({ opacity: 0, 'margin-left': '+=30' }, 300, function () {
        var margin = guest.css('margin-left');
        margin = (parseInt(margin.substr(0,margin.length-2))-60) + 'px';
        guest.hide().css('margin-left', margin);
    });
};

var WeatherApp = function (screen, ui, callback) {
    this.screen = screen;
    this.ui = ui;
    this.callback = callback;
	Screen.apply(this, arguments);
};
WeatherApp.prototype = new Screen();
WeatherApp.prototype.draw = function () {
    this.screen.show();
    var weather = this.screen.find('.weather').hide();
    var location = this.screen.find('.location').hide();
    var ui = this.ui;
    var callback = this.callback || function(){};
    $.ajax({
        url: '/json/get-weather', data: {  }, dataType: 'json', success: function (j) {
            var location_info = j.city.split(',');
            weather.find('.temperature .number').text(j.temp);
            weather.find('.condition').text(j.condition);
            location.find('.primary').text(location_info[0]);
            if (location_info.length > 1) {
                location.find('.secondary').text(', ' + location_info[1]);
            }
            weather.slideDown(200);
            setTimeout(function () { location.slideDown(200); }, 300);
            var script = 'The weather is ' + j.temp + ' degrees celcius in ' + location_info[0] + '. Conditions are ' + j.condition.toLowerCase() + '.';
            ui.express(script, callback);
        },
        error: function(e) {
            callback.call(this);
        }
    });
};
WeatherApp.prototype.hear = function (what) {
    if (what.match(/weather/gi)) {
        this.ui.switch_app(this);
    }
};

var TodayApp = function (screen, ui, callback) {
    this.screen = screen;
    this.ui = ui;
	this.callback = callback;
	Screen.apply(this, arguments);
};
TodayApp.prototype = new Screen();
TodayApp.prototype.draw = function () {
    this.screen.show();
	var now = new Date();
	var date = this.screen.find('.date');
    var callback = this.callback || function(){};
	var date_script = Language.date_to_str(now) + ', ' + now.getFullYear();

	date.hide().slideDown(200);
	date.find(".month").text(Language.mon_map[now.getMonth()]);
	date.find(".day").text(now.getDate());
	date.find(".year").text(now.getFullYear());
	this.ui.express('Today is ' + date_script + '.', callback);
};
TodayApp.prototype.hear = function (what) {
    if (what.match(/today\??$/gi)) {
        this.ui.switch_app(this);
    }
};

var ScheduleApp = function (screen, ui, callback) {
    this.screen = screen;
    this.ui = ui;
	Screen.apply(this, arguments);
};
ScheduleApp.prototype = new Screen();
ScheduleApp.prototype.draw = function () {
    this.screen.show();
    var day_box = this.screen.find('.day');
    day_box.css('margin-left', '188px').css('opacity', 0).animate({ opacity: 1, marginLeft: '-=20' }, 600);
    var calendar = this.screen.find('.calendar');
    var cal_body = calendar.find('.body');
    var cal_date = calendar.find('.date');
    cal_body.height(cal_body.height()-20);
    calendar.css('margin-top', (cal_body.height()-370) + 'px').css('margin-left', '-520px').css('opacity', 0).animate({ opacity: 1, marginLeft: '-=70' }, 200);
    cal_date.css('left', '100px').css('opacity', 0).animate({ opacity: 0.7, left: '30px' }, 400);

    // Calendar dates
    var now = new Date();
    var cal_boxes = calendar.find('.boxes').html('');
    var i;
    var month = now.getMonth();
    var first = new Date();
    first.setMonth(month);
    first.setDate(1);
    var first_day = first.getDay();
    var offset = -1*first_day;
    var cur_month = (month+13)%12;
    var cur_date = (first_day ? Language.max_day_map[cur_month]+offset : 1);
    var anim_box = 100;
    for (i = 0; i < 28; i++) {
        if (cur_date >= Language.max_day_map[cur_month]) {
            cur_month = (month+12)%12;
            cur_date = 1;
        } else {
            cur_date++;
        }
        var box = $('<div class="box"></div>').text(cur_date);
        if (month == cur_month) {
            box.addClass('cur_month');
        }
        box.appendTo(cal_boxes).css('opacity', 0).css('top', (Math.floor(Math.random()*anim_box)) + 'px').animate({ opacity: 1, top: 0 }, 600);
    }
    day_box.find('.dayweek').text(Language.day_map[now.getDay()]);
    day_box.find('.number').text(now.getDate());

    calendar.find('.events').html('');
    // FIXME: This entire thing.
    var draw_calbar = function(start_day, length, colour, bar_event) {
        var cal_events = calendar.find('.events');
        var week_offset = Math.floor((start_day-offset)/7.01);
        var week_length = Math.floor((length-offset)/7.01);
        var start_week = Math.floor((length-offset)/7.01)+week_offset;
        // console.log('week offset ' + week_offset);
        // console.log('start week ' + start_week);
        // console.log('end week ' + (start_week-week_length));

        var cal_width = 717;
        var box_size = cal_width/7;

        var cur_week = start_week;

        var bar_width;
        var bar_left;
        var next_length;
        var actual_length = length-offset+start_day-1;
        if (actual_length <= 7) {
            next_length = 0;
            bar_width = actual_length+offset;
            bar_left = -offset;
        } else {
            bar_width = actual_length%7;
            next_length = actual_length-bar_width+offset;
            bar_left = 0;
        }
        // console.log('(' + start_day + ','+length+')*** => ' + (actual_length));
        // console.log('(' + start_day + ','+length+')** => ' + (bar_left));
        // console.log('(' + start_day + ','+length+')* => ' + bar_width);

        var bar = $('<div class="bar"></div>').addClass(colour);
        var box_top = (cur_week*50)+14;
        bar.css('top', box_top).css('left', cal_width+'px').css('width', 0).animate({ width: (bar_width*box_size)+'px', left: bar_left*box_size }, 350,
            function () {
                if (length != 0) {
                    draw_calbar(start_day, next_length, colour, bar_event);
                }
            });
        bar.data('title', bar_event.title);
        bar.data('details', bar_event.details);
        bar.appendTo(cal_events);
        bar.hover(
            function () {
                day_box.find('.dayweek').text('');
                day_box.find('.number').text('');
                day_box.find('.title').text($(this).data('title'));
                day_box.find('.details').text($(this).data('details'));
            },
            function () {
                day_box.find('.dayweek').text(Language.day_map[now.getDay()]);
                day_box.find('.number').text(now.getDate());
                day_box.find('.title').text('');
                day_box.find('.details').text('');

            }
        );
    }
    setTimeout(function () { draw_calbar(1,3, 'blue', { title: 'June 1-3', details: 'Get ready for the concert on saturday.' }); }, 200);
    draw_calbar(1,7, 'red', { title: 'June 1-7', details: 'Driving to disneyland!' });

	//this.ui.express('Today is ' + date_script + '.', callback);
};
ScheduleApp.prototype.quit = function () {
    var screen = this.screen;
    var day_box = screen.find('.day');
    day_box.animate({ opacity: 0, marginLeft: '+=20' }, 100);
    var calendar = screen.find('.calendar');
    var cal_body = calendar.find('.body');
    var cal_date = calendar.find('.date');
    cal_body.height(cal_body.height()+20);
    calendar.animate({ opacity: 0, marginLeft: '+=70' }, 200);
    cal_date.animate({ opacity: 0, left: '-70px' }, 400, function () {
        screen.hide();
    });
    var anim_box = 300;
    calendar.find('.boxes .box').each(function () {
        $(this).animate({ opacity: 0, top: (Math.floor(Math.random()*anim_box)) }, 150);
    });
	//this.ui.express('Today is ' + date_script + '.', callback);
};
ScheduleApp.prototype.hear = function (what) {
    if (what.match(/(^\s*|\s+)(scheduler?|calend(e|a)r)(\s*$|\s+)/gi)) {
        this.ui.switch_app(this);
    }
};

var UnicornsApp = function (screen, ui) {
    this.screen = screen;
    this.ui = ui;
	Screen.apply(this, arguments);
};
UnicornsApp.prototype = new Screen();
UnicornsApp.prototype.draw = function () {
    this.screen.show();
    var start_at = 17;
    var loop = true;
    var video_hash = 'RW6Lp3Y3Vxs';
    var screen = this.screen.html('<div class="video"><embed src="http://www.youtube.com/v/' + video_hash + '&autoplay=1&showinfo=0&showsearch=0&rel=0&fs=1&loop=' + (loop?1:0) + '&controls=0&autohide=1&start=' + start_at + '&iv_load_policy=3" type="application/x-shockwave-flash" allowfullscreen="true" wmode="transparent" width="640" height="480"></embed></div>');
    var video = screen.find('.video');
    video.scale(0.4).animate({ scale: 1 }, 400);
};
UnicornsApp.prototype.quit = function () {
    var screen = this.screen;
    var video = screen.find('.video');
    video.animate({ scale: 0 }, 400, function () {
        screen.hide();
    });
};
UnicornsApp.prototype.hear = function (what) {
    if (what.match(/(^\s*|\s+)(unicorns?!?|productiv)/gi)) {
        this.ui.switch_app(this);
    }
};

var IronManApp = function (screen, ui) {
    this.screen = screen;
    this.ui = ui;
	Screen.apply(this, arguments);
};
IronManApp.prototype = new Screen();
IronManApp.prototype.draw = function () {
    this.screen.show();
    var start_at = 4;
    var loop = false;
    var video_hash = '-u8F7Y6p2A0';
    var screen = this.screen.html('<div class="video"><embed src="http://www.youtube.com/v/' + video_hash + '&autoplay=1&showinfo=0&showsearch=0&rel=0&fs=1&loop=' + (loop?1:0) + '&controls=0&autohide=1&start=' + start_at + '&iv_load_policy=3" type="application/x-shockwave-flash" allowfullscreen="true" wmode="transparent" width="640" height="480"></embed></div>');
    var video = screen.find('.video');
    video.scale(0.4).animate({ scale: 1 }, 400);
};
IronManApp.prototype.quit = function () {
    var screen = this.screen;
    var video = screen.find('.video');
    video.animate({ scale: 0 }, 400, function () {
        screen.hide();
    });
};
IronManApp.prototype.hear = function (what) {
    if (what.match(/(^\s*|\s+)(iron|demo)/gi)) {
        this.ui.switch_app(this);
    }
};

// TODO: Combine Unicorns and Iron Man and Dougie. (Holy shit!)
var DougieApp = function (screen, ui) {
    this.screen = screen;
    this.ui = ui;
	Screen.apply(this, arguments);
};
DougieApp.prototype = new Screen();
DougieApp.prototype.draw = function () {
    this.screen.show();
    var start_at = 27;
    var loop = false;
    var video_hash = '3uYi729Rf0U';
    var screen = this.screen.html('<div class="video"><embed src="http://www.youtube.com/v/' + video_hash + '&autoplay=1&showinfo=0&showsearch=0&rel=0&fs=1&loop=' + (loop?1:0) + '&controls=0&autohide=1&start=' + start_at + '&iv_load_policy=3" type="application/x-shockwave-flash" allowfullscreen="true" wmode="transparent" width="640" height="480"></embed></div>');
    var video = screen.find('.video');
    video.scale(0.4).animate({ scale: 1 }, 400);
};
DougieApp.prototype.quit = function () {
    var screen = this.screen;
    var video = screen.find('.video');
    video.animate({ scale: 0 }, 400, function () {
        screen.hide();
    });
};
DougieApp.prototype.hear = function (what) {
    if (what.match(/(^\s*|\s+)dougie/gi)) {
        this.ui.switch_app(this);
    }
};

// HelloAlarm
var HelloAlarm = function () {

	mpmetrics.track("I'm Alive.", { 'user-agent': navigator.userAgent });

	// Mac Standalone
	var running_mac = false;
    if (Utilities.query_string('v') == 'mac1') {
		running_mac = true;
	}

	// Screen changing
    $(window).resize(function () {
		var pct = Math.round(window.innerHeight / 10);
        document.body.style.zoom = pct + "%";
		$('body').css('-moz-transform', 'scale(' + pct/100 + ')');
    });
    $(window).trigger('resize');

    // Initialize Objects
	var ui = new Artist($('#speech'));
	var ai = new Mediator();

    // App definitions
	var alarm_app = new AlarmApp($('#alarm_screen'), ui, running_mac);
    var on_auth = function (email) {
        ai.login(email);
        mpmetrics.track("Logged In.", { 'email': email });
        ui.unmute();
        $('#command .account').html('Logout');
        ui.switch_app(alarm_app);
    };
    var on_guest = function () {
        mpmetrics.track("New guest");
        ui.unmute();
        $('#command .account').html('Login');
        ui.switch_app(alarm_app);
    };
	var today_app = new TodayApp($('#today_screen'), ui, function () {
        setTimeout(function () {
            ui.switch_app(alarm_app);
        }, 1000);
    });
	var dougie_app = new DougieApp($('#dougie_screen'), ui);
	var ironman_app = new IronManApp($('#ironman_screen'), ui);
	var unicorn_app = new UnicornsApp($('#unicorns_screen'), ui);
	var schedule_app = new ScheduleApp($('#schedule_screen'), ui);
	var weather_app = new WeatherApp($('#weather_screen'), ui, function () {
        setTimeout(function () {
            ui.switch_app(alarm_app);
        }, 1000);
    });
	var login_app = new LoginApp($('#login_screen'), ui, ai, on_auth, on_guest, running_mac);

    ui.register(login_app);
    ui.register(alarm_app);
    ui.register(today_app);
    ui.register(weather_app);
    ui.register(schedule_app);
    ui.register(unicorn_app);
    ui.register(ironman_app);
    ui.register(dougie_app);

	// Global Bindings
	$('body').bind('dragenter', function () {
		$('#filedrop').fadeIn('fast');
	});
	$('#filedrop').bind('dragover', function (e) {
		e.stopPropagation();
		e.preventDefault();
	});
	$('#filedrop').bind('dragleave', function () {
		$('#filedrop').fadeOut('fast');
	});
	$('#filedrop')[0].addEventListener('drop', function (e) {
		e.stopPropagation();
		e.preventDefault();
		$(this).fadeOut('fast');
        var files = e.dataTransfer && e.dataTransfer.files;
        ui.receive(files);
	}, false);

    $('#command .input').focus(function () {
        $('#command').addClass('active');
    });
    $('#command .input').blur(function () {
        $('#command').removeClass('active');
    });
    $('#command .input').keypress(function (e) {
        if (e.keyCode == 13) {
            $('#helpbox').slideUp('fast');
            if ($(this).val() != '') {
                ui.hear($(this).val());
            }
            $(this).val('');
            return false;
        }
    });
    $('#command .account').click(function () {
        login_app.login();
    });

	// First Run
	if (Utilities.query_string('reset')) {
		$.Storage.set('first_run', 'new');
	}
    if ($.Storage.get('first_run') != 'complete' && !ai.is_logged_in()) {
        ui.express('Hello there! Welcome to HelloAlarm!');
        $.Storage.set('first_run','complete');
        login_app.login();
    } else if (ai.is_logged_in()) {
        $('#command .account').html('Logout');
        ui.switch_app(alarm_app);
    } else {
        login_app.login();
    }
    return {};
};

$(HelloAlarm);
