/**
 * @param token
 * @param endpoint
 * @constructor
 */

function REDCapApi(token, endpoint) {
    this.token    = token;         // API Token
    this.endpoint = 'https://redcap.stanford.edu/api/';   // API Endpoint
    this.debug    = true;
}

REDCapApi.prototype = {
    constructor:function() {
        if (!window.jQuery) {
            alert ("The use of REDCapApi requires jQuery");
        }
    },
    // e.g. getData( { "fields":["field_1","field_2"] }, doSomething);
    getData:function(customParams, callback) {
        // Default getData Parameters
        var params = {
            'token': this.token,
            'content': 'record',
            'format': 'json',
            'type': 'flat'
        };

        // Merge the parameters together
        $.extend(params,customParams);

        // Make the query
        this.send(params, callback);
    },
    saveData:function(customParams, callback) {
        var params = {
            'token': this.token,
            'content': 'record',
            'format': 'json'
        };

        // Merge the parameters together
        $.extend(params,customParams);

        // Make the query
        this.send(params, callback);
    },
    getMetadata:function(customParams, callback) {
        var params = {
            'token':    this.token,
            'content':  'metadata',
            'format':   'json'
        };

        // Merge the parameters together
        $.extend(params,customParams);

        // Make the query
        this.send(params, callback);
    },
    send:function(data, callback) {
        // Create an internal reference for callback functions
        var self = this;

        // Cache the latest call parameters to the object
        this.params = data;

        // Using .ajax instead of .post since REDCap adds CSRF to jquery .posts
        $.ajax({
            url: this.endpoint,
            method: "POST",
            timeout: 5*1000,    // in ms - 30000 is 30 seconds...
            data: this.params
        }).done(function(result) {
            if (self.debug) console.log("Success", result);
            self.result = result;
            if (callback) callback(self);
        }).fail(function(jqXHR, textStatus) {
            //FAILURE
            errormsg = (typeof jqXHR.responseJSON !== 'undefined' ? jqXHR.responseJSON.error : textStatus);
            if (self.debug) console.log("Failure",self);
            self.error = errormsg;
            if (callback) callback(self);
        });
    },
    dump:function() {
        if (this.debug) console.log(this);
    }
};
