///******* Modules ******************\\\
var b = require('octalbonescript'); //load the library
var async = require('async');
var io = require('socket.io-client');
//var socket = io.connect('http://192.168.1.6:8080'); // my pc
//var socket = io.connect('http://192.168.1.29:8000'); // mamshed vai's pc
//var socket = io.connect('http://192.168.1.12:8000'); // sagir vai's pc
<<<<<<< HEAD
var socket = io.connect('http://192.168.1.210:8000'); // Server Ncs1
=======
var socket = io.connect('http://192.168.1.250:8000'); // Server Ncs1
>>>>>>> 6d848c899d40982c2e11e1942e2292ccf36f2b8f
var os = require( 'os' );

var IP = os.networkInterfaces( ).eth0[0].address;
var payload = {
    IP:IP, //getting from network interfaces file IP='192.168.1.240'
    CallType: 'Normal',
    SocketID: ""
};

var wardLightInterval; //it is a setInterval function
var presenceIndicationInterval; //this one is also a setInterval Function
var deviceStatus = 10; //Normal state or nothing need to be done

// *********** Variables *************\\
var heartState = b.LOW;
var wardColorState = 'off';
var presenceColorState = 'off';
var state = {
    value: 4, //initially at cancel state, so that presence button does not work but pendant button works
    description: "no call",
}; // this system can be in one of the following state 0.No Call 1.Patient Called 2.Emergency 3.BlueCode
var buzzerDutyCycle = 0.5;
var buzzerFreq = 2000;
var heartbitRate = 1000;
var presencePressed = 0; //to track how many times presence button is pressed
var cancelPressed = 0; // to track how many times cancel button is pressed and if pressed more than 3 times app will be restarted
var duration = 100; // buzzer duration
var flickerTime = 1000;

///********* pin Assigning ***********\\\
var heartbit = 'USR0';
var userLed1 = 'USR1';
var userLed2 = 'USR2';
var userLed3 = 'USR3';

//rgb led pin assign for ward light
var wardLightRed  = 'P9_18'; //10ohm resistor is connected
var wardLightBlue = 'P9_26'; // 10ohm resistor is connected
var wardLightGreen = 'P9_22'; // 10ohm resistor is connected

var presenceIndicationRed = 'P8_07';
var presenceIndicationGreen =  'P8_09';
var callIndicationSound = 'P8_19'; //buzzer

//wardLight Inputs
var pendant_button = 'P9_12'; // pendant is the input of patient to call the nurse , this pin is pulled low externally by a 7.5k ohm res
var presence_button = 'P9_14'; //presence button is the input of nurse presence, this pin is pulled low externally by a 7.5k ohm res
var cancel_button = 'P9_16';


/// ****** Initial/setup Code ****** \\\

/// ******** pinMode setup ***********\\
// setting outputs of onboard LED
var resp1 = b.pinModeSync(heartbit,b.OUTPUT); // declearing user led 0 as output
var resp2 = b.pinModeSync(userLed1,b.OUTPUT);
var resp3 = b.pinModeSync(userLed2,b.OUTPUT);
var resp4 = b.pinModeSync(userLed3,b.OUTPUT);

// setting outputs of wardlight LED
var resp5 = b.pinModeSync(wardLightRed,  b.OUTPUT);
var resp6 = b.pinModeSync(wardLightBlue, b.OUTPUT);
var resp7 = b.pinModeSync(wardLightGreen, b.OUTPUT);

// setting outputs of Patient Call Point light LED
var resp8 = b.pinModeSync(presenceIndicationGreen,  b.OUTPUT);
var resp9 = b.pinModeSync(presenceIndicationRed, b.OUTPUT);

//checking all digital pins are set to output
//console.log("resp1: " + resp1, "resp2: " + resp2, "resp3: " + resp3, "resp4: " + resp4, "resp5: " + resp5, "resp6: " + resp6, "resp7: " + resp7, "resp8: " + resp8, "resp9: " + resp9);
 if (resp1 || resp2 || resp3 || resp4 || resp5 || resp6 || resp7 || resp8 || resp9) // if setting any pinmode fails then restart the app
 {
     console.log("All Digital IO Ready");
     
 }else{
     console.log("Unable to set pinMode", "Restarting the App");
     process.exit(190);
 }
 
// below code will assign analog output mode to pin and when the pin is ready, it will write 0.5 value.
try{
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
        
      }, 100);
      
    });
    
}catch(err){
    console.error("Unable to Start Buzzer");
    //process.exit(192);
}

