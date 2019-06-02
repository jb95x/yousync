
var seekSliderInUse = false;
var seekDisplay = document.getElementById("timedisplay");
var seekSlider = document.getElementById("playerslider");
var playButton = document.getElementById("playButton");
var volumeSlider = document.getElementById("volumeslider");
var volumeButton = document.getElementById("volumeButton");

function currentSeek(){
    let currentTime = Date.now()/1000;
    let difference = Math.floor(currentTime - lastTime);
    let result = seek + difference;
    return result;
}

function twoDigit(number){
    return number < 10 ? "0" + number : number;
}

function timerFormat(time){
    let h = Math.floor(time / 3600);
    let m = Math.floor((time - 3600*h) / 60);
    let s = Math.floor(time - 3600*h - 60*m);
    return twoDigit(h) + ":" + twoDigit(m) + ":" + twoDigit(s);
}

function playerSliderInput(){
    seekDisplay.innerHTML = timerFormat(seekSlider.value) + " / " + timerFormat(duration);
}

function playerSliderDown(){
    seekSliderInUse = true;
}
function playerSliderUp(){
    if(connected){
        let packet = {};
        packet.seek = seekSlider.value;
        socket.emit('seek', packet);
    } else {
        updateSeek(seekSlider.value);
        player.seekTo(seekSlider.value, true);
    }
    seekSliderInUse = false;
}

function initPlayerSlider(){
    seekSlider.max = Math.floor(duration);
}

function updateSeekDisplay(){
    if(gotDuration && playerState == 1){
        if(!seekSliderInUse){
            let currentTime = currentSeek();
            seekDisplay.innerHTML = timerFormat(currentTime) + " / " + timerFormat(duration);
            seekSlider.value = Math.floor(currentTime);
        }
    }
}

function buttonState(){
    if(playerState == -1 || playerState == 2 || playerState == 5){
        playButton.innerHTML = "▶️"
    } else if(playerState == 0){
        playButton.innerHTML = "🔄"
    } else if(playerState == 1){
        playButton.innerHTML = "⏸️"
    }
}

function initVolumeButton(){
    if(player.isMuted()){
        volumeButton.innerHTML = "🔇"
    } else {
        volumeButton.innerHTML = "🔊"
    }
    volumeSlider.value = player.getVolume();
}

function changeVolume(){
    player.setVolume(volumeSlider.value)
}

function onClickVolumeButton(){
    if(player.isMuted()){
        player.unMute()
        volumeButton.innerHTML = "🔊"
    } else {
        player.mute();
        volumeButton.innerHTML = "🔇"
    }
}

function onClickPlayButton(){
    let packet = {};
    if(playerState == -1 || playerState == 2){
        if(connected){
            packet.seek = seek;
            socket.emit('play', packet);
        } else {
            updateSeek(seek);
            player.playVideo();
        }
    } else if(playerState == 0){
        socket.emit('restart');
    } else if(playerState == 1){
        if(connected){
            packet.seek = player.getCurrentTime()
            socket.emit('pause', packet);
        } else {
            updateSeek(player.getCurrentTime());
            player.pauseVideo();
        }
    } else if(playerState == 5){
        if(connected){
            packet.seek = seek;
            socket.emit('play', packet);
        } else {
            updateSeek(seek);
            player.playVideo();
        }
    }
}

setInterval(updateSeekDisplay, 1000);