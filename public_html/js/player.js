var duration = 0;
var seek = 0;
var lastTime = Date.now()/1000;
var currentId = randomVideo();
var gotDuration = false;
var doingCommand = false;
var playerState;
var fastLoad = false;
var connected = false;

// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: currentId, //this video is pretty nice for an intro, maybe i'm gonna make this a random video from a server "db"
    playerVars: { 'controls': 0, 'autoplay': 0, 'disablekb': 1 },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  initVolumeButton();
  setTimeout(()=>{event.target.playVideo()},1000);
}
// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.

function getDuration(event){
  if (gotDuration == false) {
    duration = event.target.getDuration();
    updateSeek(event.target.getCurrentTime());
    initPlayerSlider();
    gotDuration = true;
  }
}

function onPlayerStateChange(event) {
  playerState = event.data;
  buttonState();
  if (playerState == YT.PlayerState.PLAYING) {
    getDuration(event);
  } else if (playerState == YT.PlayerState.PAUSED) {
  } else if (playerState == YT.PlayerState.ENDED) {
    if(connected){
      socket.emit('reachedend');
    } else {
      currentId = randomVideo();
      updateSeek(0);
      player.loadVideoById(currentId, 0, "default");
      gotDuration = false;
    }
  } else if (playerState == YT.PlayerState.BUFFERING) {
  }
  //when seek is done without pausing it pauses right after seek and plays, its a good ideia to send considerate pause seek on demand
}

function updateSeek(newSeek){
  lastTime = Date.now()/1000;
  seek = Number(newSeek);
}

//Server control functions

function loadVideo(packet) {
  updateSeek(packet.seek);
  currentId = packet.videoId;
  if(packet.state == 0){
    fastLoad = true;
    player.pauseVideo();
  } else{
    player.loadVideoById(packet.videoId, packet.seek, "default");
    fastLoad = false;
  }
  gotDuration = false;
}

function restartVideo() {
  updateSeek(0);
  player.seekTo(0, true);
  player.playVideo();
}

function playVideo(packet) {
  updateSeek(packet.seek);
  if(fastLoad){
    player.loadVideoById(currentId, packet.seek, "default");
    fastLoad = false;
  } else {
    player.seekTo(packet.seek, true);
    player.playVideo();
  }
}

function pauseVideo(packet) {
  updateSeek(packet.seek);
  player.seekTo(packet.seek, true);
  player.pauseVideo();
}

function seekVideo(packet) {
  updateSeek(packet.seek);
  player.seekTo(packet.seek, true);
}

//Function for selecting a random video on start

function randomVideo(){
  return videolist[Math.floor(videolist.length*Math.random())];
}

