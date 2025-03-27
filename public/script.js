const socket = new WebSocket("ws://localhost:3000");
let peerConnection, dataChannel, encryptionKey, decryptionKey;
let offset = 0,
  paused = false;
let receivedChunks = [];
let receivedFileName = "";
let receivedFileSize = 0;
const chunkSize = 16384;

const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const connectionStatus = document.getElementById("connectionStatus");

document.getElementById("connect").addEventListener("click", createConnection);
document.getElementById("sendFile").addEventListener("click", sendFile);

async function generateEncryptionKey() {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptChunk(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );
  return { encryptedData, iv };
}

async function decryptChunk(encryptedData, iv, key) {
  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedData
  );
}

async function createConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  dataChannel = peerConnection.createDataChannel("fileTransfer");
  dataChannel.binaryType = "arraybuffer";

  dataChannel.onopen = () => {
    console.log("✅ DataChannel Opened!");
    connectionStatus.innerText = "🟢 Connected!";
    connectionStatus.classList.add("connected");
    document.getElementById("connect").disabled = true;
    document.getElementById("sendFile").disabled = false;
  };

  dataChannel.onclose = () => {
    console.warn("⚠️ DataChannel Closed!");
    connectionStatus.innerText = "🔴 Not Connected";
    connectionStatus.classList.remove("connected");
    document.getElementById("connect").disabled = false;
    document.getElementById("sendFile").disabled = true;
    document.getElementById("pause").disabled = true;
    document.getElementById("resume").disabled = true;
  };

  dataChannel.onmessage = receiveFile;

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({ candidate: event.candidate }));
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.send(JSON.stringify({ offer }));
}

socket.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  if (message.offer) {
    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({ candidate: event.candidate }));
      }
    };

    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      dataChannel.binaryType = "arraybuffer";
      dataChannel.onopen = () => {
        connectionStatus.innerText = "🟢 Connected!";
        connectionStatus.classList.add("connected");
        document.getElementById("connect").disabled = true;
        document.getElementById("sendFile").disabled = true;
        document.getElementById("pause").disabled = true;
        document.getElementById("resume").disabled = true;
      };
      dataChannel.onclose = () => {
        console.warn("⚠️ DataChannel Closed!");
        connectionStatus.innerText = "🔴 Not Connected";
        connectionStatus.classList.remove("connected");
        document.getElementById("connect").disabled = false;
        document.getElementById("sendFile").disabled = true;
        document.getElementById("pause").disabled = true;
        document.getElementById("resume").disabled = true;
      };
      dataChannel.onmessage = receiveFile;
    };

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(message.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.send(JSON.stringify({ answer }));
  }

  if (message.answer) {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(message.answer)
    );
  }

  if (message.candidate) {
    await peerConnection.addIceCandidate(
      new RTCIceCandidate(message.candidate)
    );
  }
};

async function sendFile() {
  document.getElementById("pause").addEventListener("click", pauseTransfer);
  document.getElementById("resume").addEventListener("click", resumeTransfer);

  encryptionKey = await generateEncryptionKey();
  const exportedKey = await crypto.subtle.exportKey("raw", encryptionKey);
  dataChannel.send(
    JSON.stringify({
      type: "encryptionKey",
      key: Array.from(new Uint8Array(exportedKey)),
    })
  );

  const file = fileInput.files[0];
  if (!file) return alert("No file selected!");

  document.getElementById("pause").disabled = false;
  document.getElementById("sendFile").disabled = true;
  paused = false;
  offset = 0;
  dataChannel.send(
    JSON.stringify({ type: "fileMetadata", name: file.name, size: file.size })
  );

  function sendNextChunk() {
    if (paused || offset >= file.size) return;
    const slice = file.slice(offset, offset + chunkSize);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const { encryptedData, iv } = await encryptChunk(
        event.target.result,
        encryptionKey
      );

      if (dataChannel.bufferedAmount < 65536) {
        dataChannel.send(JSON.stringify({ type: "chunk", iv: Array.from(iv) }));
        dataChannel.send(encryptedData);
        offset += chunkSize;
        progressBar.value = Math.round((offset / file.size) * 100);
        sendNextChunk();
      } else {
        setTimeout(sendNextChunk, 100); // Handle queue overflow
      }
    };
    reader.readAsArrayBuffer(slice);
  }

  function pauseTransfer() {
    paused = true;
    document.getElementById("pause").disabled = true;
    document.getElementById("resume").disabled = false;
    console.log("⏸ Transfer Paused");
  }

  function resumeTransfer() {
    paused = false;
    document.getElementById("pause").disabled = false;
    document.getElementById("resume").disabled = true;
    console.log("▶️ Transfer Resumed");
    sendNextChunk(); // Resume sending chunks
  }

  sendNextChunk();
}

async function receiveFile(event) {
  if (typeof event.data === "string") {
    const message = JSON.parse(event.data);

    if (message.type === "encryptionKey") {
      decryptionKey = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(message.key),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
    } else if (message.type === "fileMetadata") {
      receivedFileName = message.name;
      receivedFileSize = message.size;
      receivedChunks = [];
      progressBar.value = 0;
      status.innerText = `Receiving: ${message.name}`;
    } else if (message.type === "chunk") {
      // Save IV for next decryption
      receivedChunks.push({ iv: message.iv });
    }
  } else {
    // Actual chunk data received
    const lastChunk = receivedChunks[receivedChunks.length - 1];
    lastChunk.data = event.data;
    updateProgress();
  }
}

async function updateProgress() {
  const receivedSize = receivedChunks.reduce(
    (acc, chunk) => acc + (chunk.data?.byteLength || 0),
    0
  );
  progressBar.value = Math.round((receivedSize / receivedFileSize) * 100);

  if (receivedSize >= receivedFileSize) {
    await saveReceivedFile();
  }
}

async function saveReceivedFile() {
  const decryptedChunks = [];

  for (const chunk of receivedChunks) {
    const decryptedData = await decryptChunk(
      chunk.data,
      new Uint8Array(chunk.iv),
      decryptionKey
    );
    decryptedChunks.push(decryptedData);
  }

  const finalFile = new Blob(decryptedChunks);
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(finalFile);
  downloadLink.download = receivedFileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  status.innerText = `✅ File Received: ${receivedFileName}`;
}