//Indications that all the devices are working and started
wardLight('green');  // At begining ward light will turned on for 1sec indicating that it is working and device is up
console.log('WardLight Ready');
setTimeout(wardLight('off'), 2000);
presenceIndication('green'); // At begining presence indicator will turned on for 1sec indicating that it is working and device is up
setTimeout(presenceIndication('off'),2000);

//*****Socket.IO*********\\\\\\\
//after connection server sends an event named connection 
socket.on('connected', function (data) {
  console.log(data.status);
  payload.SocketID = data.socketId;
  socket.emit("payload", payload);
});

socket.on('deviceStatus', function(data){ //this synch information with database
    //console.log("Device Stauts is " + data.deviceStatus);
    deviceStatus = data.deviceStatus;
    executeStatus();
});

socket.on('deviceState', function(device){// it executes by commands from front-end
    console.log(device.IP + " Device State is " + device.State);
    
    //device.state value means
    //0 = presence 1=normal call, 2= emergency call 3= bluecode 4=cancel emergency 5= cancel bluecode 6=app restart in executeStatus
    if(device.IP === IP){
        if(device.State === 0 && state.value === 1 ) //if the state is in normal call then user can cancel givng device.state = 0;
        {//from web asked for presence
            state.value = device.State;   
            executeState();
        }else if(device.State === 1 && (state.value === 0 || state.value === 4 || state.value === 5 ) ) //from web asked for normal call, at cancel state, so that presence button does not work but pendant button works
        {
            state.value = device.State;
            executeState();
        }else if(device.State === 2 && state.value === 0  ) //from web asked to generate emergency call, it can happen in presence mode only
        {
            state.value = device.State;
            executeState();
        }else if(device.State === 3 && state.value === 2  )//from web asked to generate bluecode call, it can happen in emergency only
        {
            state.value = device.State;
            executeState();
        }else if(device.State === 4 && state.value === 2  )//from web asked to cancel emergency, it can happen in emergency only
        {
            state.value = device.State;
            executeState();
        }else if(device.State === 5 && state.value === 3  )//from web asked to cancel bluecode, it can happen in bluecode only
        {
            state.value = device.State;
            executeState();
        }else if(device.State === 6) //web asked to restart the app
        {
            deviceStatus = device.state;
            executeStatus();        
        }else{
            console.log("Nothing to execute");
        }
        
        
    }
    
});


///*****************function loop************************ \\\ 
setInterval(hearRate, heartbitRate); //Checking the Heartbit
console.log('HeartBit started');

// below code will assign digital output mode to pin and when the pin is ready, it will put it in HIGH state.
b.attachInterrupt(pendant_button, b.RISING, function(err, resp) {
  if(err){
    //console.error(err.message);
    console.error("Unable to Generate Pendant Interrupt");
    process.exit(194);
  }
  callNurse();
}, function(err){
  if(err){
    //console.error(err.message);
    console.error("Unable to Initialize Pendant");
    process.exit(195);
  }else console.log('pendant Ready');
  
});


b.attachInterrupt(presence_button, b.RISING, function(err, resp) {
  if(err){
    //console.error(err.message);
    console.error("Unable to Press Presence button");
    process.exit(196);
  }
  nursePresence();
}, function(err){
  if(err){
    //console.error(err.message);
    console.error("Unable to Initialize Presence Button");
    process.exit(197);
  }else console.log('Presene button Ready');
  
});

b.attachInterrupt(cancel_button, b.RISING, function(err, resp) {
  if(err){
    //console.error(err.message);
    console.error("Unable to Press Cancel Button");
    process.exit(198);
  }
  cancelCall();
}, function(err){
  if(err){
    //console.error(err.message);
    console.error("Unable to Initialize Cancel Button");
    process.exit(199);
  }else console.log('Cancel button Ready');
  
});


