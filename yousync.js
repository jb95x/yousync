const connection = module.parent.exports.io;
const superJob = module.parent.exports.superJob;
const globalSettings = module.parent.exports.globalSettings;

//App Initialization
const md5 = require('md5');
//All the shenannigans to get nice info
const ytinfo = require('youtube-info');
//const insane = require('insane');
const appName = 'YouSync';
const io = connection.of('/yousync');
//For Logging
const fs = require('fs');

//App Code
var rooms = {}
var users = {}

//Youtube Regex
function youtubeRegex (){
   return /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;
}

function logFile(logMessage){
    fs.appendFile('yousync_log.txt', logMessage + "\r\n", function (err) {
        if (err) throw err;
        console.log(logMessage);
    });

}

function addVideo(room, id, socket){
    ytinfo(id, (err, videoInfo)=>{
        if(!err){
            room.queue.push(videoInfo); 
            io.in(room.id).emit('notification', {text: videoInfo.title + ' has added to the queue!'});
            logFile(socket.request.connection.remoteAddress + ": Added Video with title: " + videoInfo.title + " -  url: " + videoInfo.url);
        }
    });
}

//Get currentSeek
function currentSeek(room){
    return room.seek + ((Date.now()/1000)- room.lastTime);
}

//Update Room State
function updateRoomState(room, seek, state){
    room.lastTime = Date.now() /1000;
    room.seek = seek;
    room.state = state;
}

//Disconnect user from current room and notify other users
function disconnectHandler(socket) {
    let user = users[socket.id];
    if (user.room) {
        socket.leave(user.room.id);
        delete user.room.players[socket.id];
        io.in(user.room.id).emit('notification', { text: user.username + ' left the room' });
        if (Object.keys(user.room.players).length == 0) delete rooms[user.room.name];
    }
}


//Join a room 
function joinRoom(socket, packet, user, room) {
    if (room.password == md5(packet.password)) {
        //Password is right
        if (user.room && user.room.name != room.name) disconnectHandler(socket);
        user.room = room;
        socket.join(room.id);
        room.players[socket.id] = user;
        let packet = {};
        packet.videoId = room.queue[0].videoId;
        packet.seek =  room.state == 1 ? currentSeek(room) : room.seek;
        packet.state = room.state;
        socket.emit('loadvideo', packet);
        socket.emit('connected');
        socket.emit('notification', { text: 'Room joined!' });
        socket.to(user.room.id).emit('notification', { text: user.username + ' joined the room' });
    } else {
        //Pasword is not right
        socket.emit('notification', { text: 'Wrong Password!' });
    }
}


//Create a new room
function newRoom(socket, packet, user) {
    disconnectHandler(socket);
    let id = md5(packet.room + '_' + packet.password);
    rooms[packet.room] = {};
    rooms[packet.room].password = md5(packet.password);
    rooms[packet.room].name = packet.room;
    rooms[packet.room].id = id;
    rooms[packet.room].seek = packet.seek;
    rooms[packet.room].state = packet.state;
    rooms[packet.room].lastTime =  Date.now() / 1000;
    rooms[packet.room].players = {};
    rooms[packet.room].votes = 0;
    rooms[packet.room].players[socket.id] = user;
    rooms[packet.room].queue = [];
    addVideo(rooms[packet.room], packet.videoId, socket);
    user.room = rooms[packet.room];
    socket.join(id);
    socket.emit('connected');
    socket.emit('notification', { text: 'Room Created! Room Joined!' });
}

