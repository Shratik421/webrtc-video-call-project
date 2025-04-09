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
      const roomClients = io.sockets.adapter.rooms.get(roomID) || { size: 0 };
      const numberOfClients = roomClients.size;

      // These events are sent to the client to handle
      if (numberOfClients === 0) {
        console.log(
          `Creating room ${roomID} and emitting room_created socket event`
        );
        socket.join(roomID);
        socket.emit("room_created", roomID);
      } else if (numberOfClients === 1) {
        console.log(
          `Joining room ${roomID} and emitting room_joined socket event`
        );
        socket.join(roomID);
        socket.emit("room_joined", roomID);
      } else {
        console.log(
          `Can't join room ${roomID}, emitting full_room socket event`
        );
        socket.emit("full_room", roomID);
      }
    });

    // Handle WebRTC signaling
    socket.on("start_call", (roomID) => {
      console.log(`Broadcasting start_call event to peers in room ${roomID}`);
      socket.to(roomID).emit("start_call");
    });

    socket.on("webrtc_offer", (event) => {
      console.log(
        `Broadcasting webrtc_offer event to peers in room ${event.roomID}`
      );
      socket.to(event.roomID).emit("webrtc_offer", event.sdp);
    });

    socket.on("webrtc_answer", (event) => {
      console.log(
        `Broadcasting webrtc_answer event to peers in room ${event.roomID}`
      );
      socket.to(event.roomID).emit("webrtc_answer", event.sdp);
    });

    socket.on("webrtc_ice_candidate", (event) => {
      console.log(
        `Broadcasting webrtc_ice_candidate event to peers in room ${event.roomID}`
      );
      socket.to(event.roomID).emit("webrtc_ice_candidate", event);
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
