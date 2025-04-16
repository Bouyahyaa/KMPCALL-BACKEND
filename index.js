// Import necessary modules
import { Server, Socket } from 'socket.io';
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
      if (data.groupID) {
        socket.leave(data?.groupID);
        socket.to(data?.groupID).emit('userleft', data.userID);
      }
    });
    //  MESSAGE_FROM_CLIENT
    socket.on('MESSAGE', (data) => {
      //find room by group id in socket rooms
      if (data.userID){
        user = clients.find((user) => user.userID === data.userID);
      
        //send solo message
      if (user) {
        console.log(user);
        io.to(user.socketID).emit('new message solo', data);
      }
  } else if (data.groupID) io.in(data.groupID).emit('new message', data);
});

    // Call event
    socket.on('CALL', (data) => {
      const callee = clients.find(
        (client) => client.userID === data.calleeID
      );

      if (callee) {
        callee.isCalling = true;

        if (data.groupID) {
          // Handle group call logic
          socket.to(data.groupID).emit('incomingCall', {
            callerID: data.callerID,
            groupID: data.groupID,
          });
        } else {
          // Handle solo call logic
          socket.to(callee.socketID).emit('incomingCall', {
            callerID: data.callerID,
          });
        }
      }
    });

    // Answer event
    socket.on('ANSWER', (data) => {
      const caller = clients.find(
        (client) => client.userID === data.callerID
      );

      if (caller) {
        // Check if the call is accepted
        const isCallAccepted = data.isAccepted || false;

        // Update the caller's isCalling status
        caller.isCalling = false;

        // Emit different events based on acceptance status
        if (isCallAccepted) {
          // Handle accepted call logic
          socket.to(caller.socketID).emit('callAccepted');
        } else {
          // Handle rejected call logic
          socket.to(caller.socketID).emit('callRejected');
        }
      }
    });

    // End call event
    socket.on('END_CALL', (data) => {
      const otherUser = clients.find(
        (client) => client.userID === data.otherUserID
      );

      if (otherUser) {
        otherUser.isCalling = false;

        if (data.groupID) {
          // Handle group call logic
          socket
            .to(data.groupID)
            .emit('callEnded', { userID: data.otherUserID });
        } else {
          // Handle solo call logic
          socket.to(otherUser.socketID).emit('callEnded');
        }
      }
    });
  });
}

start()