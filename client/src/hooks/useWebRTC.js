import { useEffect, useRef, useState, useCallback } from 'react';
import socketService from '../services/socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (classId, user) => {
  const [localStream, setLocalStream] = useState(null);
  const [localScreenStream, setLocalScreenStream] = useState(null);
  const [peers, setPeers] = useState({});
  
  const peersRef = useRef({}); 
  const localStreamRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const isJoinedRef = useRef(false);
  const isCleaningUp = useRef(false);
  
  const socket = socketService.socket;

  // Initialize media (Camera/Mic)
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      throw err;
    }
  }, []);

  // Stop media
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalScreenStream(null);
      localScreenStreamRef.current = null;
    }
  }, []);

  // Share Screen
  const shareScreen = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      setLocalScreenStream(screenStream);
      localScreenStreamRef.current = screenStream;

      Object.values(peersRef.current).forEach(({ pc }) => {
        screenStream.getTracks().forEach(track => {
           pc.addTrack(track, screenStream);
        });
      });

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return screenStream;
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  }, []);

  // Stop Screen Share
  const stopScreenShare = useCallback(async () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        Object.values(peersRef.current).forEach(({ pc }) => {
          const senders = pc.getSenders();
          const sender = senders.find(s => s.track === track);
          if (sender) pc.removeTrack(sender);
        });
      });
      setLocalScreenStream(null);
      localScreenStreamRef.current = null;
    }
  }, []);

  // Create PeerConnection
  const createPeerConnection = useCallback((targetSocketId, initiate = false, userInfo = null) => {
    // Prevent creating connections during cleanup
    if (isCleaningUp.current) return null;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(track => {
         pc.addTrack(track, localScreenStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && !isCleaningUp.current) {
        socket.emit('webrtc-ice-candidate', {
          classId,
          candidate: event.candidate,
          targetSocketId,
        });
      }
    };

    pc.ontrack = (event) => {
      if (isCleaningUp.current) return;
      const stream = event.streams[0];
      
      setPeers(prev => {
        const existingPeer = prev[targetSocketId] || { streams: [], user: userInfo };
        const existingStreams = existingPeer.streams;
        
        if (!existingStreams.find(s => s.id === stream.id)) {
           return {
             ...prev,
             [targetSocketId]: { 
               ...existingPeer, 
               streams: [...existingStreams, stream], 
               pc 
             }
           };
        }
        return prev;
      });
    };

    if (initiate) {
      pc.onnegotiationneeded = async () => {
        if (isCleaningUp.current) return;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-offer', {
            classId,
            offer,
            targetSocketId,
          });
        } catch (err) {
          console.error('Error creating offer', err);
        }
      };
    }

    peersRef.current[targetSocketId] = { pc, user: userInfo };

    return pc;
  }, [classId, socket]);

  // Join room
  const joinRoom = useCallback(() => {
    if (!socket || !classId || !localStreamRef.current || isJoinedRef.current) return;
    
    socket.emit('join-live-class', {
      classId,
      userId: user._id,
      username: user.username,
      role: user.role
    });
    isJoinedRef.current = true;
    console.log('Joined room:', classId);
  }, [socket, classId, user]);

  // Effect: Setup socket listeners - runs once when component mounts
  useEffect(() => {
    if (!socket || !classId) return;
    
    isCleaningUp.current = false;

    const handleUserJoined = async ({ socketId, username, role }) => {
      if (isCleaningUp.current) return;
      console.log(`User joined: ${username} (${role})`);
      const pc = createPeerConnection(socketId, true, { username, role });
      if (pc) {
        setPeers(prev => ({
          ...prev,
          [socketId]: { streams: [], pc, user: { username, role } }
        }));
      }
    };

    const handleExistingUsers = async ({ users }) => {
      if (isCleaningUp.current) return;
      console.log('Existing users in room:', users);
      users.forEach(({ socketId, username, role }) => {
        const pc = createPeerConnection(socketId, true, { username, role });
        if (pc) {
          setPeers(prev => ({
            ...prev,
            [socketId]: { streams: [], pc, user: { username, role } }
          }));
        }
      });
    };

    const handleOffer = async ({ offer, senderSocketId }) => {
      if (isCleaningUp.current) return;
      console.log('Received offer from:', senderSocketId);
      let pc = peersRef.current[senderSocketId]?.pc;
      if (!pc) {
        pc = createPeerConnection(senderSocketId, false);
        if (!pc) return;
        setPeers(prev => ({ 
           ...prev, 
           [senderSocketId]: { ...prev[senderSocketId], pc } 
        }));
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc-answer', {
        classId,
        answer,
        targetSocketId: senderSocketId,
      });
    };

    const handleAnswer = async ({ answer, senderSocketId }) => {
      if (isCleaningUp.current) return;
      console.log('Received answer from:', senderSocketId);
      const pc = peersRef.current[senderSocketId]?.pc;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ candidate, senderSocketId }) => {
      if (isCleaningUp.current) return;
      const pc = peersRef.current[senderSocketId]?.pc;
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      }
    };

    const handleUserLeft = ({ socketId }) => {
      console.log('User left:', socketId);
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].pc.close();
        delete peersRef.current[socketId];
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[socketId];
          return newPeers;
        });
      }
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('existing-users', handleExistingUsers);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);

    return () => {
      isCleaningUp.current = true;
      
      socket.off('user-joined', handleUserJoined);
      socket.off('existing-users', handleExistingUsers);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
      
      if (isJoinedRef.current) {
        socket.emit('leave-live-class', { classId, userId: user._id, username: user.username });
        isJoinedRef.current = false;
      }
      
      Object.values(peersRef.current).forEach(({ pc }) => {
        try { pc.close(); } catch (e) {}
      });
      peersRef.current = {};
      
      // Stop streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach(track => track.stop());
        localScreenStreamRef.current = null;
      }
    };
  }, [classId, user._id, user.username, user.role, socket, createPeerConnection]);

  // Effect: Join room when stream is ready
  useEffect(() => {
    if (localStream && !isJoinedRef.current) {
      joinRoom();
    }
  }, [localStream, joinRoom]);

  return {
    localStream,
    localScreenStream,
    peers,
    startLocalStream,
    stopLocalStream,
    shareScreen,
    stopScreenShare
  };
};
