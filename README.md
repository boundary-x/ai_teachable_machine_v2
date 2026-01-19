# 📷 Boundary X - AI Image Recognition (Teachable Machine)

**Boundary X - AI Image Recognition** is a web-based application that utilizes **Google Teachable Machine (Image)** models to classify objects or scenes in real-time.

It seamlessly integrates with **BBC Micro:bit** (and other BLE devices) to physically control hardware based on AI classification results using **Web Bluetooth API**.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Tech](https://img.shields.io/badge/Stack-p5.js%20%7C%20ml5.js%20%7C%20Teachable%20Machine-orange)

## ✨ Key Features

### 1. 🖼️ Teachable Machine Integration (Image)
- **Custom Model Support:** Users can train their own image classification models on [Google Teachable Machine](https://teachablemachine.withgoogle.com/train/image) and load them directly via URL or ID.
- **Smart Square Crop:** The app automatically center-crops the camera feed to a **1:1 aspect ratio (400x400)** before classification. This prevents image distortion (stretching) and ensures high accuracy, matching the training environment of Teachable Machine.

### 2. 🔗 Wireless Control (Web Bluetooth API)
- **Direct Connection:** Connects directly to the browser without additional software using the **Nordic UART Service**.
- **Real-time Transmission:** Sends the recognized **Class Label** as text data to the connected hardware immediately.

### 3. 📱 Responsive & Sticky UI
- **Sticky Canvas:**
    - **Mobile Portrait:** The classification window sticks to the top (`70px`) while you scroll through the control panels.
    - **Mobile Landscape:** The window sticks to the left side to maximize visibility.
- **Camera Controls:** Supports **Front/Rear Camera Switching** and **Mirroring (Flip)** for diverse usage scenarios (e.g., selfie mode vs. object detection).

---

## 📡 Communication Protocol

When the AI classifies an image, it sends the **Class Name (Label)** string followed by a newline character (`\n`) via Bluetooth UART.

**Data Format:**
```text
{Class Name}\n
```

**Examples:**
- **If the trained class is named "Apple":** `Apple\n`
- **If the trained class is named "Banana":** `Banana\n`
- **When classification stops:** `stop\n`


**Tech Stack:**
- **Frontend:** HTML5, CSS3
- **Creative Coding:** p5.js (Canvas, Video handling)
- **AI Engine:** ml5.js (ImageClassifier / Teachable Machine)
- **Connectivity:** Web Bluetooth API (BLE)

**License:**
- Copyright © 2024 Boundary X Co. All rights reserved.
- All rights to the source code and design of this project belong to BoundaryX.
- Web: boundaryx.io
- Contact: https://boundaryx.io/contact
