// pages/api/socket.js
import { Server } from "socket.io";

export default function SocketHandler(req, res) {
  // Check if socket.io server is already initialized
  if (res.socket.server.io) {
    console.log("Socket server already running");
    res.end();
    return;
  }

  console.log("Setting up socket server");
  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  // Handle socket connections
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle joining a room
    socket.on("join-room", (roomID) => {
      // Normalize roomID to prevent case/character confusion
      const normalizedRoomID = roomID.toString().trim();

      const roomClients = io.sockets.adapter.rooms.get(normalizedRoomID) || {
        size: 0,
      };
      const numberOfClients = roomClients.size;

      console.log(`Room ${normalizedRoomID} has ${numberOfClients} clients`);

      // These events are sent to the client to handle
      if (numberOfClients === 0) {
        console.log(
          `Creating room ${normalizedRoomID} and emitting room_created socket event`
        );
        socket.join(normalizedRoomID);
        socket.emit("room_created", normalizedRoomID);
      } else if (numberOfClients === 1) {
        console.log(
          `Joining room ${normalizedRoomID} and emitting room_joined socket event`
        );
        socket.join(normalizedRoomID);
        socket.emit("room_joined", normalizedRoomID);
      } else {
        console.log(
          `Can't join room ${normalizedRoomID}, emitting full_room socket event`
        );
        socket.emit("full_room", normalizedRoomID);
      }
    });

    // Handle WebRTC signaling
    socket.on("start_call", (roomID) => {
      const normalizedRoomID = roomID.toString().trim();
      console.log(
        `Broadcasting start_call event to peers in room ${normalizedRoomID}`
      );
      socket.to(normalizedRoomID).emit("start_call");
    });

    socket.on("webrtc_offer", (event) => {
      const normalizedRoomID = event.roomID.toString().trim();
      console.log(
        `Broadcasting webrtc_offer event to peers in room ${normalizedRoomID}`
      );
      socket.to(normalizedRoomID).emit("webrtc_offer", event.sdp);
    });

    socket.on("webrtc_answer", (event) => {
      const normalizedRoomID = event.roomID.toString().trim();
      console.log(
        `Broadcasting webrtc_answer event to peers in room ${normalizedRoomID}`
      );
      socket.to(normalizedRoomID).emit("webrtc_answer", event.sdp);
    });

    socket.on("webrtc_ice_candidate", (event) => {
      const normalizedRoomID = event.roomID.toString().trim();
      console.log(
        `Broadcasting webrtc_ice_candidate event to peers in room ${normalizedRoomID}`
      );
      socket.to(normalizedRoomID).emit("webrtc_ice_candidate", event);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  res.end();
}

// Disable body parsing, we want to handle websockets
export const config = {
  api: {
    bodyParser: false,
  },
};