/// ***************function Definition**********************\\\
//this is the device status handling function which comes from server
function executeStatus(){

    switch(deviceStatus)
        {
        
            case 0: // nurse pressed presence button
                state.value = 0;
                presencePressed = 0;
                wardLight('off');
                presenceIndication('off');
                soundIndication(duration);
                state.description = "Status: Nurse pressed the presence button";
                break;
            case 1: //Normal Call
                state.value = 1;
                wardLight('green');
                presenceIndication('green');
                soundIndication(duration);
                state.description = "Status: Patient Called Nurse for help";
                break;
            case 2: //Emergency Call
                state.value = 2;
                presencePressed = 2;
                wardLight('red'); //tasks:1.turn off ward light
                presenceIndication('red'); //task2: turn off nurse presence indication
                soundIndication(duration);
                
                setTimeout(function(){
                    soundIndication(duration);    
                },2*duration);
                state.description = "Status: Nurse called for emergency help";
                break;
            case 3: //BlueCode call
                state.value = 3;
                presencePressed = 3;
                wardLightInterval = setInterval(wardLightFlicker,flickerTime); //tasks:1.turn on ward light flickering
                presenceIndicationInterval = setInterval(presenceIndicationFlicker,flickerTime); //task2: turn on nurse presence indication flickering
                soundIndication(duration);
                
                setTimeout(function(){
                    soundIndication(duration);    
                },2*duration);
                state.description = "Status: Nurse called for BlueCode";
                break;
            case 4: //Nurse Cancelled Emergency call
                state.value = 4;
                presencePressed = 0; 
                wardLight('off'); //tasks:1.turn off ward light 
                presenceIndication('off'); //task2: turn off nurse presence indication 
                state.description = "Status: Nurse cancelled Emergency call";
                break;
            case 5: //Nurse Cancelled BlueCode call
                state.value = 5;
                presencePressed = 0; 
                clearInterval(wardLightInterval); //tasks:1.turn off ward light 
                wardLight('off');
                clearInterval(presenceIndicationInterval) //task2: turn off nurse presence indication 
                presenceIndication('off');
                state.description = "Status: Nurse cancelled BlueCode call";
                break;
            case 6: //Restart the App
                console.log("App is Restarting");
                process.exit(187);
            default:
                state.description = "Status: No state info in database";
        }
        console.log("Synched With Database");
        console.log(state.description);
        
}
//this is the main operation handling function
function executeState()
{
    
    switch (state.value)
        {
            case 0: //PRESENCE:this state is present state. when nurse press the presence button 
                wardLight('off');
                presenceIndication('off');
                soundIndication(duration);// task 3 need to generate sound as a confirmation of presence button presses
                //task3 notify server
                //task4: tell the server
                payload.CallType = 'Presence';
                
                socket.emit('Presence', payload,function(data){
                    console.log(data);
                });
                
                state.description = "Nurse pressed the presence button";
                break;
                
            case 1: //NORMAL CALL: whenever patient presses pendant. state.value = 1 & this means normal call
                wardLight('green'); //task 1 is completed green light is turned on
                presenceIndication('green'); // task 2 to turn on patient presence button as green
                soundIndication(duration);// task 3 need to generate sound as a confirmation of button pressed
                // task 4 need to be done notify server
                payload.CallType = 'Normal';
                
                socket.emit('Normal', payload,function(data){
                    console.log(data);
                });
                state.description = "Patient Called Nurse for help";
                break;
                
            case 2: //EMERGENCY:whenever nurse presses presence button twice while it was on off state this case is executed. state.value =2
                wardLight('red'); //tasks:1.turn off ward light
                presenceIndication('red'); //task2: turn off nurse presence indication
                state.description = "Nurse called for emergency help";
                
                soundIndication(duration);
                
                setTimeout(function(){
                    soundIndication(duration);    
                },2*duration);
                
                //notify server
                payload.CallType = 'Emergency';
                
                socket.emit('Emergency', payload,function(data){
                    console.log(data);
                });
                
                break;
                
            case 3: //BLUECODE:whenever nurse presses presence button once while it was on emergency state this case is executed. state.value =3
                wardLightInterval = setInterval(wardLightFlicker,flickerTime); //tasks:1.turn on ward light flickering
                presenceIndicationInterval = setInterval(presenceIndicationFlicker,flickerTime); //task2: turn on nurse presence indication flickering
                soundIndication(duration);
                //notify server
                payload.CallType = 'BlueCode';
                
                socket.emit('BlueCode', payload,function(data){
                    console.log(data);
                });
                
                setTimeout(function(){
                    soundIndication(duration);    
                },2*duration);
                state.description = "Nurse called for BlueCode";
                break;
                
            case 4: //cancel emergency call
                wardLight('off'); //tasks:1.turn off ward light 
                presenceIndication('off'); //task2: turn off nurse presence indication 
                //task4: tell the server
                payload.CallType = 'Cancel Emergency';
                
                socket.emit('Cancel Emergency', payload,function(data){
                    console.log(data);
                });
                
                state.description = "Cancelled Emergency call";// task3 set the description
                
                break;
                
            case 5: //cancel bluecode alert
                clearInterval(wardLightInterval); //tasks:1.turn off ward light 
                wardLight('off');
                clearInterval(presenceIndicationInterval) //task2: turn off nurse presence indication 
                presenceIndication('off');
                //task3 set the description
                state.description = "Cancelled BlueCode call";
                //task4 notify the server
                //notify server
                payload.CallType = 'Cancel BlueCode';
                
                socket.emit('Cancel BlueCode', payload,function(data){
                    console.log(data);
                });
                break;
            default:
                state.description = "No Call/Presence State";
        }
        
        console.log(state.description);
}


