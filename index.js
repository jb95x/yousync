const readline = require('readline');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = 80;

app.use(express.static(__dirname + '/public_html'));

const appName = 'App Portal';

var globalSettings = {};
globalSettings.chatEnabled = false;
globalSettings.debug = false;

function superJob(users, childAppName) {
    if (Object.keys(users).length > 32) {
        console.log('Holy molly! There where more than 32 people playing ' + childAppName + ' !');
        console.log(users);
        process.exit();
    }
}

exports.superJob = superJob;
exports.globalSettings = globalSettings;
exports.io = io;

var yousync = require('./yousync.js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    if (input == 'chat') {
        globalSettings.chatEnabled = !globalSettings.chatEnabled;
        console.log('Chat: ' + globalSettings.chatEnabled);
    } else if (input == 'debug') {
        globalSettings.debug = !globalSettings.debug;
        console.log('Debug: ' + globalSettings.debug);
    } else if (input == 'exit') {
        process.exit();
    }
});

http.listen(port, () => {
    console.log(appName + ' running on port ' + port);
});

