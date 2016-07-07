/*

 ----------------------------------------------------------------------------
 | ewd-feder8: Express and ewd-qoper8 based Federation Platform             |
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

  21 June 2016

*/


var config = {
  managementPassword: 'keepThisSecret!',
  serverName: 'EWD Feder8 Platform',
  port: 8082,
  poolSize: 1,
  database: {
    type: 'cache'
  }
};

var feder8_params = {
  server: {
    placeholder: {
      host: 'http://jsonplaceholder.typicode.com'
    },
    myEWD1: {
      host: 'http://192.168.1.188:8081'
    },
    myEWD2: {
      host: 'http://192.168.1.188:8081'
    }
  },
  destination: {
    dest1: ['myEWD1', 'myEWD2', 'myEWD3']
  },
  extensionModule: 'ewd-feder8/examples/myFeder8Extension'
};

var feder8 = require('ewd-feder8');
feder8.start(config, feder8_params);
