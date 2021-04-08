//<script type="module" src="/main.js"></script>
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

//Initialize Firestore
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();

const showSessNotes = document.getElementById('showSessNotes');

//Click show note button. Looks at ID entered 
// and matches it with the ID of the note the doctor entered
// If it's a match, it'll show the note in the table
showSessNotes.onclick = async() => {
    const sessID = document.getElementById('enterSess').value;
    var docRef = firestore.collection("DoctorNotes").doc(sessID);

    let tableNote = document.getElementById('tableNote');

    docRef.get().then((doc) => {
        if (doc.exists) {
            console.log("Document data:", doc.data());
            tableNote.innerHTML = JSON.stringify(doc.data());
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
        }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });

}
