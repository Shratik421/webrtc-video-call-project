// components/VideoCall.js
'use client'
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import {
  rtcConfig,
  getLocalStream,
  createPeerConnection,
  addLocalTracks,
  createOffer,
  handleOffer,
  handleAnswer,
  addIceCandidate,
} from "../utils/webrtc";

export default function VideoCall({ roomID }) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("Initializing...");

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        // Make sure socket server is running
        await fetch("/api/socket");

        socketRef.current = io();

        socketRef.current.on("connect", () => {
          setSocketConnected(true);
          setStatus("Connected to signaling server");

          // Join the room when socket is connected
          socketRef.current.emit("join-room", roomID);
        });

        socketRef.current.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
          setError("Failed to connect to signaling server");
          setStatus("Connection failed");
        });

        // Room events
        socketRef.current.on("room_created", () => {
          setStatus("Waiting for someone to join...");
        });

        socketRef.current.on("room_joined", () => {
          setStatus("Connected to room, starting call...");
          socketRef.current.emit("start_call", roomID);
        });

        socketRef.current.on("full_room", () => {
          setError("The room is full, please try another room");
          setStatus("Room full");
        });

        // Call signaling
        socketRef.current.on("start_call", handleStartCall);
        socketRef.current.on("webrtc_offer", handleWebRTCOffer);
        socketRef.current.on("webrtc_answer", handleWebRTCAnswer);
        socketRef.current.on("webrtc_ice_candidate", handleWebRTCIceCandidate);

        return () => {
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
        };
      } catch (err) {
        console.error("Failed to initialize socket:", err);
        setError("Failed to initialize connection");
        setStatus("Setup failed");
      }
    };

    initSocket();
  }, [roomID]);

  // Initialize local stream
  useEffect(() => {
    const setupMediaStream = async () => {
      try {
        if (!socketConnected) return;

        setStatus("Accessing camera and microphone...");
        const { stream, error: mediaError } = await getLocalStream();

        if (mediaError) {
          setError(mediaError);
          setStatus("Media access failed");
          return;
        }

      localStreamRef.current = stream.clone();

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          setStatus("Camera and microphone ready");
        }
      } catch (err) {
        console.error("Error setting up media stream:", err);
        setError("Failed to access media devices");
        setStatus("Setup failed");
      }
    };

    setupMediaStream();
  }, [socketConnected]);

  // WebRTC handlers
 const handleStartCall = async () => {
   try {
     setStatus("Call starting...");

     // Check if local stream is available
     if (!localStreamRef.current) {
       // Try to initialize the stream if it's not available
       const { stream, error: mediaError } = await getLocalStream();

       if (mediaError) {
         setError(mediaError);
         setStatus("Media access failed");
         return;
       }

       localStreamRef.current = stream;

       if (localVideoRef.current) {
         localVideoRef.current.srcObject = stream;
       }
     }

     // Verify stream is available before proceeding
     if (!localStreamRef.current) {
       throw new Error("Cannot start call without media access");
     }

     // Create and configure RTCPeerConnection
     peerConnectionRef.current = createPeerConnection(
       handleIceCandidate,
       handleTrackEvent
     );

     // Add local tracks to the connection
     addLocalTracks(peerConnectionRef.current, localStreamRef.current);

     // Create and send offer
     const offer = await createOffer(peerConnectionRef.current);
     socketRef.current.emit("webrtc_offer", {
       roomID,
       sdp: offer,
     });

     setIsCallStarted(true);
     setStatus("Calling...");
   } catch (err) {
     console.error("Error starting call:", err);
     setError("Failed to start call: " + err.message);
     setStatus("Call failed");
   }
 };

 const handleWebRTCOffer = async (offer) => {
   try {
     if (isCallStarted) return;
     setStatus("Incoming call...");

     // Check if local stream is available
     if (!localStreamRef.current) {
       // Try to initialize the stream if it's not available
       const { stream, error: mediaError } = await getLocalStream();

       if (mediaError) {
         setError(mediaError);
         setStatus("Media access failed");
         return;
       }

       localStreamRef.current = stream;

       if (localVideoRef.current) {
         localVideoRef.current.srcObject = stream;
       }
     }

     // Verify stream is available before proceeding
     if (!localStreamRef.current) {
       throw new Error("Cannot answer call without media access");
     }

     // Create and configure RTCPeerConnection
     peerConnectionRef.current = createPeerConnection(
       handleIceCandidate,
       handleTrackEvent
     );

     // Add local tracks to the connection
     addLocalTracks(peerConnectionRef.current, localStreamRef.current);

     // Handle offer and create answer
     const answer = await handleOffer(peerConnectionRef.current, offer);
     socketRef.current.emit("webrtc_answer", {
       roomID,
       sdp: answer,
     });

     setIsCallStarted(true);
     setStatus("Connecting...");
   } catch (err) {
     console.error("Error handling offer:", err);
     setError("Failed to process incoming call: " + err.message);
     setStatus("Call failed");
   }
    };
    
  const handleWebRTCAnswer = async (answer) => {
    try {
      await handleAnswer(peerConnectionRef.current, answer);
      setStatus("Call connected");
    } catch (err) {
      console.error("Error handling answer:", err);
      setError("Failed to establish connection");
      setStatus("Connection failed");
    }
  };

  const handleIceCandidate = (event) => {
    if (event.candidate) {
      socketRef.current.emit("webrtc_ice_candidate", {
        roomID,
        candidate: event.candidate,
      });
    }
  };

  const handleWebRTCIceCandidate = async (event) => {
    try {
      if (peerConnectionRef.current) {
        await addIceCandidate(peerConnectionRef.current, event.candidate);
      }
    } catch (err) {
      console.error("Error handling ICE candidate:", err);
    }
  };

  const handleTrackEvent = (event) => {
    remoteStreamRef.current.addTrack(event.track);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      setIsCallConnected(true);
      setStatus("Call connected");
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      // Stop all tracks in the local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // End call
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    setIsCallStarted(false);
    setIsCallConnected(false);
    setStatus("Call ended");
  };

  return (
    <div className="video-call-container">
      <h2>Room: {roomID}</h2>
      <div className="status-container">
        <p className="status">Status: {status}</p>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="video-grid">
        <div className="video-wrapper local-video">
          <h3>Your Video</h3>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>

        {isCallStarted && (
          <div className="video-wrapper remote-video">
            <h3>Remote Video</h3>
            <video ref={remoteVideoRef} autoPlay playsInline />
          </div>
        )}
      </div>

      {isCallConnected && (
        <button onClick={endCall} className="end-call-btn">
          End Call
        </button>
      )}

      <style jsx>{`
        .video-call-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .status-container {
          margin-bottom: 20px;
        }

        .status {
          font-weight: bold;
        }

        .error {
          color: red;
          font-weight: bold;
        }

        .video-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .video-wrapper {
          flex: 1;
          min-width: 300px;
          border: 1px solid #ccc;
          border-radius: 8px;
          overflow: hidden;
        }

        video {
          width: 100%;
          height: auto;
          background-color: #000;
        }

        h3 {
          padding: 10px;
          margin: 0;
          background-color: #f5f5f5;
        }

        .end-call-btn {
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #ff4d4f;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