/////////Button Pressed Events\\\\\\\\\\\\\\\\\\\\\

//this function get called when pendant is pressed, 
// tasks: 1. turn on green ward light,2.sound notification of button press for visible disabled people 3.notify server that pendant is pressed
// input: object with interrupt information, x is the object here
// output: none
function callNurse()
{
    // console.log(JSON.stringify(x)); 
    // x is {"pin":{"name":"GPIO1_28","gpio":60,"mux":"gpmc_ben1","eeprom":36,"key":"P9_12","muxRegOffset":"0x078","options":["gpmc_ben1","mii2_col","NA","mmc2_dat3","NA","NA","mcasp0_aclkr","gpio1_28"]},"attached":true}
    
     
        //patient can call the nurse only if the system state is at presence or state 0/ cancel of emergency or state 4 / cancel of bluecode or state 5
        if(state.value === 0 || state.value === 4 || state.value === 5)
        {
            state.value = 1; //state 1 means normal call 
            presencePressed = 0; // clearing all unnecessary presence button called by any children 
            executeState();
        }else
        {
            soundIndication(duration);
            console.log("Already Called Nurse Once");
        }
     
}


//this function get called when nurse presence button is pressed
//tasks:1.turn off ward light, 2.send the presence signal to server
// input: object with interrupt information, x is the object here
// output: none
function nursePresence(){
    // console.log(JSON.stringify(x)); 
    // y is {"pin":{"name":"GPIO1_28","gpio":60,"mux":"gpmc_ben1","eeprom":36,"key":"P9_12","muxRegOffset":"0x078","options":["gpmc_ben1","mii2_col","NA","mmc2_dat3","NA","NA","mcasp0_aclkr","gpio1_28"]},"attached":true}
    
        presencePressed++;
        console.log("Presence Pressed total: " + presencePressed);
        
        if(presencePressed === 1 && state.value === 1) // means patient has already pressed the pendant and nurse just pressed the presence button once
        {
            state.value = 0; // nurse is present
            presencePressed = 0; //resetting the presencePressed value and ready to take input from pendant again
            //console.log("Nurse Pressed the presence Button");
            executeState();
        }
        else if(presencePressed === 2 && state.value === 0) // means presence button is pressed twice and the system is in presence state. 
        {
            state.value = 2; // this means emergency state
            executeState();
        }
        else if(presencePressed === 3 && state.value === 2) // means presence button is pressed thrice or more than thrice 
        {
            state.value = 3; // this means bluecode state
            executeState();
        }
        else if(presencePressed > 3 && state.value === 3)
        {
            //soundIndication(duration);
            console.log("Already Generated BlueCode");
        }
    
}

//this function get called when cancel is pressed, 
// tasks: 1. turn off ward light,2.turn off patience call point light 3.notify server that call is canceled 
// input: object with interrupt information, x is the object here
// output: none
function cancelCall()
{
    // console.log(JSON.stringify(x)); 
    // x is {"pin":{"name":"GPIO1_28","gpio":60,"mux":"gpmc_ben1","eeprom":36,"key":"P9_12","muxRegOffset":"0x078","options":["gpmc_ben1","mii2_col","NA","mmc2_dat3","NA","NA","mcasp0_aclkr","gpio1_28"]},"attached":true}
    
         presencePressed = 0; //clearing number of time nurse pressed the present button
         cancelPressed++;
         
         if(state.value === 0){ //nurse pressed presence button and after that nurse pressed cancel for initial state
             state.value = 4; //initially at cancel state, so that presence button does not work but pendant button works
             cancelPressed = 0;
             state.description = "No Call/Presence State"; 
             console.log(state.description);
         }
         else if(state.value === 2) // if nurse has called for emergency then cancel the emergency call alert
         {
            state.value = 4;  //state 4 means cancel emergency call
            cancelPressed = 0;
            executeState();     
         }else if(state.value === 3) // if nurse has called for bluecode then cancel the blue code alert
         { 
             state.value = 5;
             cancelPressed = 0;
             executeState();
         }else if(cancelPressed >= 3){ //if cancel button is pressed more than 3 times restart the app
             console.log("App Restarting!!!");
             process.exit(187);
         }
         else{
             console.log("Cancel Pressed : " + cancelPressed);
             console.log("nothing to cancel");
         }
}
// this is a function to turn on & off User led 0. To indicate that device is Alive
// inputs: none
// outputs: none
// used: used as a callback function with a interval of 1000ms 
function hearRate()  
{
    if (heartState == b.LOW) heartState = b.HIGH; //toggling heartbit
    else heartState = b.LOW;
        
    b.digitalWriteSync(heartbit, heartState); // here state can be 0 / 1.
}
// end of heartRate function


