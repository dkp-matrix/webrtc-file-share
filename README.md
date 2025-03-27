# 📁 Secure WebRTC File Sharing

A simple yet secure **WebRTC** file-sharing application that allows direct peer-to-peer file transfer using **end-to-end encryption** (AES-GCM). It also includes **WebSockets** for signaling between peers.

## 📌 Features

- 🔗 Peer-to-Peer (P2P) **file transfer** via **WebRTC**
- 🔒 **AES-GCM encryption** for secure file transmission
- 📡 **WebSocket signaling** for establishing peer connections
- 🎛 **Pause & Resume** file transfer functionality
- 📊 Real-time **progress bar** to track file transfer
- 🌐 **STUN server support** for NAT traversal
- ⚡ **Efficient chunk-based file sending** (for large files)

---

## 🏗 Project Structure

```
webrtc-file-share/
│── server.js            # WebSocket signaling server (Node.js)
│── package.json         # Project dependencies
│── public/
│   │── index.html       # Frontend UI
│   │── script.js        # WebRTC logic (connection & file transfer)
│   │── style.css        # Styling for UI
│── README.md            # Documentation (this file)
```

---

## 📌 How WebRTC Works

1. **Signaling (via WebSocket)**
   - The server helps peers exchange **offer**, **answer**, and **ICE candidates** to establish a direct WebRTC connection.
2. **Peer Connection Establishment**
   - Peers communicate directly using `RTCPeerConnection`.
3. **Data Transfer using DataChannels**
   - The `RTCDataChannel` is used for encrypted **file transfer**.
4. **Encryption (AES-GCM)**
   - Before sending, file chunks are **encrypted**.
   - The receiver **decrypts** the data after receiving all chunks.

---

## 🚀 Getting Started

### 1️⃣ Install Dependencies

Make sure you have **Node.js** installed. Then, install dependencies:

```bash
npm install
```

### 2️⃣ Start the WebSocket Server

```bash
npm start
```

This will start a WebSocket signaling server on **http://localhost:3000**.

### 3️⃣ Open the Web App

Open **two browser tabs** and visit:

```
http://localhost:3000
```

1. Click **"🔗 Connect to Peer"** on both tabs.
2. Select a file and click **"📤 Send File"** to transfer securely.

---

## 🔍 How the Flow Works

### **1️⃣ WebSocket Server (Signaling)**

- The server listens for WebSocket **connections** (`ws.on("connection")`).
- When a **peer A** creates an **offer**, it sends it to the WebSocket server.
- The **server forwards** this to **peer B**.
- **Peer B** generates an **answer** and sends it back via WebSocket.

### **2️⃣ WebRTC Peer-to-Peer Connection**

- Peers exchange **ICE candidates** to establish a direct connection.
- **RTCDataChannel** is created to send file data.

### **3️⃣ File Transfer (End-to-End Encrypted)**

- The sender reads the file in **chunks** (`16384 bytes`).
- Each chunk is **encrypted using AES-GCM** before sending.
- The receiver **decrypts and reconstructs** the file.
- After completion, the receiver gets a **download link**.

---

## 🛠 Configuration (STUN Server)

By default, the project uses:

```js
iceServers: [{ urls: "stun:stun.l.google.com:19302" }];
```

To support **NAT traversal** better, replace this with **TURN server credentials** if needed.

---

## 📜 Known Issues & Limitations

1. **No TURN Server**

   - This project only uses a **STUN server**. If peers are behind **symmetric NAT**, they may fail to connect.
   - **Solution:** Use a **TURN server** for relaying traffic.

2. **Single WebSocket Server (No Rooms)**

   - The current WebSocket server forwards messages to **all** connected clients.
   - **Solution:** Implement **room-based signaling**.

3. **Browser Support**
   - This project works best on **Chrome, Edge, and Firefox**.

---

## 🚀 Future Enhancements

- ✅ **TURN Server support** for better connectivity
- ✅ **Multiple peers (Rooms-based WebRTC)**
- ✅ **Better UI/UX**
- ✅ **Drag-and-drop file support**
- ✅ **Progress bar with estimated time remaining**

---

## 📝 License

This project is open-source and free to use! 🚀  
Feel free to contribute and improve. ❤️
