# 📷 Boundary X - AI Image Recognition (Teachable Machine)

**Boundary X - AI Image Recognition** is a web-based application that utilizes **Google Teachable Machine (Image)** models to classify objects or scenes in real-time.

It seamlessly integrates with **BBC Micro:bit** (and other BLE devices) to physically control hardware based on AI classification results using **Web Bluetooth API**.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Tech](https://img.shields.io/badge/Stack-p5.js%20%7C%20ml5.js%201.4.0%20%7C%20Teachable%20Machine-orange)

## ✨ Key Features

### 1. 🖼️ Teachable Machine Integration (Image)
- **Custom Model Support:** Users can train their own image classification models on [Google Teachable Machine](https://teachablemachine.withgoogle.com/train/image) and load them directly via URL or ID.
- **Smart Square Crop:** The app automatically center-crops the camera feed to a **1:1 aspect ratio (400x400)** before classification. This prevents image distortion (stretching) and ensures high accuracy, matching the training environment of Teachable Machine.
- **Input Validation:** The model address is checked for whitespace and verified against the actual `model.json` before being handed to the AI engine, so a mistyped or invalid link fails with a clear on-screen message instead of hanging or crashing the page.

### 2. 🔗 Wireless Control (Web Bluetooth API)
- **Direct Connection:** Connects directly to the browser without additional software using the **Nordic UART Service**.
- **Real-time Transmission:** Sends the recognized **Class Label** as text data to the connected hardware immediately.
- **Connection-Aware UI:** The "Load Model" button stays disabled until a device is connected, and automatically re-locks if the connection drops — preventing the app from silently classifying with nothing actually reaching the hardware.

### 3. 📱 Responsive & Sticky UI
- **Sticky Canvas:**
    - **Mobile Portrait:** The classification window sticks to the top (`70px`) while you scroll through the control panels.
    - **Mobile Landscape:** The window sticks to the left side to maximize visibility.
- **Keyboard-Safe Layout:** Layout breakpoints use aspect-ratio rather than raw device orientation, so the on-screen keyboard opening in portrait mode no longer misfires the landscape layout.
- **Camera Controls:** Supports **Front/Rear Camera Switching** and **Mirroring (Flip)** for diverse usage scenarios (e.g., selfie mode vs. object detection).
- On mobile, the camera preview automatically hides while typing the model address and reappears once you're done, so the on-screen keyboard never covers the input field.

---

## 🆕 Recent Updates

- **Upgraded ml5.js 0.5.0 → 1.4.0** (bundled TensorFlow.js upgraded to 4.22.0). Classification latency dropped significantly on mid-range devices (~195ms → ~70ms measured on a Galaxy A54), which also resolved visible camera preview frame drops during recognition.
- Adapted the classification callback to ml5 1.4.0's updated calling convention (`callback(result)` on success, `callback(undefined, error)` on failure), which differs from the previous version.
- Added a **model.json pre-check** before handing a model link to ml5, preventing an unbounded retry loop (and, on some devices, a full browser crash) when an invalid or mistyped model link was entered.
- Added a **classification circuit breaker**: transient failures (camera switching, brief WebGL hiccups) are tolerated and retried after a short cooldown, while a genuinely broken model link stops classification automatically with a clear message instead of failing silently forever.
- Fixed a mobile layout bug where opening the keyboard to type the model address could break the page layout, by switching the responsive breakpoints from `orientation` to `aspect-ratio`.
- The "Load Model" button is now disabled until a Bluetooth device is connected, and re-disabled if the connection drops, to avoid a confusing state where recognition runs but nothing reaches the hardware.
- Model address input now strips whitespace anywhere in the string (not just leading/trailing), and the validation error message hints at checking uppercase/lowercase letters, since Teachable Machine links are case-sensitive.

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
- **AI Engine:** ml5.js 1.4.0 (ImageClassifier / Teachable Machine), TensorFlow.js 4.22.0
- **Connectivity:** Web Bluetooth API (BLE)

**License:**
- Copyright © 2024 Boundary X Co. All rights reserved.
- All rights to the source code and design of this project belong to BoundaryX.
- Web: boundaryx.io
- Contact: https://boundaryx.io/contact
