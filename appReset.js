
for(var i = 0; i < 100; i++)
{
    if(i === 50){
        console.log("Restarting App");
        process.exit(187);
    }else{
        console.log("i = " + i);
    }
}