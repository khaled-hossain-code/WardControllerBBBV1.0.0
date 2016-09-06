var b = require('octalbonescript'); //load the library

var callIndicationSound = 'P8_19'; //buzzer
var buzzerDutyCycle = 0.5;
var buzzerFreq = 2000;
var duration = 100; // buzzer duration


// below code will assign analog output mode to pin and when the pin is ready, it will write 0.5 value.
b.pinMode(callIndicationSound, b.ANALOG_OUTPUT, function(err1) {
  if (err1) {
    console.error(err1.message); //output any error
    return;
  }else console.log('analog output set');
  
  b.analogWrite(callIndicationSound,buzzerDutyCycle, buzzerFreq, function(err2) {
      if (err2) {
        console.error(err2.message); //output any error
        return;
      }else console.log('pwm running');
  });
  
  setTimeout(function(){
    b.stopAnalog(callIndicationSound, function(err){
    if(err){
      console.error(err.message);
    }else console.log('pwm stopped');
    });
    
  }, duration);
  
});