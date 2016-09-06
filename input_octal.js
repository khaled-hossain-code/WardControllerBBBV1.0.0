var b = require('octalbonescript'); //load the library

var pendant_button = 'P9_12'; //the pin to operate on

// below code will assign digital output mode to pin and when the pin is ready, it will put it in HIGH state.
b.attachInterrupt(pendant_button, b.RISING, function(err, resp) {
  if(err){
    console.error(err.message);
    return;
  }
  console.log(resp.pin);
  console.log(resp.value);
}, function(err){
  if(err){
    console.error(err.message);
    return;
  }else console.log('pendant pressed');
  
});