"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VideoCall from "../components/VideoCall";

export default function Home() {
  const [roomID, setRoomID] = useState("");
  const [generatedRoomID, setGeneratedRoomID] = useState("");
  const [activeRoom, setActiveRoom] = useState(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generate a random room ID
  useEffect(() => {
    // Generate a unique room ID
    const generateRoomID = () => {
      return Math.random().toString(36).substring(2, 15);
    };

    setGeneratedRoomID(generateRoomID());
  }, []);

  // Check URL for room ID when component mounts
  useEffect(() => {
    const room = searchParams.get("room");
    if (room) {
      setRoomID(room);
      joinRoom(room);
    }
  }, [searchParams]);

  const createRoom = () => {
    try {
      const newRoomID = generatedRoomID;
      setActiveRoom(newRoomID);

      // Update URL without refreshing
      router.push(`/?room=${newRoomID}`);
    } catch (err) {
      setError("Failed to create room");
      console.error("Error creating room:", err);
    }
  };

  const joinRoom = (roomToJoin = roomID) => {
    try {
      if (!roomToJoin.trim()) {
        setError("Please enter a room ID");
        return;
      }

      setIsJoiningRoom(true);
      setActiveRoom(roomToJoin);

      // Update URL without refreshing
      router.push(`/?room=${roomToJoin}`);
    } catch (err) {
      setError("Failed to join room");
      console.error("Error joining room:", err);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const leaveRoom = () => {
    setActiveRoom(null);
    router.push("/");
  };

  return (
    <div className="container">
      <h1>Next.js WebRTC Video Call</h1>

      {error && (
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {!activeRoom ? (
        <div className="room-selection">
          <div className="create-room">
            <h2>Create a New Room</h2>
            <p>Room ID: {generatedRoomID}</p>
            <button onClick={createRoom} className="create-room-btn">
              Create Room
            </button>
          </div>

          <div className="join-room">
            <h2>Join an Existing Room</h2>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomID}
              onChange={(e) => setRoomID(e.target.value)}
              className="room-input"
            />
            <button
              onClick={() => joinRoom()}
              disabled={isJoiningRoom}
              className="join-room-btn"
            >
              {isJoiningRoom ? "Joining..." : "Join Room"}
            </button>
          </div>
        </div>
      ) : (
        <div className="active-room">
          <VideoCall roomID={activeRoom} />
          <button onClick={leaveRoom} className="leave-room-btn">
            Leave Room
          </button>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }

        h1 {
          text-align: center;
          margin-bottom: 40px;
        }

        .error-container {
          background-color: #ffeeee;
          border: 1px solid #ff4d4f;
          border-radius: 4px;
          padding: 10px 20px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-container button {
          background-color: transparent;
          border: 1px solid #ff4d4f;
          color: #ff4d4f;
          border-radius: 4px;
          padding: 5px 10px;
          cursor: pointer;
        }

        .room-selection {
          display: flex;
          flex-wrap: wrap;
          gap: 40px;
        }

        .create-room,
        .join-room {
          flex: 1;
          min-width: 300px;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .room-input {
          width: 100%;
          padding: 10px;
          margin-bottom: 20px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
        }

        button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .create-room-btn {
          background-color: #1890ff;
          color: white;
        }

        .join-room-btn {
          background-color: #52c41a;
          color: white;
        }

        .leave-room-btn {
          background-color: #ff4d4f;
          color: white;
          margin-top: 20px;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .active-room {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}