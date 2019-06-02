const socket = io('/yousync');
var inputBox = $('#inputBox');
var textBox = document.getElementById("textbox-area");

inputBox.keydown((e) => {
    if (e.which === 13) {
        e.preventDefault();
        commandProcessor(inputBox.val());
        inputBox.val('');
    }
});

function commandProcessor(command) {
    let packet = {};
    if (command.startsWith("play")) {
        let args = command.split(" ")
        if (args.length > 1) {
            let url = args[1]
            packet.url = url
            socket.emit('addvideo', packet);
        } else {
            packet.seek = player.getCurrentTime();
            socket.emit('play', packet);
        }
    } else if (command.startsWith("pause")) {
        packet.seek = player.getCurrentTime();
        socket.emit('pause',packet);
    } else if (command.startsWith("restart")) {
        socket.emit('restart');
    } else if (command.startsWith("seek")) {
        let args = command.split(" ")
        if (args.length > 1) {
            packet.seek = args[1];
            socket.emit('seek', packet);
        }
    } else if (command.startsWith("skip")) {
        socket.emit('skip');
    } else if (command.startsWith("list")) {
        socket.emit('list');
    } else if (command.startsWith("remove")) {
        let args = command.split(" ")
        if (args.length > 1) {
            packet.index = args[1];
            socket.emit('remove', packet);
        }
    } else if (command.startsWith("room")) {
        let args = command.split(" ")
        if (args.length > 2) {
            packet.room = args[1];
            packet.password = args[2];
            packet.videoId = currentId;
            packet.seek = player.getCurrentTime();
            packet.state = (playerState == YT.PlayerState.PLAYING ? 1 : 0);
            socket.emit('joinRoom', packet);
            console.log("Rooms are just boxes");
        }
    } else if (command.startsWith("exit")) {
        socket.emit('exit');
    } else if (command.startsWith("setname")) {
        let args = command.split(" ")
        if (args.length > 1) {
            packet.username = args[1];
            socket.emit('updateUser', packet);
        }
    } else {
        packet.text = command;
        socket.emit('message', packet);
    }
}

socket.on('pause', pauseVideo);
socket.on('play', playVideo);
socket.on('restart', restartVideo);
socket.on('seek', seekVideo);
socket.on('loadvideo', loadVideo);
socket.on('message', onMessage);
socket.on('notification', onNotification);

socket.on('connected', ()=>{
    connected = true;
});

socket.on('disconnected', ()=>{
    connected = false;
});

function onMessage(data) {
    textBox.innerHTML += '</br> <font style="color: hsl(' + data.color + ', 100%, 50%)"> <b>[' + data.date.hours + ':' + data.date.minutes + ':' + data.date.seconds + '] ' + data.username + '</b></font> ' + data.message;
    textBox.scrollTop = textBox.scrollHeight;
}

setInterval(() => {
    rtt = Date.now();
    socket.emit('pingyou', rtt);
}, 10000);

socket.on('pongme', (packet) => {
    let ping = Date.now() - rtt;
    document.getElementById('pingviewer').innerHTML = 'Ping: ' + ping + 'ms | Users: ' + packet.users + ' | Rooms: ' + packet.rooms;
});


function onNotification(data){
    textBox.innerHTML += '<br><b>' + data.text + '</b>';
    textBox.scrollTop = textBox.scrollHeight;
}