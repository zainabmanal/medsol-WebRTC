import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

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

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');

const codeOff = document.getElementById('codeOff');

const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

const muteAudio = document.getElementById('muteAudio');
const muteVideo = document.getElementById('muteVideo')

const submitButton = document.getElementById('submit')


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
};

//2, Make offer
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
 
  //Subcollections of calls collection
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  //Saves ID to input box
  callInput.value = callDoc.id;
  codeOff.innerHTML = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

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


//4. Mutes Audio
let isAudio = true;
muteAudio.onclick = async () => {
  isAudio = !isAudio
  localStream.getAudioTracks()[0].enabled = isAudio
}

//5. Mutes Video
let isVideo = true;
muteVideo.onclick = async () => {
  isVideo = !isVideo
  localStream.getVideoTracks()[0].enabled = isVideo
}

//6. Save Notes
//Create Event Listener To Allow Form Submission
submitButton.addEventListener("click", (e) => {
  //Prevent Default Form Submission Behavior
  e.preventDefault()
  let docNote = document.getElementById('notes').value;
  let noteID = document.getElementById('noteID').value;
  const noteDB = firestore.collection("DoctorNotes")

      //Access database collection
      noteDB.doc(noteID).set({
          note: docNote
      }).then(function(){
          console.log("Data Saved");
      }).catch(function(error){
          console.error();
      });
});
