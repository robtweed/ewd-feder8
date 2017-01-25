/*

 ----------------------------------------------------------------------------
 | ewd-feder8: QEWD-based module for federated HTTP/REST service            |
 |                                                                          |
 | Copyright (c) 2016-17 M/Gateway Developments Ltd,                        |
 | Reigate, Surrey UK.                                                      |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://www.mgateway.com                                                  |
 | Email: rtweed@mgateway.com                                               |
 |                                                                          |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  25 January 2017
   Thanks to Ward De Backer for enhancements and bug fixes

*/
var url = require('url'); // use url module to parse the host part
var request = require('request');
var sessions = require('ewd-session');
var extensionModule;

function isEmpty(object) {
  for (var key in object) {
    return false;
  }
  return true;
}

function sendToGroup(destination, messageObj, finished, forward) {
  var group = this.userDefined['ewd-feder8'].destination[destination];
  var combinedResponse = {};
  var count = 0;
  var max = group.length;
  var q = this;
  var groupError = ''; // error for undefined servers in group
  var params = { // params for emit (messageObj added for use in event handlers, e.g. you need the application property)
    destination: destination,
    error: groupError, // contains the last undefined server
    messageObj: messageObj,
    responseObj: combinedResponse,
    finished: finished,
    forward: forward
  };

  group.forEach(function(server) {
    // defined fin separately to add combining stuff and emit event
    var fin = function(response) {
      combinedResponse[server] = response;
      count++;
      if (count === max) {
        q.emit('feder8-combined-response', params);
        //console.log('**** sendToGroup end: ', params.responseObj);
        if (params.responseObj && params.responseObj.responseSent) return;
        finished(params.responseObj);
      }
    }

    if (this.userDefined['ewd-feder8'].server && this.userDefined['ewd-feder8'].server[server]) {
      sendToHost.call(this, server, messageObj, fin, forward);
    }
    else {
      groupError = 'Server ' + server + ' not defined';
      fin({error: groupError});
    }
  }, this);
}

function sendToHost(server, messageObj, finished, forward) {
  var hostUrl = this.userDefined['ewd-feder8'].server[server].host;
  if (!hostUrl) {
    finished({error: 'host URL not defined for destination ' + server});
    return;
  }
  var path = messageObj.params['0'];
  if (hostUrl.slice(-1) !== '/') hostUrl = hostUrl + '/';
  hostUrl = hostUrl + path;
  // preserve original headers, just replace host property
  var headers = messageObj.headers || {};
  if (headers.host) headers.host = url.parse(hostUrl).host;
  headers['content-type'] = headers['content-type'] || 'application/json'; // default to json content-type
  delete headers['content-length']; // change: body content can contain null values, so force request() to recalculate content-length
  var options = {
    url: hostUrl,
    method: messageObj.method,
    headers: headers
  };
  messageObj.handled = true;
  if (!isEmpty(messageObj.body)) options.body = messageObj.body;
  if (!isEmpty(messageObj.query)) options.qs = messageObj.query;
  if (messageObj.headers['content-type'] === 'application/json') options.json = true;
  var q = this;
  request(options, function(error, response, body) {
    var params = {
      destination: server,
      error: error,
      messageObj: messageObj, // also added messageObj here to know context in response event handler
      responseObj: response,
      body: body,
      finished: finished,
      forward: forward
    };
    q.emit('feder8-response', params);
    if (params.responseObj && params.responseObj.responseSent) return; // if request error, response can be undefined
    if (response && response.responseSent) return;
    if (!body) body = {};
    if (error) {
      finished({error: error});
    }
    else {
      finished(body);
    }
  }); 
}

module.exports = {

  restModule: true,

  handlers: {

    'ewd-feder8': function(messageObj, finished) {
      var error;
      //console.log('*** ewd-feder8 - handling ' + JSON.stringify(messageObj));
      if (!extensionModule && this.userDefined['ewd-feder8'] && this.userDefined['ewd-feder8'].extensionModule) {
        try {
          extensionModule = require(this.userDefined['ewd-feder8'].extensionModule);
          extensionModule.call(this);
          //console.log('*** extension module called');
        }
        catch(err) {
          error = 'Unable to load extension module ' + this.userDefined['ewd-feder8'].extensionModule;
          console.log(error + ': ' + err); // add detailed logging to console + reason in response
          finished({
            error: error,
            reason: err
          });
          return;
        }
      }
      var params = {
        messageObj: messageObj,
        destination: messageObj.params.destination,
        finished: finished,
        forward:  {
          toHost: sendToHost.bind(this),
          toGroup: sendToGroup.bind(this)
        }
      };
      this.emit('feder8-request', params);
      if (messageObj.responseSent) return; // the request event handled returned a response to the client
      if (messageObj.handled) return; // the request event forwarded the request

      var destination = messageObj.params.destination;
      if (this.userDefined['ewd-feder8'] && this.userDefined['ewd-feder8'].destination && this.userDefined['ewd-feder8'].destination[destination]) {
        sendToGroup.call(this, destination, messageObj, finished, params.forward);
        return;
      }

      if (this.userDefined['ewd-feder8'] && this.userDefined['ewd-feder8'].server && this.userDefined['ewd-feder8'].server[destination]) {
        sendToHost.call(this, destination, messageObj, finished, params.forward);
        return; 
      }
      else {
        finished({error: 'Destination ' + destination + ' has not been configured'});
      }
    }

  }

};
