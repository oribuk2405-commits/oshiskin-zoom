const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms = {};

app.get('/', (req, res) => res.send('זום ישראל - שרת פעיל'));

io.on('connection', (socket) => {

  socket.on('join-room', ({ roomCode, user }) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = { users: {} };
    rooms[roomCode].users[socket.id] = { ...user, socketId: socket.id };
    socket.to(roomCode).emit('user-joined', { socketId: socket.id, user: rooms[roomCode].users[socket.id], allUsers: rooms[roomCode].users });
    socket.emit('room-users', { allUsers: rooms[roomCode].users });
    console.log(user.name + ' joined ' + roomCode);
  });

  socket.on('offer', ({ to, offer }) => {
    socket.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('chat-message', ({ roomCode, message, user }) => {
    io.to(roomCode).emit('chat-message', { message, user, time: Date.now() });
  });

  socket.on('emoji', ({ roomCode, emoji, user }) => {
    io.to(roomCode).emit('emoji', { emoji, user });
  });

  socket.on('raise-hand', ({ roomCode, user, position }) => {
    io.to(roomCode).emit('raise-hand', { socketId: socket.id, user, position });
  });

  socket.on('lower-hand', ({ roomCode }) => {
    io.to(roomCode).emit('lower-hand', { socketId: socket.id });
  });

  socket.on('user-muted', ({ roomCode, muted }) => {
    socket.to(roomCode).emit('user-muted', { socketId: socket.id, muted });
  });

  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      if (rooms[roomCode].users[socket.id]) {
        const user = rooms[roomCode].users[socket.id];
        delete rooms[roomCode].users[socket.id];
        io.to(roomCode).emit('user-left', { socketId: socket.id, user });
        if (Object.keys(rooms[roomCode].users).length === 0) delete rooms[roomCode];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server on port ' + PORT));
