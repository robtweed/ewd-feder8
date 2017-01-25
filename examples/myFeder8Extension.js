function load() {

  console.log('**** running load in extension module');
  this.on('feder8-request', function(params) {
    console.log('**** feder8-request event fired in extension module!');
    console.log('*** message: ' + JSON.stringify(params.messageObj));
    if (params.messageObj.params.destination !== 'dest2') return;
    console.log('*** db: ' + this.db.version());
    params.messageObj.responseSent = true;

    //finished({woohoo: 'I intercepted the request!'});
    params.forward.toHost('myEWD1', params.messageObj, params.finished);
    console.log('*** sendToHost invoked');
  });

  this.on('feder8-response', function(params) {
    console.log('**** on response fired in extension module!');
    //console.log('*** destination: ' + params.destination);
    console.log('*** params = ' + JSON.stringify(params));
    //console.log('*** response was ' + JSON.stringify(params.responseObj));
  });

  this.on('feder8-combined-response', function(params) {
    console.log('**** combined-response has been created');
    console.log('*** params = ' + JSON.stringify(params));
  });

}

module.exports = load;