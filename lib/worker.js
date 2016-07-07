/*

 ----------------------------------------------------------------------------
 | ewd-feder8: ewd-xpress based module for federated HTTP/REST service      |
 |                                                                          |
 | Copyright (c) 2016 M/Gateway Developments Ltd,                           |
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

*/

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
  var combinedResults = {};
  var count = 0;
  var max = group.length;
  group.forEach(function(destination) {
    if (this.userDefined['ewd-feder8'].server && this.userDefined['ewd-feder8'].server[destination]) {
      var fin = function(results) {
        combinedResults[destination] = results;
        count++;
        if (count === max) finished(combinedResults);
      }
      sendToHost.call(this, destination, messageObj, fin, forward);
    }
    else {
      combinedResults[destination] = {error: 'Server ' + destination + ' not defined'};
      count++;
      if (count === max) finished(combinedResults);
    }
  }, this);
}

function sendToHost(destination, messageObj, finished, forward) {
  var url = this.userDefined['ewd-feder8'].server[destination].host;
  if (!url) {
    finished({error: 'host URL not defined for destination ' + destination});
    return;
  }
  var path = messageObj.params['0'];
  if (url.slice(-1) !== '/') url = url + '/';
  url = url + path;
  var options = {
    url: url,
    method: messageObj.method,
    headers: {
      'Content-type': messageObj.headers['content-type']
    }
  };
  messageObj.handled = true;
  if (!isEmpty(messageObj.body)) options.body = messageObj.body;
  if (!isEmpty(messageObj.query)) options.qs = messageObj.query;
  if (messageObj.headers['content-type'] === 'application/json') options.json = true;
  var q = this;
  request(options, function(error, response, body) {
    var params = {
      destination: destination,
      error: error,
      responseObj: response,
      body: body,
      finished: finished,
      forward: forward
    };
    q.emit('feder8-response', params);
    if (response.responseSent) return;
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
      //console.log('*** ewd-feder8 - handling ' + JSON.stringify(messageObj));
      if (!extensionModule && this.userDefined['ewd-feder8'] && this.userDefined['ewd-feder8'].extensionModule) {
        try {
          extensionModule = require(this.userDefined['ewd-feder8'].extensionModule);
          extensionModule.call(this);
        }
        catch(err) {
          finished({error: 'Unable to load extension module ' + this.userDefined['ewd-feder8'].extensionModule});
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
