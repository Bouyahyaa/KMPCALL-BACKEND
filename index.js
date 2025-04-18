// Import necessary modules
import { Server } from 'socket.io';
import { socket } from './config/envVar.js';


// Define start function for the Socket.IO server
function start() {
  const io = new Server(Number(socket.port), {
    cors: {
      origin: '*',
    },
  });

  console.log(`socket running on port ${socket.port} 🌐`);

  // Initialize clients array
  let clients = [];

  // Initialize user variable
  let user;

  // Connection event
  io.on('connection', (socket) => {
    // Disconnect event
    socket.on('disconnect', () => {

      const disconnectClient = clients.find((client) =>
        client.socketID.includes(socket.id)
      );

      if (disconnectClient) {
        disconnectClient.socketID = disconnectClient.socketID.filter(
          (id) => id !== socket.id
        );

        // If the user was in a call, notify the other user
        if (disconnectClient.isCalling) {
          socket.to(disconnectClient.socketID).emit('callEnded');
        }
      }
    });

    // Connect client event
    socket.on('CONNECT', async (data) => {
      if (data?.SOCKET_ID && data?.userID) {
        console.log(`CONNECTED ${data?.userID}`);

        const clientCheck = clients.find(
          (client) => client?.userID === data?.userID
        );

        if (!clientCheck) {
          clients.push({
            socketID: [data?.SOCKET_ID],
            userID: data?.userID,
            isCalling: false,
          });
        }

        // If a client connects with another device or reconnects
        if (clientCheck && !clientCheck.socketID.includes(data?.SOCKET_ID)) {
          clientCheck.socketID.push(data?.SOCKET_ID);
        }
      }
    });


    // Join room event
    socket.on('JOIN_ROOM', (data) => {
      if (data.groupID) {
        socket.join(data?.groupID);
      }
    });


    // Leave room event
    socket.on('LEAVE_ROOM', (data) => {
      if (data.groupID && data.userID) {
        socket.leave(data?.groupID);
        socket.to(data?.groupID).emit('userleft', data);
        clients = clients.filter(client => client.userID !== data.userID);
      }
    });


    //  MESSAGE_FROM_CLIENT
    socket.on('MESSAGE', (data) => {
      //find room by group id in socket rooms
      if (data.userID){
        user = clients.find((user) => user.userID === data.userID);
      
        //send solo message
      if (user) {
        io.to(user.socketID).emit('new message solo', data);
      }
  } else if (data.groupID) io.in(data.groupID).emit('new message', data);
});
});
}

start()