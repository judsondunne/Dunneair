const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const morgan = require('morgan');
const path = require('path'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server); 

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.render('index');
});

app.use((req, res) => {
    res.status(404).render('404', { title: '404 not found' });
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('stream', (audioData) => {
        console.log('Received stream data from a client'); // Debug log
        socket.broadcast.emit('stream', audioData);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(3000, '0.0.0.0', () => { 
    console.log('Server is listening on port 3000');
});





