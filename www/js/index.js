/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    cache : {
        "active_project" : { "_id" : "active_project" }
    },

    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready' , this.onDeviceReady.bind(this), false);
        document.addEventListener('pause'       , this.onDevicePause, false);
        document.addEventListener('resume'      , this.onDeviceResume, false);
    },
    
    initCache : function(){
        app.cache.FCR_userid        = null;

        app.cache.participant_id    = null;
        app.cache.passcode          = null;

        app.cache.sessionTimerId    = null;
        app.cache.playTimerId       = null;
        app.cache.sessionPlayTime   = 0;
        app.cache.sessionStart      = null;
        app.cache.sessionLimit      = 1000*60*30;
        app.cache.syncTimerID       = null;
        app.cache.alert_counts      = null;
        app.cache.reminders         = null;
        app.cache.goal              = null;
    },

    onDevicePause: function() {
        app.cache.app_pause_ts = Date.now(); 
    },

    onDeviceResume: function() {
        var delta = (Date.now() - app.cache.app_pause_ts); //milliseconds
        if(delta > app.cache.sessionLimit){
            app.showNotif("Session Timeout", "Your listening session has been logged.", function(){});
            app.logSession();
        }
    },

    // Bind any cordova events here. Common events are:
    onDeviceReady: function() {
        //DURING DEBUGING KEEP AWAKE
        window.plugins.insomnia.keepAwake();
        app.cache.redcap = new REDCapApi("xxx");

        app.cleanStart();

        //START BGMODE
        // cordova.plugins.backgroundMode.enable();
        // cordova.plugins.backgroundMode.configure({ silent: true });
        var hasBGMode = false;
        if(hasBGMode){
            //QUIETLEY CHECK AND GRANT PERMISSION TO SEND LOCAL NOTIFICATIONS IF BACKGROUNDING AVAILABLE!
            cordova.plugins.notification.local.hasPermission(function (granted) {
                if(granted == "No"){
                  cordova.plugins.notification.local.registerPermission(function (granted) {
                      if(granted == "Yes"){
                        //SHOW NOTIFICATIONS UI! 
                        $(".nav.notif").addClass("show"); 
                      }
                  });
                }else{
                    $(".nav.notif").addClass("show");
                }
            });
            // cordova.plugins.notification.local.clear(1, callback);
            // cordova.plugins.notification.local.clear([2,3], callback);
            // cordova.plugins.notification.localclearAll(callback);
            // cordova.plugins.notification.local.cancel(1, callback);
            // cordova.plugins.notification.local.cancel([2, 3], callback);
            // cordova.plugins.notification.local.cancelAll(function(){});

            //LOAD UP THE REMINDERS 
            var schedule_arr = [];
            for(var ri in app.cache.reminders){
                var temp        = ri.split("r");
                var n           = parseInt(temp[1]); 
                var one_alert   = app.cache.reminders[ri];
                
                if(one_alert){
                    var hour        = one_alert["hour"];
                    var min         = one_alert["min"];
                    var ampm        = one_alert["ampm"];
                    var alert_time  = hour + ":" + min + " " + ampm.toLowerCase();
                    $(".reminder[data-reminder='"+n+"']").addClass("set")
                    $(".reminder[data-reminder='"+n+"'] > i").text(alert_time);  
                    schedule_arr.push({
                        id        : n,
                        title     : 'Relaxation Resource Reminder',
                        text      : 'Hi Again',
                        every     : 'day',
                        at        : alert_time,
                        icon      : 'http://3.bp.blogspot.com/-Qdsy-GpempY/UU_BN9LTqSI/AAAAAAAAAMA/LkwLW2yNBJ4/s1600/supersu.png',
                        smallIcon : 'res://cordova',
                        sound     : null
                    });
                }
            }
            app.loadReminders(schedule_arr);
        }

        //LOAD FIRST PAGE
        app.transitionToPanel($("#main"));

        //SET UP THE JPLAYER
        $("#jquery_jplayer_1").jPlayer({
            ready: function () {
                $(this).jPlayer("setMedia", {
                    title   : "Relaxation Resource Binaural Technology",
                    m4a     : "audio/R01_Beth_wBeats.mp3"
                });
                app.log("jplayer loaded");

            },
            cssSelectorAncestor : "#jp_container_1",
            swfPath             : "/js",
            supplied            : "m4a, oga",
            useStateClassSkin   : true,
            autoBlur            : false,
            smoothPlayBar       : true,
            keyEnabled          : true,
            remainingDuration   : true,
            toggleDuration      : true
        });

        //ADD EVENTS TO THE PLAY AND PAUSE BUTTON
        $("#jquery_jplayer_1").bind($.jPlayer.event.play, function(event) { 
            // Add a listener to report the time play began
            app.log("play start! : current playtime " + app.cache.sessionPlayTime);
            app.startTimer();
            window.plugins.insomnia.keepAwake();
        });

        $("#jquery_jplayer_1").bind($.jPlayer.event.pause, function(event) { 
            // Add a listener to handle pausing
            app.log("play pause! : current playtime " + app.cache.sessionPlayTime);
            app.stopTimer();
        });

        $("#jquery_jplayer_1").bind($.jPlayer.event.ended, function(event) { 
            // Add a listener to handle reaching the end
            $(".logit").click();
        });

        //ADD EVENTS FOR OTHER BUTTONS
        $(".upload").click(function(){
            app.log("Uploading Data");
            $(this).addClass("syncing");
            app.syncData();
            return false;
        });

        $(".deleteall").click(function(){
            navigator.notification.prompt(
                'Type "DELETE" to clear data',  // message
                function(input){
                    if(input["buttonIndex"] == 1 && input["input1"].toLowerCase() == "delete"){
                        localStorage.clear();
                        
                        //PANEL TRANSITIONS
                        var panel       = $("#settings");
                        var next        = "main";

                        //TRANSITION TO NEXT PANEL
                        app.closeCurrentPanel(panel);
                        app.transitionToPanel($("#"+next));

                        app.cleanStart();
                    }
                },   // callback to invoke
                'Clear All Data',            // title
                ['Confirm','Cancel']              // buttonLabels
            );
            
            return false;
        });

        $(".logit").click(function(){
            if(!app.cache.sessionStart && !app.cache.playTimerId && !app.cache.sessionStart){
                //false click
                return false;
            }

            app.log("Log the Session and Upload");

            //STOP IT Audio if they didnt stop 
            $(".jp-stop").click();
            $(".jp-play").removeClass("pause");
            $(this).addClass("syncing");

            app.logSession();

            if( app.cache.alert_counts["log_msg"] < 1){
                app.cache.alert_counts["log_msg"]++;
                app.showNotif("Listen Session Logged","You may click on the Settings icon at anytime to manually upload your listening data.",function(){});
                localStorage.setItem("alert_counts",JSON.stringify(app.cache.alert_counts) );
            }   

            //AUTO SYNC
            app.syncData();

            window.plugins.insomnia.allowSleepAgain();
            return false;
        });

        $(".editid").click(function(){
            app.log("Edit User Id");
            navigator.notification.prompt(
                'Prefer another user id? Change it here.  Click \'Continue\' to proceed.', // message
                 function(inp){
                    var buttonIndex = inp["buttonIndex"];
                    var userinput   = inp["input1"].trim();
                    if(buttonIndex > 1 && userinput !== ""){
                        app.cache.FCR_userid = userinput;
                        localStorage.setItem("FCR_userid", userinput);
                        app.showToast("You will now be known as " + userinput);
                        app.log("User Id updated");
                    }
                 },  // callback to invoke with index of button pressed
                'Hi ' + app.cache.FCR_userid, // title
                ['Cancel','Continue']     // buttonLabels
            );
            return false;
        });

        $(".goals").click(function(){
            navigator.notification.prompt(
                'Set goal number of listens per day.  Click \'Continue\' to proceed.', // message
                 function(inp){
                    var buttonIndex = inp["buttonIndex"];
                    var userinput   = inp["input1"].trim();
                    if(buttonIndex > 1 && userinput !== ""){
                        app.cache.goal = userinput;
                        localStorage.setItem("goal", userinput);
                        $(".goals b").text(app.cache.goal);
                        app.showToast("Goal Set! We will track your progress.");
                    }
                 },  // callback to invoke with index of button pressed
                'Hi ' + app.cache.FCR_userid, // title
                ['Cancel','Continue']     // buttonLabels
            );
            return false;
        });

        $("#bgs .bg").click(function(){
            //CHANGE BG
            var bg = $(this).data("bg");
            $("body").removeClass();
            $("body").addClass(bg);
            app.cache.bg = bg;
            localStorage.setItem("bg", app.cache.bg );
            return false;
        });

        $(".handle").click(function(){
            $("#bgs").toggleClass("open");
            return false;
        });

        $(".jp-play").click(function(){
            $(this).toggleClass("pause");
        });

        $("a[data-next]").click(function(){
            //PANEL TRANSITIONS
            var panel       = $(this).closest(".panel");
            var next        = $(this).data("next");

            //TRANSITION TO NEXT PANEL
            app.closeCurrentPanel(panel);
            app.transitionToPanel($("#"+next));
            return false;
        });

        $(".addedit").click(function(){
            var reminder = $(this).data("reminder");
            $("#setup_alert h3 span").text(reminder);

            $("#setup_alert").fadeIn("medium",function(){
                $("body").addClass("shade"); 
            });
            return false;
        });

        $("#setup_alert input[type='submit']").click(function(){
            var el  = $(this);
            $("#setup_alert").fadeOut("fast",function(){
                var hour    = $("#hour option:selected").val();
                var min     = $("#min option:selected").val();
                var ampm    = $("#ampm option:selected").val();
                var action  = el.val();

                var ri      = $("#setup_alert h3 span").text(); 
                var propname = "r"+ri;

                if(action == "Set"){
                    $(this).parent().addClass("set");
                    
                    var alert_time  = hour + ":" + min + " " + ampm;
                    $(".reminder[data-reminder='"+ri+"']").addClass("set")
                    $(".reminder[data-reminder='"+ri+"'] > i").text(alert_time);

                    var schedule    = parseInt(hour) +"_"+ min +"_"+ ampm.toLowerCase();
                    app.scheduleReminder(ri,schedule);
                    app.cache.reminders[propname] = {"hour" : hour, "min" : min, "ampm" : ampm};
                }else{
                    cordova.plugins.notification.local.cancel(ri, function(){
                        // cancelled
                    });

                    $(".reminder[data-reminder='"+ri+"']").removeClass("set");
                    app.cache.reminders[propname] = null;
                }

                localStorage.setItem("reminders", JSON.stringify(app.cache.reminders)) ;
                $("body").removeClass("shade");
            });

            return false;
        });

        $(".closeform").click(function(){
            $("#setup_alert").fadeOut("fast",function(){
                $("body").removeClass("shade");
            });
        });

        $("#login").submit(function(){
            var values = app.getFormInputs("#login");
            app.cache.redcap.getData({ "fields":["redcap_event_name","alias","id","pw","deactivate"], "events" : ["participant_arm_1"]}, function(response){
                if(!response.error){
                    var participant_id  = values["participant_id"].toUpperCase();
                    var passcode        = values["passcode"];
                    var couldbebig      = response.result;
                    
                    var nomatch         = true;
                    for(var i in couldbebig){
                        var account = couldbebig[i];
                        var pid     = account["id"];
                        var pw      = account["pw"];
                        var alias   = account["alias"];

                        if(participant_id == pid && passcode == pw){
                            app.cache.participant_id    = participant_id;
                            app.cache.passcode          = passcode;
                            app.cache.FCR_userid        = alias;

                            localStorage.setItem("participant_id",app.cache.participant_id );
                            localStorage.setItem("passcode",app.cache.passcode );
                            localStorage.setItem("FCR_userid",app.cache.FCR_userid );

                            $("#main .player").fadeIn("slow");
                            $("#main .login").fadeOut("medium");
                            nomatch = false;
                            break;
                        }
                    }

                    if(nomatch){
                        app.showNotif("Sorry the Participant Id and/or Passcode was incorrect.");
                    }else{
                        app.showNotif("Welcome " + app.cache.FCR_userid + "!");
                        $("#alias i").text(app.cache.FCR_userid);
                        $("#login input[name='participant_id'],#login input[name='passcode']").val("");
                    }
                }
            });
            return false;
        });

        $(document).on("click", function(event){
            if (!$(event.target).closest('#setup_alert').length) {
                $("#setup_alert").fadeOut("fast",function(){
                    $("body").removeClass("shade");
                    $("#congrats,#flower").removeClass("show");
                    $("#congrats,#flower").hide();
                });
            }
        });
    },

    cleanStart: function(){
        this.initCache();

        //LOCAL STORAGE SET UP 
        if (typeof(Storage) !== "undefined") {
            // CHECK FOR localStorage
            if(localStorage.getItem("FCR_userid") && localStorage.getItem("participant_id") && localStorage.getItem("passcode")){
                app.cache.FCR_userid        = localStorage.getItem("FCR_userid");
                app.cache.participant_id    = localStorage.getItem("participant_id");
                app.cache.passcode          = localStorage.getItem("passcode");
                
                app.cache.redcap.getData({ "fields":["redcap_event_name","alias","id","pw","deactivate"], "events" : ["participant_arm_1"], "filterLogic" : "[id]='"+app.cache.participant_id+"'"}, function(response){
                    if(!response.error){
                        var participant_id  = app.cache.participant_id;
                        var passcode        = app.cache.passcode;
                        var couldbebig      = response.result;
                        
                        var nomatch         = true;
                        for(var i in couldbebig){
                            var account = couldbebig[i];
                            var pid     = account["id"];
                            var pw      = account["pw"];
                            var alias   = account["alias"];

                            if(participant_id == pid && passcode == pw){
                                app.cache.participant_id    = participant_id;
                                app.cache.passcode          = passcode;
                                app.cache.FCR_userid        = alias;

                                localStorage.setItem("participant_id",app.cache.participant_id );
                                localStorage.setItem("passcode",app.cache.passcode );
                                localStorage.setItem("FCR_userid",app.cache.FCR_userid );

                                $("#main .player").fadeIn("slow");
                                $("#main .login").fadeOut("medium");
                                nomatch = false;
                                break;
                            }
                        }

                        if(nomatch){
                            app.showNotif("Sorry the Participant Id and/or Passcode was incorrect.");
                            $("#main .player").hide();
                            $("#main .login").show();
                        }else{
                            var friend = app.cache.FCR_userid == "" ? "Friend" : app.cache.FCR_userid;
                            app.showToast("Welcome " + friend + "!");
                            $("#alias i").text(friend);
                            $("#login input[name='participant_id'],#login input[name='passcode']").val("");
                        }
                    }else{
                        $("#main .player").hide();
                        $("#main .login").show();
                    }
                });
            }else{
                $("#main .player").hide();
                $("#main .login").show();
            }

            //DOnt annoy with repeating popups
            if(localStorage.getItem("alert_counts")){
                app.cache.alert_counts = JSON.parse(localStorage.getItem("alert_counts"));
            }else{
                app.cache.alert_counts = {"log_msg" : 0, "sync_msg" : 0};
                localStorage.setItem("alert_counts",JSON.stringify(app.cache.alert_counts) );
            }

            //GET REMINDERS READY
            if(localStorage.getItem("reminders")){
                app.cache.reminders = JSON.parse(localStorage.getItem("reminders"));
            }else{
                app.cache.reminders = {"r1" : null, "r2" : null, "r3" : null};
                localStorage.setItem("reminders",JSON.stringify(app.cache.reminders) );
            }

            //GET GOALS READY
            if(localStorage.getItem("goal")){
                app.cache.goal = localStorage.getItem("goal");
            }else{
                app.cache.goal = 0;
                localStorage.setItem("goal", app.cache.goal );
            }

            //GET bg READY
            if(localStorage.getItem("bg")){
                app.cache.bg = localStorage.getItem("bg");
            }else{
                app.cache.bg = "";
                localStorage.setItem("bg", app.cache.bg );
            }

            var unsyncedrecords_count = app.getRecordCount();
            $(".upload b").text(unsyncedrecords_count);
            $(".goals b").text(app.cache.goal);
            $("body").addClass(app.cache.bg);
        } else {
            // Sorry! No Web Storage support..
            app.showNotif("Contact Administrator","The app can't establish data storage.  You may still listen to the audio, but it will not store your usage data.",function(){});
        }
    },

    getRecordCount: function(){
        var store_o = JSON.parse(localStorage.getItem("session_logs"));
        var count   = 0;
        for(var i in store_o){
            var one_listen = store_o[i];
            if(!one_listen.hasOwnProperty("synced")){
                count++;
            }
        }
        return count;
    },

    checkGoal : function(){
        if(app.cache.goal){
            var store_o    = JSON.parse(localStorage.getItem("session_logs"));

            //THIS WILL GET THE TIMEStaMP FOR THE START OF 'today'
            var now        = new Date();
            var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var todaystamp = (startOfDay/1000)*1000;

            var todaysgoals = 0;
            for(var i in store_o){
                var onelisten = store_o[i];
                if(parseInt(onelisten["end_ts"]) > todaystamp){
                     todaysgoals++;
                }
            }

            //ONLY DO THIS ONCE IF LISTEN # EXACTLY SAME AS GOAL
            var goalreached = todaysgoals == app.cache.goal ? true : false;
            app.stupidFlower(goalreached);
        }
    },

    goalReached : function(){
        $("body").addClass("shade");
        $("#congrats").show(function(){
            $("#congrats").addClass("show");
            
            setTimeout(function(){
                 $("#congrats h1").addClass("show");
                 setTimeout(function(){
                    $("#congrats h1").removeClass("show");
                 },3500);
            },100);

            setTimeout(function(){
                $("body").removeClass("shade");
                $("#congrats").removeClass("show");
                $("#congrats").hide();
            },4600);
        });
    },

    stupidFlower : function(goalreached){
        $("body").addClass("shade");
        $("#flower").show(function(){
            $("#flower").addClass("show");
            $("#flower .flower").addClass("show");
            $("#flower h1").addClass("show");
            
            if(goalreached){
                $("#flower h2").addClass("show");
            }

            setTimeout(function(){
                $("#flower .flower").removeClass("show");
                $("#flower h1").removeClass("show");
                if(goalreached){
                    $("#flower h2").removeClass("show");
                }
            },12000);

            setTimeout(function(){
                $("body").removeClass("shade");
                $("#flower").removeClass("show");
                $("#flower").hide();
            },13000);
        });
    },

    scheduleReminder : function (id,scheduled) {
        cordova.plugins.notification.local.cancel(id, function(){
            //THIS IS FOR MANUAL EDIT
            cordova.plugins.notification.local.schedule({
                id        : id,
                title     : 'Relaxation Resource Reminder',
                text      : 'Hi Again',
                every     : 'day',
                at        : scheduled,
                icon      : 'http://3.bp.blogspot.com/-Qdsy-GpempY/UU_BN9LTqSI/AAAAAAAAAMA/LkwLW2yNBJ4/s1600/supersu.png',
                smallIcon : 'res://cordova',
                sound     : null
                // badge     : 1,
                // data      : { test: id }
            });
        });
    },

    loadReminders : function (schedules_arr) {
        cordova.plugins.notification.local.cancelAll(function(){
            cordova.plugins.notification.local.schedule(schedules_arr);   
        })
    },

    logSession : function(){
        clearTimeout(app.cache.sessionTimerId);
        clearInterval(app.cache.playTimerId);

        if(localStorage.getItem("session_logs")){
            var store_o = JSON.parse(localStorage.getItem("session_logs"));
        }else{
            var store_o = [];
        }

        var participant_id     = localStorage.getItem("participant_id");
        var alias       = localStorage.getItem("FCR_userid");
        var stamp       = Date.now();
        var sequence    = 0;
        for(var i in store_o) {
            if (store_o.hasOwnProperty(i)) {
                sequence++;
            }
        }

        var session_id  = alias + "_" + sequence + "_" + stamp;
        var session_o   = {
             'participant_id'   : participant_id
            ,'session_id'       : session_id
            ,'start_ts'         : app.cache.sessionStart
            ,'end_ts'           : stamp
            ,'play_time'        : app.cache.sessionPlayTime

        };

        //APPEND AND STORE
        store_o.push(session_o);
        // store_o[session_id] = session_o;
        localStorage.setItem("session_logs", JSON.stringify(store_o)) ;

        //update UI
        var curcount    = $(".upload b").text();
        curcount        = parseInt(curcount);
        curcount++;
        $(".upload b").text(curcount);

        //LOCK IN THE SESSION PLAYTIME FOR NEXT DATA SYNC
        app.log(user_id, app.cache.sessionPlayTime, app.cache.sessionStart);

        setTimeout(function(){
            // fake delay just to have some visual feedback
            $(".logit").removeClass("syncing");
            app.checkGoal();
            app.showToast("Your listening session was saved.");
        },750);

        //RESET VARS
        app.cache.sessionPlayTime   = 0;
        app.cache.sessionStart      = null;
        app.cache.sessionTimerId    = null;
        app.cache.playTimerId       = null;
    },

    resetSessionLogs : function(session_ids_inplay,store_o,inc){
        inc++;
        if(inc < 5){
            var temp = setTimeout(function(){
                if(!session_ids_inplay.length){
                    console.log("new storage o")
                    //PUT IT BACK into LOCAL STORAGE AFTER AJAX HAS FINISHED
                    localStorage.setItem("session_logs", store_o) ;
                }else{
                    console.log("recurse reset session",session_ids_inplay);
                    app.resetSessionLogs(session_ids_inplay,store_o);
                }
            },1000); 
        }
    },
    
    syncData : function(){
        if(navigator.onLine){
            var store_o  = JSON.parse(localStorage.getItem("session_logs"));
            if(store_o.length){
                for(var session_i in store_o){
                    var one_listen = store_o[session_i];
                    if(!one_listen.hasOwnProperty("synced")){
                        var start_utc   = new Date(one_listen["start_ts"]).toRedCapDateTime();
                        var end_utc     = new Date(one_listen["end_ts"]).toRedCapDateTime();
                        var record = {
                             "id"               : one_listen["session_id"]
                            ,"participant_id"   : one_listen["participant_id"]
                            ,"device_id"        : device.uuid
                            ,"duration"         : one_listen["play_time"]
                            ,"redcap_event_name": "session_arm_2"
                            ,"start_time"       : start_utc
                            ,"end_time"         : end_utc
                        };

                        var data = {"data" : JSON.stringify([record]) }
                        app.cache.redcap.saveData(data, function(response){
                            if(!response.error){
                                var curcount    = $(".upload b").text();
                                curcount        = parseInt(curcount);
                                curcount--;
                                $(".upload b").text(curcount);

                                store_o[session_i]["synced"] = true;
                                // session_ids_inplay.splice(session_ids_inplay.indexOf(session_i), 1);
                            }
                        });
                    }
                }

                setTimeout(function(){
                    localStorage.setItem("session_logs",JSON.stringify(store_o));
                },5000);

                //AFTER ALL OF THEM ARE DONE?
                if( app.cache.alert_counts["sync_msg"] < 1){
                    app.cache.alert_counts["sync_msg"]++;
                    app.showNotif("Thank You!","Your usage data will be very helpful.",function(){});
                    localStorage.setItem("alert_counts",JSON.stringify(app.cache.alert_counts) );
                } 
            }else{
                app.showNotif("Nothing to Sync","After you log a listening session, the number in parenthesis will increment up.",function(){});
            }
            
            setTimeout(function(){
                // fake delay just to have some visual feedback
                $(".upload").removeClass("syncing");
            },1000);
            
            // console.log(store_o);
            // app.resetSessionLogs(session_ids_inplay,store_o,0);
        }
    },

    startSyncTimer : function(){
        app.cache.syncTimerID = setInterval(function(){
            app.syncData();
        },1000);
    },

    startTimer : function(){
        var sessionTime = 1000 * 60 * 30; // 30 minute;
        app.cache.sessionTimerId = setTimeout(function(){
            app.logSession();
        }, sessionTime);

        app.cache.playTimerId   = setInterval(function(){
            app.cache.sessionPlayTime++;
        }, 1000);

        if(!app.cache.sessionStart){
            app.cache.sessionStart = Date.now();
            app.log("starting session ", app.cache.sessionStart);
        }
    },

    stopTimer : function(){
        clearTimeout(app.cache.sessionTimerId);
        clearInterval(app.cache.playTimerId);
    },

    closeCurrentPanel: function(panel){
        panel.removeClass("loaded").delay(50).queue(function(next){
            $(this).hide();
            next();
        });
        return;
    },

    transitionToPanel: function(panel){
        panel.show().delay(250).queue(function(next){
            $(this).addClass("loaded");
            next();
        });
        return;
    },

    showNotif : function(title, bodytext, _callback){
        navigator.notification.alert(
             bodytext
            ,function(){
                _callback();
            }
            ,title
            ,"Close");

        app.log("Showing Notif : " + bodytext);
        return;
    },

    showToast : function (text) {
        setTimeout(function () {
          window.plugins.toast.showShortBottom(text);
        }, 500);
    },

    log : function(msg){
        console.log(msg);
        var temp = $("#output").text();
        $("#output").text(temp.trim() + "\n" + msg);
    },

    getFormInputs: function(el){
        var values = {};
        $.each($(el).serializeArray(), function(i, field) {
            values[field.name] = field.value;
        });

        return values;
    }
};



if (!Date.prototype.toRedCapDateTime) {
    (function() {

        function pad(number) {
            if (number < 10) {
                return '0' + number;
            }
            return number;
        }

        Date.prototype.toRedCapDateTime = function() {
            return this.getUTCFullYear() +
                '-' + pad(this.getUTCMonth() + 1) +
                '-' + pad(this.getUTCDate()) +
                ' ' + pad(this.getUTCHours()) +
                ':' + pad(this.getUTCMinutes()) +
                ':' + pad(this.getUTCSeconds());
        };
    }());
}
