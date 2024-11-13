import express from 'express';
import { Server } from 'socket.io';
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
const http = require('http');

const EXPRESS_APP = express();
EXPRESS_APP.use(express.urlencoded({ extended: true }));
EXPRESS_APP.use(express.json());
const PORT = process.env.PORT || 5001;
const SERVER = http.createServer(EXPRESS_APP);
SERVER.listen(
  PORT,
  console.log(`Http server running in ${process.env.NODE_ENV} mode on port ${PORT}`),
);
/* // HTTPs server might be needed for WebRTC
const app = require('https').createServer(options, function(request, response) {
  // accept server requests and handle subsequent responses here 
}); */

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error:`);
  SERVER.close(() => process.exit(1));
});

export const io = new Server(SERVER);

io.on('connection', (socket) => {
  console.log('Connection ... ', socket.handshake);
  socket.on('disconnect', () => {
    console.log('Disconnect ... ', socket.handshake);
  });
  socket.on('backToMenu', (gameId) => {});
  socket.on('closeClientSocket', () => {
    socket.conn.close();
  });
});