//Connection and request handler
function onConnection(socket) {
    //Intialize User
    users[socket.id] = {};
    console.log('a user connected');

    //
    socket.on('joinRoom', (packet) => {
        //Gather info about user and room
        let user = users[socket.id];
        let room = rooms[packet.room];
        if (!user.username) {
            //Generate random name if username not set
            user.username = 'user' +  (1000 + Math.floor(Math.random()*2000));
            user.color = Math.floor(Math.random()*255);
        }

        if (room) {
            // Room Exists
            joinRoom(socket, packet, user, room);
        } else {
            //Room doesn't exist
            newRoom(socket, packet, user);
        }
        superJob(users, appName);
    });

    socket.on('updateUser', (packet) => {
        let user = users[socket.id];
        user.username = packet.username;
        user.color = Math.floor(Math.random()*255);
        socket.emit('notification', { text: 'User Updated!' });
    });

    socket.on('message', (data) => {
        let user = users[socket.id];
        //Check if user is in a room
        if (user.room && globalSettings.chatEnabled) {
            let dateObj = new Date();
            let packet = {};
            packet.date = {};
            packet.date.hours = dateObj.getHours();
            packet.date.minutes = dateObj.getMinutes();
            packet.date.seconds = dateObj.getSeconds();
            packet.username = user.username;
            packet.color = user.color;
            packet.message = data.text;
            io.in(user.room.id).emit('message', packet);
        }
        superJob(users, appName);
    });

    socket.on('play', (data)=>{
        let user = users[socket.id];
        //Check if user is in a room
        if (user.room) {
            updateRoomState(user.room, data.seek, 1);
            let packet = {};
            packet.seek = data.seek;
            io.in(user.room.id).emit('play', packet);
        }
        superJob(users, appName);
    });

    socket.on('pause', (data)=>{
        let user = users[socket.id];
        //Check if user is in a room
        if (user.room) {   
            updateRoomState(user.room, data.seek, 0);
            let packet = {};
            packet.seek = data.seek;
            io.in(user.room.id).emit('pause', packet);
        }
        superJob(users, appName);
    });

    socket.on('addvideo', (data)=>{
        let user = users[socket.id];
        //Check if user is in a room
        if (user.room) {
            let regexResult;
            try{
                regexResult  = youtubeRegex().exec(data.url);
                console.log(regexResult);
                let videoId = regexResult[1];
                addVideo(user.room, videoId, socket);
            } catch(err) {
                //let playlistId = getPlaylistId(url);
            }
            
        }
        superJob(users, appName);
    });


    socket.on('seek', (data)=>{
        let user = users[socket.id];
        //Check if user is in a room
        if (user.room) {
            updateRoomState(user.room, data.seek, 1);
            let packet = {};
            packet.seek = data.seek;
            io.in(user.room.id).emit('seek', packet);
        }
        superJob(users, appName);
    });

    socket.on('restart', ()=>{
        let user = users[socket.id];
        //Check if user is in a room
        if (user.room) {
            updateRoomState(user.room, 0, 1);
            io.in(user.room.id).emit('restart');
        }
        superJob(users, appName);
    });

    socket.on('skip', ()=>{
        let user = users[socket.id];
        if (user.room) {
            let room = user.room;
            if(room.queue.length > 1){
                room.queue.shift();
                updateRoomState(user.room, 0, 1);
                let packet = {};
                packet.videoId = room.queue[0].videoId;
                packet.seek =  0;
                packet.state = 1;
                io.in(user.room.id).emit('loadvideo', packet);
                let notification = user.username + " skipped the video";
                io.in(user.room.id).emit('notification', { text: notification });
            } else {
                socket.emit('notification', { text: 'No video to play next!' });
            }
        }
        superJob(users, appName);
    });

    socket.on('list', ()=>{
        let user = users[socket.id];
        if (user.room) {
            let room = user.room;
            let notification = '##### Video queue of this room #####<br>';
            for(let i = 0; i < room.queue.length; i++){
                notification += '[' + i + ']: <a href="' + room.queue[i].url + '">' + room.queue[i].title + '</a><br>';
            }
            socket.emit('notification', { text: notification });
        }
        superJob(users, appName);
    });

    socket.on('remove', (data)=>{
        let user = users[socket.id];
        if (user.room) {
            let room = user.room;
            if(id == 'all') {
                room.queue.splice(1, room.queue.length-1);
                let notification = user.username + " removed all videos from queue"
                io.in(user.room.id).emit('notification', { text: notification });
            } else if(id > 0 && id < room.queue.length){
                let removedVideo = room.queue.splice(data.index, 1);
                let notification = user.username + " removed the video with id: " + removedVideo;
                io.in(user.room.id).emit('notification', { text: notification });
            }
        }
        superJob(users, appName);
    });

    socket.on('reachedend', ()=>{
        let user = users[socket.id];
        if (user.room) {
            let room = user.room;
            room.votes++;
            if(room.votes >= Object.keys(room.players).length && room.queue.length > 1){
                room.votes = 0;
                room.queue.shift();
                updateRoomState(user.room, 0, 1);
                let packet = {};
                packet.videoId = room.queue[0].videoId;
                packet.seek =  0;
                packet.state = 1;
                io.in(user.room.id).emit('loadvideo', packet);
                let notification = " Playing next video: " + room.queue[0].title;
                io.in(user.room.id).emit('notification', { text: notification });
            }
        }
        superJob(users, appName);
    });

    socket.on('exit', () => {
        let user = users[socket.id];
        if (user.room) {
            disconnectHandler(socket);
            user.room = undefined;
            socket.emit('disconnected');
            socket.emit('notification', { text: 'You got disconnected from the room' });
        } else {
            socket.emit('notification', { text: 'Your not connected to a room' });
        }
        superJob(users, appName);
    });

    socket.on('pingyou', (date) => {
        packet = {};
        packet.ping = Date.now() - date;
        packet.rooms = Object.keys(rooms).length;
        packet.users = Object.keys(users).length;
        socket.emit('pongme', packet);
    });

    socket.on('disconnect', (reason) => {
        disconnectHandler(socket);
        delete users[socket.id];
        superJob(users, appName);
    });


}

io.on('connection', onConnection);