//wardlight Flicker
function wardLightFlicker()  
{
    if (wardColorState === 'off') wardColorState = 'red' ; //toggling wardLight
    else wardColorState = 'off';
        
        wardLight(wardColorState);
     // here state can be off / red.
}

//PatientPresencelight Flicker
function presenceIndicationFlicker() 
{
    if (presenceColorState === 'off') presenceColorState = 'red' ; //toggling wardLight
    else presenceColorState = 'off';
        
        presenceIndication(presenceColorState);
     // here state can be off / red.
}

//Presencelight Flicker
////////// SERVICES \\\\\\\\\\\\\\\\\\\

//this is a function to generate beep
//Description:- Whenever patient calls nurse its a sound indication to confirm that the call is happend. or any kind of error also generate sound
//inputs:- delay in milliseconds (the duration of how long the sound will be)
//outputs:- none
    
function soundIndication(duration){
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
            },100); //set timeout can not be on variable
          }
}, function(err, result){
    if(err){
        console.log("PWM file can not be openned");
    }
});
}

//This is a function to turn on ward light. 
// Description:- this function takes color name as input and turn on the respective pins to turn on that color
// inputs :- 'red', 'green', 'blue', 'yellow', 'pink', 'white', default no color
// outputs:- none
function presenceIndication(color){
    
        switch (color) {
            case 'red': // red color
            b.digitalWriteSync(presenceIndicationRed,  b.HIGH);
            b.digitalWriteSync(presenceIndicationGreen, b.LOW);
            break;
            case 'green': // green color
            b.digitalWriteSync(presenceIndicationRed,  b.LOW);
            b.digitalWriteSync(presenceIndicationGreen, b.HIGH);
            break;
            default:
            b.digitalWriteSync(presenceIndicationRed,  b.LOW);
            b.digitalWriteSync(presenceIndicationGreen, b.LOW);
        }
       // console.log("presence Indication: " + color);
}

//This is a function to turn on ward light. 
// Description:- this function takes color name as input and turn on the respective pins to turn on that color
// inputs :- 'red', 'green', 'blue', 'yellow', 'pink', 'white', default no color
// outputs:- none
function wardLight(color){
    
    switch (color) {
        case 'red': // red color
        b.digitalWriteSync(wardLightRed,  b.HIGH);
        b.digitalWriteSync(wardLightBlue, b.LOW);
        b.digitalWriteSync(wardLightGreen, b.LOW);
        break;
        case 'green': // green color
        b.digitalWriteSync(wardLightRed,  b.LOW);
        b.digitalWriteSync(wardLightBlue, b.LOW);
        b.digitalWriteSync(wardLightGreen, b.HIGH);
        break;
        case 'blue': // blue color
        b.digitalWriteSync(wardLightRed,  b.LOW);
        b.digitalWriteSync(wardLightBlue, b.HIGH);
        b.digitalWriteSync(wardLightGreen, b.LOW);
        break;
        case 'pink': // pink color
        b.digitalWriteSync(wardLightRed,  b.HIGH);
        b.digitalWriteSync(wardLightBlue, b.HIGH);
        b.digitalWriteSync(wardLightGreen, b.LOW);
        break;
        case 'cyan': // cyan color
        b.digitalWriteSync(wardLightRed,  b.LOW);
        b.digitalWriteSync(wardLightBlue, b.HIGH);
        b.digitalWriteSync(wardLightGreen, b.HIGH);
        break;
        case 'yellow': // yellow color
        b.digitalWriteSync(wardLightRed,  b.HIGH);
        b.digitalWriteSync(wardLightBlue, b.LOW);
        b.digitalWriteSync(wardLightGreen, b.HIGH);
        break;
        case 'white': // yellow color
        b.digitalWriteSync(wardLightRed,  b.HIGH);
        b.digitalWriteSync(wardLightBlue, b.HIGH);
        b.digitalWriteSync(wardLightGreen, b.HIGH);
        break;
        default:
        b.digitalWriteSync(wardLightRed,  b.LOW);
        b.digitalWriteSync(wardLightBlue, b.LOW);
        b.digitalWriteSync(wardLightGreen, b.LOW);
    }
    // console.log("ward light:" + color);
        
}

