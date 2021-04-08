import './style.css';
import firebase from 'firebase/app';
import 'firebase/firestore';

//Initialize Firebase components
const firebaseConfig = {
  apiKey: "AIzaSyDb78mUm4eP5se089AZrY68aHdKiXQ_-iA",
  authDomain: "webrtc-cloudproj.firebaseapp.com",
  projectId: "webrtc-cloudproj",
  storageBucket: "webrtc-cloudproj.appspot.com",
  messagingSenderId: "69666192175",
  appId: "1:69666192175:web:6cef61a4fd01ca4435bfda"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

//STUN servers to be used
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

//For generating ICE candidates 
const pc = new RTCPeerConnection(servers);

//Videostreams
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

const patientButton = document.getElementById('patientButton');

const muteAudio = document.getElementById('muteAudio');
const muteVideo = document.getElementById('muteVideo');


//Mutes audio
let isAudio = true
muteAudio.onclick = async () => {
    isAudio = !isAudio
    localStream.getAudioTracks()[0].enabled = isAudio
}

//Mutes video
let isVideo = true
muteVideo.onclick = async () => {
    isVideo = !isVideo
    localStream.getVideoTracks()[0].enabled = isVideo
}

// 1. Setup media sources
webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
  hangupButton.disabled = false;
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};
