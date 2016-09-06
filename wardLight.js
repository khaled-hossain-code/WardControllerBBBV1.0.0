///******* Modules ******************\\\
var b = require('bonescript');
var octal = require('octalbonescript'); //load the library
var io = require('socket.io-client');
//var socket = io.connect('http://192.168.1.6:8000'); // my pc
var socket = io.connect('http://192.168.1.22:8000'); // mamshed vai's pc
var os = require( 'os' );

var IP = os.networkInterfaces( ).eth0[0].address;
var payload = {
    IP:IP, //getting from network interfaces file IP='192.168.1.240'
    CallType: 'Normal',
};

var wardLightInterval; //it is a setInterval function
var presenceIndicationInterval; //this one is also a setInterval Function

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
var presencePressed = 0;
var duration = 100; // buzzer duration
var flickerTime = 1000;

///********* pin Assigning ***********\\\
var heartbit = 'USR0';
var userLed1 = 'USR1';
var userLed2 = 'USR2';
var userLed3 = 'USR3';

//rgb led pin assign for ward light
var wardLightRed  = "P9_18"; //10ohm resistor is connected
var wardLightBlue = "P9_26"; // 10ohm resistor is connected
var wardLightGreen = "P9_22"; // 10ohm resistor is connected

var presenceIndicationRed = "P8_7";
var presenceIndicationGreen =  "P8_9";
var callIndicationSound = 'P8_19'; //buzzer

//wardLight Inputs
var pendant_button = "P9_12"; // pendant is the input of patient to call the nurse , this pin is pulled low externally by a 7.5k ohm res
var presence_button = "P9_14"; //presence button is the input of nurse presence, this pin is pulled low externally by a 7.5k ohm res
var cancel_button = "P9_16";


/// ****** Initial/setup Code ****** \\\

/// ******** pinMode setup ***********\\
// setting outputs of onboard LED
b.pinMode(heartbit,b.OUTPUT); // declearing user led 0 as output
b.pinMode(userLed1,b.OUTPUT);
b.pinMode(userLed2,b.OUTPUT);
b.pinMode(userLed3,b.OUTPUT);

// setting outputs of wardlight LED
b.pinMode(wardLightRed,  b.OUTPUT);
b.pinMode(wardLightBlue, b.OUTPUT);
b.pinMode(wardLightGreen, b.OUTPUT);

// setting outputs of Patient Call Point light LED
b.pinMode(presenceIndicationGreen,  b.OUTPUT);
b.pinMode(presenceIndicationRed, b.OUTPUT);

//setting inputs
b.pinMode(pendant_button,b.INPUT); // this input only accepts high input
b.pinMode(presence_button,b.INPUT); // this input only accepts high input
b.pinMode(cancel_button,b.INPUT); // this input only accepts high input


// below code will assign analog output mode to pin and when the pin is ready, it will write 0.5 value.
octal.pinMode(callIndicationSound, octal.ANALOG_OUTPUT, function(err1) {
  
  if (err1) {
    console.error(err1.message); //output any error
    return;
  }
  else {
    console.info("analog output is set");
  }
  
  soundIndication(duration); //indication that device is live
  
});

//Indications that all the devices are working and started
wardLight('green');  // At begining ward light will turned on for 1sec indicating that it is working and device is up
setTimeout(wardLight('off'), 2000);
presenceIndication('green'); // At begining presence indicator will turned on for 1sec indicating that it is working and device is up
setTimeout(presenceIndication('off'),2000);

//after connection server sends an event named connection 
socket.on('connected', function (data) {
  console.log(data.status);
});



///*****************function loop************************ \\\ 
setInterval(hearRate, heartbitRate); //Checking the Heartbit
console.log('HeartBit started');
b.attachInterrupt(pendant_button, true, b.RISING, callNurse);//input of pendant is interrupt driven, RISING, FALLING, CHANGE, whenever from low pin goes to high it calls callNurse function.
console.log("Ready to take input");
b.attachInterrupt(presence_button, true, b.RISING, nursePresence);//input of nurse presence is interrupt driven, RISING, FALLING, CHANGE, whenever from low pin goes to high it calls nursePresence function.
b.attachInterrupt(cancel_button, true, b.RISING, cancelCall); // cancels emergency or bluecode call

 

/// ***************function Definition**********************\\\


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
                //notify server
                payload.CallType = 'Emergency';
                
                socket.emit('Emergency', payload,function(data){
                    console.log(data);
                });
                
                setTimeout(function(){
                    soundIndication(duration);    
                },2*duration);
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
                console.log("Unknown Case ");
        }
        
        console.log(state.description);
}

/////////Button Pressed Events\\\\\\\\\\\\\\\\\\\\\

