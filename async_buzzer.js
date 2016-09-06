var b = require('octalbonescript'); //load the library
var async = require('async');
var buzzerDutyCycle = 0.5;
var buzzerFreq = 2000;
var duration = 100; // buzzer duration
var callIndicationSound = 'P8_19'; //buzzer
var pendant_button = 'P9_12';

var heartbitRate = 1000;
var heartState = b.LOW;
var heartbit = 'USR0';
var resp1 = b.pinModeSync(heartbit,b.OUTPUT);

setInterval(hearRate, heartbitRate); //Checking the Heartbit
console.log('HeartBit started');

function hearRate()  
{
    if (heartState == b.LOW) heartState = b.HIGH; //toggling heartbit
    else heartState = b.LOW;
        
    b.digitalWriteSync(heartbit, heartState); // here state can be 0 / 1.
}

// below code will assign digital output mode to pin and when the pin is ready, it will put it in HIGH state.
b.attachInterrupt(pendant_button, b.RISING, function(err, resp) {
  if(err){
    //console.error(err.message);
    console.error("Unable to Generate Pendant Interrupt");
    process.exit(194);
  }
  buzzer();
}, function(err){
  if(err){
    //console.error(err.message);
    console.error("Unable to Initialize Pendant");
    process.exit(195);
  }else console.log('pendant Ready');
  
});

// below code will assign analog output mode to pin and when the pin is ready, it will write 0.5 value.
b.pinMode(callIndicationSound, b.ANALOG_OUTPUT, function(err1) {
  if (err1) {
    //console.error(err1.message); //output any error
    console.error("Unable to set buzzer pinMode");
    process.exit(191);
  }else console.log('Buzzer Ready');
  
  b.analogWrite(callIndicationSound,buzzerDutyCycle, buzzerFreq, function(err2) {
      if (err2) {
        //console.error(err2.message); //output any error
        console.error("Unable to Start Buzzer");
        process.exit(192);
      }
  });
  
  setTimeout(function(){
    b.stopAnalog(callIndicationSound, function(err){
    if(err){
      //console.error(err.message);
      console.error("Unable to Stop Buzzer");
      process.exit(193);
    }
    });
    
  }, duration);
  
});


function buzzer(duration){
async.series({
  buzzerOn: function(callback){
            setTimeout(function(){
              
              console.log("buzzer On");
              b.startAnalog(callIndicationSound, function(err){
                 if(err){
                    console.error(err.message);
                  }
              });
              
              callback(null,1);
            },10);
          },
  buzzerOff: function(callback){
            setTimeout(function(){
              
              console.log("buzzer off");
              b.stopAnalog(callIndicationSound, function(err){
                if(err){
                  console.error(err.message);
                }
              });
              
              callback(null, 0);
            },100);
          }
});
}