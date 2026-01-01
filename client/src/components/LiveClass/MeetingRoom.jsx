import { useEffect, useState, useRef } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { adminAPI } from '../../services/api';
import socketService from '../../services/socket';

const MeetingRoom = ({ classId, user, onEnd }) => {
  const { localStream, localScreenStream, peers, startLocalStream, stopLocalStream, shareScreen, stopScreenShare } = useWebRTC(classId, user);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoShape, setVideoShape] = useState('rounded');
  const [showParticipants, setShowParticipants] = useState(false);
  const [canUnmute, setCanUnmute] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  
  const [pinnedStream, setPinnedStream] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const socket = socketService.socket;

  // Listen for admin mute commands
  useEffect(() => {
    if (!socket) return;

    const handleForceMute = ({ type }) => {
      if (localStream) {
        localStream.getAudioTracks().forEach(t => t.enabled = false);
        localStream.getVideoTracks().forEach(t => t.enabled = false);
        setMicOn(false);
        setCameraOn(false);
        setCanUnmute(false);
      }
    };

    const handleAllowUnmute = ({ type }) => {
      setCanUnmute(true);
    };

    socket.on('force-mute', handleForceMute);
    socket.on('allow-unmute', handleAllowUnmute);

    return () => {
      socket.off('force-mute', handleForceMute);
      socket.off('allow-unmute', handleAllowUnmute);
    };
  }, [socket, localStream]);

  // Auto-Pin logic
  useEffect(() => {
    Object.entries(peers).forEach(([socketId, peer]) => {
      if (peer.user?.role === 'teacher' || peer.user?.role === 'admin') {
        if (peer.streams.length > 1) {
          const screenStream = peer.streams[peer.streams.length - 1];
          setPinnedStream({ socketId, streamId: screenStream.id });
        } else if (peer.streams.length === 1 && !pinnedStream) {
           setPinnedStream({ socketId, streamId: peer.streams[0].id });
        }
      }
    });
  }, [peers]);

  useEffect(() => {
    if (localScreenStream) {
      setPinnedStream({ socketId: 'local', streamId: localScreenStream.id });
    }
  }, [localScreenStream]);

  // Initial stream & Recording
  useEffect(() => {
    setIsConnecting(true);
    setConnectionError(null);
    
    startLocalStream()
      .then((stream) => {
        setIsConnecting(false);
        if (user.role === 'teacher' || user.role === 'admin') {
          startRecording(stream);
        }
      })
      .catch(err => {
        console.error('Camera/Mic error:', err);
        setIsConnecting(false);
        setConnectionError('Could not access camera/microphone. Please check permissions.');
      });
      
    return () => {
      stopLocalStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
         mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Toggle Mic
  const toggleMic = () => {
    if (!canUnmute && !micOn) {
      alert('You are muted by the host. Please wait for permission.');
      return;
    }
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (!canUnmute && !cameraOn) {
      alert('Your camera is disabled by the host. Please wait for permission.');
      return;
    }
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !cameraOn;
      });
      setCameraOn(!cameraOn);
    }
  };

  // Admin Controls
  const handleMuteAll = () => {
    socket.emit('mute-all', { classId });
  };

  const handleUnmuteAll = () => {
    socket.emit('unmute-all', { classId });
  };

  // Recording
  const startRecording = (stream) => {
    if (!stream) return;
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];
      await handleUpload(blob);
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const handleUpload = async (blob) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('recording', blob, `class_${classId}_${Date.now()}.webm`);
      await adminAPI.uploadClassRecording(classId, formData);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      onEnd();
    }
  };

  const handleEndCall = () => {
    if (user.role === 'teacher' || user.role === 'admin') {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        onEnd();
      }
    } else {
      onEnd();
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      setIsScreenSharing(false);
    } else {
      await shareScreen();
      setIsScreenSharing(true);
    }
  };

  const getShapeClasses = () => {
    switch (videoShape) {
      case 'circle': return 'rounded-full aspect-square';
      case 'square': return 'rounded-none aspect-video';
      default: return 'rounded-2xl aspect-video';
    }
  };

  const getVideoItems = () => {
    const items = [];
    if (localStream) items.push({ id: 'local-cam', stream: localStream, label: 'You (Camera)', isLocal: true, socketId: 'local' });
    if (localScreenStream) items.push({ id: 'local-screen', stream: localScreenStream, label: 'You (Screen)', isLocal: true, isScreen: true, socketId: 'local' });
    
    Object.entries(peers).forEach(([socketId, peer]) => {
      peer.streams.forEach((stream, idx) => {
         const isScreen = peer.streams.length > 1 && idx === peer.streams.length - 1;
         items.push({
           id: `${socketId}-${idx}`,
           stream,
           label: `${peer.user?.username || 'User'} ${isScreen ? '(Screen)' : ''}`,
           socketId,
           isLocal: false,
           isScreen
         });
      });
    });
    
    return items;
  };

  const allItems = getVideoItems();
  const pinnedItem = allItems.find(i => 
    pinnedStream && 
    (pinnedStream.socketId === 'local' ? i.isLocal && i.stream.id === pinnedStream.streamId 
                                       : i.socketId === pinnedStream.socketId && i.stream.id === pinnedStream.streamId)
  );

  // Get participant list
  const participants = [
    { id: 'self', name: user.username, role: user.role, isLocal: true },
    ...Object.entries(peers).map(([socketId, peer]) => ({
      id: socketId,
      name: peer.user?.username || 'User',
      role: peer.user?.role || 'student',
      isLocal: false
    }))
  ];

  if (uploading) return (
     <div className="flex items-center justify-center h-full bg-slate-950 text-white flex-col gap-4">
        <div className="animate-spin text-4xl">⏳</div>
        <p className="text-sm font-bold uppercase tracking-widest">Saving Recording...</p>
     </div>
  );

  if (isConnecting) return (
     <div className="flex items-center justify-center h-full bg-slate-950 text-white flex-col gap-4">
        <div className="animate-pulse text-4xl">📹</div>
        <p className="text-sm font-bold uppercase tracking-widest">Connecting to camera...</p>
        <p className="text-xs text-slate-500">Please allow camera and microphone access</p>
     </div>
  );

  if (connectionError) return (
     <div className="flex items-center justify-center h-full bg-slate-950 text-white flex-col gap-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm font-bold uppercase tracking-widest text-rose-400">{connectionError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-500 text-black rounded-full text-xs font-bold uppercase"
        >
          Retry
        </button>
     </div>
  );

  return (
    <div className="w-full h-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex flex-col relative">
      {/* Admin Controls Panel */}
      {(user.role === 'teacher' || user.role === 'admin') && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700">
            <span className="text-[9px] font-black text-slate-500 uppercase mr-1">Shape:</span>
            <button onClick={() => setVideoShape('rounded')} className={`p-1.5 rounded text-xs ${videoShape === 'rounded' ? 'bg-primary-500 text-black' : 'bg-slate-800 text-slate-400'}`}>◢</button>
            <button onClick={() => setVideoShape('circle')} className={`p-1.5 rounded text-xs ${videoShape === 'circle' ? 'bg-primary-500 text-black' : 'bg-slate-800 text-slate-400'}`}>○</button>
            <button onClick={() => setVideoShape('square')} className={`p-1.5 rounded text-xs ${videoShape === 'square' ? 'bg-primary-500 text-black' : 'bg-slate-800 text-slate-400'}`}>□</button>
          </div>

          <button 
            onClick={() => setShowParticipants(!showParticipants)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${showParticipants ? 'bg-primary-500 text-black border-primary-500' : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'}`}
          >
            <span>👥</span>
            <span className="text-[10px] font-black uppercase">{participants.length}</span>
          </button>
        </div>
      )}

      {/* Participants Sidebar */}
      {showParticipants && (user.role === 'teacher' || user.role === 'admin') && (
        <div className="absolute top-16 left-4 z-30 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest">Participants</h3>
            <button onClick={() => setShowParticipants(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>

          <div className="flex gap-2 mb-4">
            <button 
              onClick={handleMuteAll}
              className="flex-1 px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all"
            >
              🔇 Mute All
            </button>
            <button 
              onClick={handleUnmuteAll}
              className="flex-1 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all"
            >
              🔊 Allow Unmute
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {participants.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                    {p.role === 'teacher' || p.role === 'admin' ? '👨‍🏫' : '👤'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{p.name} {p.isLocal ? '(You)' : ''}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{p.role}</p>
                  </div>
                </div>
                {!p.isLocal && (
                  <button 
                    onClick={() => socket.emit('mute-user', { classId, targetSocketId: p.id })}
                    className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:bg-rose-500 hover:text-white text-xs transition-all"
                    title="Mute User"
                  >
                    🔇
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mute indicator for users */}
      {!canUnmute && user.role !== 'teacher' && user.role !== 'admin' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full">
          <span className="text-[10px] font-black text-amber-400 uppercase">🔇 Muted by Host</span>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        {pinnedItem ? (
             <div className="absolute inset-0 bg-black flex items-center justify-center">
                 <video
                   autoPlay
                   playsInline
                   muted={pinnedItem.isLocal}
                   ref={v => { if (v) v.srcObject = pinnedItem.stream; }}
                   className={`w-full h-full object-contain ${pinnedItem.isLocal && !pinnedItem.isScreen ? 'transform scale-x-[-1]' : ''}`}
                 />
                 <button 
                   onClick={() => setPinnedStream(null)}
                   className="absolute top-4 right-4 bg-slate-800/50 hover:bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md"
                 >
                   Unpin ✕
                 </button>

                 <div className="absolute bottom-4 right-4 w-48 flex flex-col gap-2 z-10">
                    {allItems.filter(i => i !== pinnedItem).map(item => (
                       <div 
                          key={item.id} 
                          className={`w-48 h-28 bg-slate-900 overflow-hidden border border-slate-700 shadow-2xl cursor-pointer hover:border-primary-500 transition-all ${getShapeClasses()}`}
                          onClick={() => setPinnedStream({ socketId: item.socketId === 'local' ? 'local' : item.socketId, streamId: item.stream.id })}
                       >
                          <video
                             autoPlay
                             playsInline
                             muted={item.isLocal}
                             ref={v => { if (v) v.srcObject = item.stream; }}
                             className={`w-full h-full object-cover ${item.isLocal && !item.isScreen ? 'transform scale-x-[-1]' : ''}`}
                           />
                       </div>
                    ))}
                 </div>
             </div>
        ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr h-full overflow-y-auto">
               {allItems.map(item => (
                 <div 
                    key={item.id} 
                    onClick={() => setPinnedStream({ socketId: item.socketId === 'local' ? 'local' : item.socketId, streamId: item.stream.id })}
                    className={`relative bg-slate-900 overflow-hidden border border-slate-700 shadow-lg group cursor-pointer hover:border-primary-500 transition-all ${getShapeClasses()}`}
                 >
                    <video
                      autoPlay
                      playsInline
                      muted={item.isLocal}
                      ref={v => { if (v) v.srcObject = item.stream; }}
                      className={`w-full h-full object-cover ${item.isLocal && !item.isScreen ? 'transform scale-x-[-1]' : ''}`}
                    />
                    <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-widest backdrop-blur-md">
                      {item.label}
                    </div>
                    <button 
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-800/80 rounded-full text-white hover:bg-primary-500"
                      title="Pin to Full Screen"
                    >
                      📌
                    </button>
                 </div>
               ))}
               {allItems.length === 0 && (
                 <div className="col-span-full flex flex-col items-center justify-center text-slate-500 font-bold uppercase tracking-widest gap-4 h-full">
                    <div className="animate-pulse text-4xl">📡</div>
                    <p>Setting up your camera...</p>
                    <p className="text-xs text-slate-600 normal-case">If your video doesn't appear, check camera permissions</p>
                 </div>
               )}
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-20 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center gap-4 z-20 px-4">
         <button 
            onClick={toggleMic}
            className={`h-12 w-12 rounded-full flex items-center justify-center text-xl transition-all ${micOn ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'}`}
            title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
         >
            {micOn ? '🎤' : '🔇'}
         </button>

         <button 
            onClick={toggleCamera}
            className={`h-12 w-12 rounded-full flex items-center justify-center text-xl transition-all ${cameraOn ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'}`}
            title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
         >
             {cameraOn ? '📹' : '📷'}
         </button>

         {(user.role === 'teacher' || user.role === 'admin') && (
           <button 
              onClick={toggleScreenShare} 
              className={`h-12 w-12 rounded-full flex items-center justify-center text-xl transition-all ${isScreenSharing ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
           >
              🖥️
           </button>
         )}

         {isRecording && (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/20 rounded-full border border-rose-500/30">
               <span className="h-2 w-2 bg-rose-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black text-rose-400 uppercase">REC</span>
            </div>
         )}

         <button 
            onClick={handleEndCall} 
            className="h-12 px-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-rose-500/20"
         >
            End Call
         </button>
      </div>
    </div>
  );
};

export default MeetingRoom;
