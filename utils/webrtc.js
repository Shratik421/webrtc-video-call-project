// utils/webrtc.js

// Configuration for STUN/TURN servers (helps with NAT traversal)
export const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// Error handling wrapper for getUserMedia
export const getLocalStream = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    return { stream, error: null };
  } catch (error) {
    console.error("Error accessing media devices:", error);

    // Handle specific errors with user-friendly messages
    let errorMessage = "Failed to access camera and microphone";

    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      errorMessage =
        "Camera or microphone permission denied. Please allow access in your browser settings.";
    } else if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      errorMessage =
        "No camera or microphone found. Please connect a device and try again.";
    } else if (
      error.name === "NotReadableError" ||
      error.name === "TrackStartError"
    ) {
      errorMessage =
        "Your camera or microphone is already in use by another application.";
    } else if (error.name === "OverconstrainedError") {
      errorMessage =
        "The requested camera or microphone settings are not available on your device.";
    }

    return { stream: null, error: errorMessage };
  }
};

// Create a new RTCPeerConnection with error handling
export const createPeerConnection = (onIceCandidate, onTrack) => {
  try {
    const peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.addEventListener("icecandidate", onIceCandidate);
    peerConnection.addEventListener("track", onTrack);

    // Add error handlers
    peerConnection.addEventListener("icecandidateerror", (event) => {
      console.error("ICE candidate error:", event);
    });

    peerConnection.addEventListener("connectionstatechange", () => {
      const state = peerConnection.connectionState;
      console.log(`Connection state changed to: ${state}`);

      if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        console.error("WebRTC connection issue:", state);
      }
    });

    return peerConnection;
  } catch (error) {
    console.error("Error creating peer connection:", error);
    throw new Error(
      "Failed to create peer connection. WebRTC may not be supported in this browser."
    );
  }
};

// Add local stream tracks to peer connection
export const addLocalTracks = (peerConnection, localStream) => {
  try {
    if (!localStream) {
      throw new Error("No local stream available");
    }

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  } catch (error) {
    console.error("Error adding local tracks:", error);
    throw new Error("Failed to add local media to connection");
  }
};

// Create and send an offer
export const createOffer = async (peerConnection) => {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  } catch (error) {
    console.error("Error creating offer:", error);
    throw new Error("Failed to create connection offer");
  }
};

// Handle incoming offer and create answer
export const handleOffer = async (peerConnection, offer) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  } catch (error) {
    console.error("Error handling offer:", error);
    throw new Error("Failed to process incoming connection request");
  }
};

// Handle incoming answer
export const handleAnswer = async (peerConnection, answer) => {
  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  } catch (error) {
    console.error("Error handling answer:", error);
    throw new Error("Failed to establish connection with peer");
  }
};

// Add ICE candidate
export const addIceCandidate = async (peerConnection, candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.error("Error adding ICE candidate:", error);
    // This often fails silently, but we'll log it
  }
};
