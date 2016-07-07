var sessions = require('ewd-session');

module.exports = {

  restModule: true,

  handlers: {

    test1: function(messageObj, finished) {
      console.log('*** test messageObj: ' + JSON.stringify(messageObj));
      finished({
        test: 'finished ok',
        pid: process.pid
      });
    },

    test2: function(messageObj, finished) {
      console.log('*** test messageObj: ' + JSON.stringify(messageObj));
      setTimeout(function() {
        finished({
          test: 'finished ok',
          pid: process.pid
        });
      }, 200);
    }

  }

};