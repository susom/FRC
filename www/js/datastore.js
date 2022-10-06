var datastore = {
    db : null

    ,startupDB: function(dbname){
        var db  = new PouchDB(dbname, {iosDatabaseLocation: 'default', auto_compaction: true});
        if (!db.adapter) {
          db = new PouchDB(dbname);
        }
        return db;
    }

    ,destroyDB : function(dbname){
        new PouchDB(dbname).destroy().then(function (){
          app.log("DB DESTROYED: " + dbname);
        }).catch(function (err) {
          app.log("ERROR destroyDB(): " + dbname);
          datastore.showError(err);
        });
    }

    ,getDB : function(db,_id,assign_to_this){
        db.get(_id).then(function (doc) {
            assign_to_this = doc;
        }).catch(function (err) {
            app.log("ERROR getDB(): " + _id, "Error");
            datastore.showError(err);
        });
    }

    ,getAll : function(db){
        db.allDocs({
            // IF NO OPTION, RETURN JUST _id AND _rev (FASTER)
            include_docs: true
            // ,startkey : 'id01'
            // ,endkey : 'id10'
            // ,limit : 10
            // inefficient
            // ,skip  : 5
            // ,descending : true
            // ,key : 'id01'
            // ,keys : ['id01','id02']
        }).then(function (res) {
            console.log(res["rows"]);
            // utils.dump(res["rows"]);
        }).catch(function(err){
            app.log("ERROR getAll()", "Error");
        });
    }

    ,writeDB : function(db,_o){
        db.put(_o).then(function (new_o) {
            var _rev = new_o.rev;
            _o._rev = _rev;
            app.log("JSON OBJECT SUCCESFULLY SAVED : " + _o._id + " , rev : " + _o._rev);
        }).catch(function (err) {
            app.log("ERROR WRITING TO A DB", "Error");
            datastore.showError(err);
        });
    }

    ,liveDB : function(db){
        //DONT NEED THIS CAUSE THE OTHER LIVE SYNCS HAVE "change" EVENT TRIGGER TOO
        db.changes({
             since    : 'now'
            ,live     : true
        }).on('change', function(){

        }).catch(function (err) {
            app.log("ERROR liveDB()", "Error");
        });
    }

    ,twoWaySyncDB : function(localdb_obj,remotedb_str){
        localdb_obj.sync(remotedb_str, {
            live: true
        }).on('change', function (change) {
        }).on('uptodate',function(update){
        }).catch(function (err) {
            app.log("ERROR twoWaySyncDB():");
        });
    }

    ,localSyncDB : function(localdb_obj,remotedb_str, _callBack){
        //'complete', 'active', 'paused', 'change', 'denied' and 'error'
        localdb_obj.replicate.to(remotedb_str,{
            // live: true
            filter: function(doc){
                return !doc.uploaded
            }
        }).on('active',function(){
            // not very useful
        }).on('complete', function (info) {
            // console.log(info["ok","start_time","docs_read","docs_written","doc_write_failures","errors","last_seq","status","end_time"]);
            // console.log("docs_read : "+info["docs_read"]);
            // console.log("docs_written : "+info["docs_written"]);
            _callBack(info);
        }).on('change',function(info){
            //THIS IS MORE VALUABLE THAN "complete"
            //ACTUAL DETAILS THE CHANGES MADE
            // console.log("CHANGE CALLBACK");
            // console.log(info["ok","start_time","docs_read","docs_written","doc_write_failures","errors","last_seq","docs"]);
            _callBack(info);
        }).catch(function (err) {
            // However, there is one gotcha with live replication: 
            // what if the user goes offline? In those cases, an error will be thrown 
            // and replication will stop.
            app.log("ERROR localSyncDB()", "Error");
        });
    }

    ,remoteSyncDB : function(localdb_obj,remotedb_str, _callBack){
        localdb_obj.replicate.from(remotedb_str,{
            // live: true
        }).on('complete', function (wut) {
            console.log("REPLICATION (COMPLETE) FROM " + remotedb_str);
            _callBack();
        }).on('change',function(change){
            console.log("REPLICATION (CHANGE) FROM " + remotedb_str);
            _callBack();
        }).on('uptodate',function(update){
            console.log("REPLICATION (UPTODATE) FROM " + remotedb_str);
            _callBack();
        }).catch(function (err) {
            // However, there is one gotcha with live replication: 
            // what if the user goes offline? In those cases, an error will be thrown 
            // and replication will stop.
            app.log("ERROR ON REPLICATING FROM REMOTE: " + remotedb_str);
        });
    }

    ,addAttachment : function(_o, media){
        // URL.createObjectURL();  converts base64 image into imgsrc
    }

    ,showError : function(e){
        console.log("status: "  + e["status"]);
        console.log("name: "    + e["name"]);
        console.log("message: " + e["message"]);
        console.log("reason: "  + e["reason"]);
        return;
    }

    ,pouchCollate : function(component_array){
        // return window.pouchCollate.toIndexableString(component_array).replace(/\u0000/g, '\u0001')
        return component_array.join("_");
    }

    ,pouchDeCollate : function(_id){
        return window.pouchCollate.parseIndexableString(_id);
    }

    ,deleteLocalDB : function(){
        //DELETE LOCAL USER DB
        datastore.emptyUsersDB();
        datastore.emptyLogsDB();

        //DELETE LOCAL PROJECT DB
        app.cache.localprojdb.destroy().then(function (response) {
            app.cache.localprojdb       = datastore.startupDB(config["database"]["proj_local"]);
        }).catch(function (err) {
            app.log("deleteLocalDB" + err, "Error");
        });
        return;
    }

    ,emptyLogsDB : function(){
        //DELETE LOCAL DBs
        app.cache.locallogdb.destroy().then(function (response) {
            app.cache.locallogdb    = datastore.startupDB(config["database"]["log_local"]); 
        }).catch(function (err) {
            app.log("emptyLogsDB" + err, "Error");
        });
        return;
    }

    ,emptyUsersDB : function(){
        //DELETE LOCAL DBs
        app.cache.localusersdb.destroy().then(function (response) {
            app.cache.localusersdb    = datastore.startupDB(config["database"]["users_local"]); 
        }).catch(function (err) {
            app.log("emptyUsersDB" + err, "Error");
        });
        return;
    }
};

