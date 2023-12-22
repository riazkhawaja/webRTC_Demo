const socket = io.connect();
const peerConnection = new RTCPeerConnection();
var alreadyInCall = false;

async function getMedia() {
  var stream = null;

  try {
    const constraints = {
        video: {
            width: 1920,
            height: 1080,
            frameRate: 60,
            facingMode: { ideal: "environment" }
        },
        audio: true
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const localVideo = document.getElementById("local-video");
    if (localVideo) localVideo.srcObject = stream;
    
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  } catch(err) {
    alert(err);
  }
}

getMedia();

socket.on("update-user-list", ({ users }) => {
  const activeUserContainer = document.getElementById("active-user-container");

  users.forEach((socketId) => {
    const userExists = document.getElementById(socketId);
    if (!userExists) {
      const userContainerElement = createUserItemContainer(socketId);
      activeUserContainer.appendChild(userContainerElement);
    }
  });
});

socket.on("remove-user", ({ socketId }) => {
  const userExists = document.getElementById(socketId);

  if (userExists) {
    userExists.remove();
  }
});

socket.on("call-made", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit("make-answer", {
    answer,
    to: data.socket,
  });
});

socket.on("answer-made", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));

  if (!alreadyInCall) {
    callUser(data.socket);
    alreadyInCall = true;
  }
});

peerConnection.ontrack = function ({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) remoteVideo.srcObject = stream;
};

function createUserItemContainer(socketId) {
  const userContainerElement = document.createElement("div");

  const usernameElement = document.createElement("p");

  userContainerElement.setAttribute("class", "active-user");
  userContainerElement.setAttribute("id", socketId);
  usernameElement.setAttribute("class", "username");
  usernameElement.innerHTML = `socket id: ${socketId}`;

  userContainerElement.appendChild(usernameElement);

  userContainerElement.addEventListener("click", () => {
    userContainerElement.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `talking to socket id: ${socketId}`;
    callUser(socketId);
  });
  return userContainerElement;
}


async function callUser(socketId) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("call-user", {
    offer,
    to: socketId,
  });
}