//this function get called when pendant is pressed, 
// tasks: 1. turn on green ward light,2.sound notification of button press for visible disabled people 3.notify server that pendant is pressed
// input: object with interrupt information, x is the object here
// output: none
function callNurse(x)
{
    // console.log(JSON.stringify(x)); 
    // x is {"pin":{"name":"GPIO1_28","gpio":60,"mux":"gpmc_ben1","eeprom":36,"key":"P9_12","muxRegOffset":"0x078","options":["gpmc_ben1","mii2_col","NA","mmc2_dat3","NA","NA","mcasp0_aclkr","gpio1_28"]},"attached":true}
    
     if(x.value === 1) // x.value gives the value of pin. is it high or low
     {
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
}


//this function get called when nurse presence button is pressed
//tasks:1.turn off ward light, 2.send the presence signal to server
// input: object with interrupt information, x is the object here
// output: none
function nursePresence(y){
    // console.log(JSON.stringify(x)); 
    // y is {"pin":{"name":"GPIO1_28","gpio":60,"mux":"gpmc_ben1","eeprom":36,"key":"P9_12","muxRegOffset":"0x078","options":["gpmc_ben1","mii2_col","NA","mmc2_dat3","NA","NA","mcasp0_aclkr","gpio1_28"]},"attached":true}
    
    if(y.value === 1) // if this condition is not used then at initialization nursePresence runs automatically once
    {
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
        else if(presencePressed > 3)
        {
            //soundIndication(duration);
            console.log("Already Generated BlueCode");
        }
    }
}

//this function get called when cancel is pressed, 
// tasks: 1. turn off ward light,2.turn off patience call point light 3.notify server that call is canceled 
// input: object with interrupt information, x is the object here
// output: none
function cancelCall(z)
{
    // console.log(JSON.stringify(x)); 
    // x is {"pin":{"name":"GPIO1_28","gpio":60,"mux":"gpmc_ben1","eeprom":36,"key":"P9_12","muxRegOffset":"0x078","options":["gpmc_ben1","mii2_col","NA","mmc2_dat3","NA","NA","mcasp0_aclkr","gpio1_28"]},"attached":true}
    
     if(z.value === 1) // x.value gives the value of pin. is it high or low
     {
         presencePressed = 0; //clearing number of time nurse pressed the present button
         
         if(state.value === 2) // if nurse has called for emergency then cancel the emergency call alert
         {
            state.value = 4;  //state 4 means cancel emergency call
            executeState();     
         }else if(state.value === 3) // if nurse has called for bluecode then cancel the blue code alert
         { 
             state.value = 5;
             executeState();
         }
         else{
             console.log("nothing to cancel");
         }
        
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
        
    b.digitalWrite(heartbit, heartState); // here state can be 0 / 1.
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
function soundIndication(milliseconds){ 
    
    b.analogWrite(callIndicationSound, buzzerDutyCycle, buzzerFreq);
    if(milliseconds === 'undefined') milliseconds = 100;
    
    setTimeout(function() {
        b.analogWrite(callIndicationSound, 0);     // Turn off buzzer after milliseconds time 
    }, milliseconds);
}

//This is a function to turn on ward light. 
// Description:- this function takes color name as input and turn on the respective pins to turn on that color
// inputs :- 'red', 'green', 'blue', 'yellow', 'pink', 'white', default no color
// outputs:- none
function presenceIndication(color){
    
        switch (color) {
            case 'red': // red color
            b.digitalWrite(presenceIndicationRed,  b.HIGH);
            b.digitalWrite(presenceIndicationGreen, b.LOW);
            break;
            case 'green': // green color
            b.digitalWrite(presenceIndicationRed,  b.LOW);
            b.digitalWrite(presenceIndicationGreen, b.HIGH);
            break;
            default:
            b.digitalWrite(presenceIndicationRed,  b.LOW);
            b.digitalWrite(presenceIndicationGreen, b.LOW);
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
        b.digitalWrite(wardLightRed,  b.HIGH);
        b.digitalWrite(wardLightBlue, b.LOW);
        b.digitalWrite(wardLightGreen, b.LOW);
        break;
        case 'green': // green color
        b.digitalWrite(wardLightRed,  b.LOW);
        b.digitalWrite(wardLightBlue, b.LOW);
        b.digitalWrite(wardLightGreen, b.HIGH);
        break;
        case 'blue': // blue color
        b.digitalWrite(wardLightRed,  b.LOW);
        b.digitalWrite(wardLightBlue, b.HIGH);
        b.digitalWrite(wardLightGreen, b.LOW);
        break;
        case 'pink': // pink color
        b.digitalWrite(wardLightRed,  b.HIGH);
        b.digitalWrite(wardLightBlue, b.HIGH);
        b.digitalWrite(wardLightGreen, b.LOW);
        break;
        case 'cyan': // cyan color
        b.digitalWrite(wardLightRed,  b.LOW);
        b.digitalWrite(wardLightBlue, b.HIGH);
        b.digitalWrite(wardLightGreen, b.HIGH);
        break;
        case 'yellow': // yellow color
        b.digitalWrite(wardLightRed,  b.HIGH);
        b.digitalWrite(wardLightBlue, b.LOW);
        b.digitalWrite(wardLightGreen, b.HIGH);
        break;
        case 'white': // yellow color
        b.digitalWrite(wardLightRed,  b.HIGH);
        b.digitalWrite(wardLightBlue, b.HIGH);
        b.digitalWrite(wardLightGreen, b.HIGH);
        break;
        default:
        b.digitalWrite(wardLightRed,  b.LOW);
        b.digitalWrite(wardLightBlue, b.LOW);
        b.digitalWrite(wardLightGreen, b.LOW);
    }
    // console.log("ward light:" + color);
        
}

