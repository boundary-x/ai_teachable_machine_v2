/**
 * sketch.js
 * Boundary X Teachable Machine Controller Logic
 */

// Bluetooth UUIDs for micro:bit UART service
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let bluetoothDevice = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let isConnected = false;
let bluetoothStatus = "연결 대기 중";

// Video and ML variables
let video;
let classifier = null;
let label = "대기 중";
let isClassifying = false;

// Camera control variables
let isFlipped = false;
let facingMode = "user";
let isVideoLoaded = false; 

// UI elements
let modelInput, modelSelect, initializeModelButton, stopClassifyButton;
let flipButton, switchCameraButton, connectBluetoothButton, disconnectBluetoothButton;
let modelStatusDiv;

// 모델 리스트
const modelList = {
  "가위 바위 보 분류": "https://teachablemachine.withgoogle.com/models/vOi4Y0yiK/",
  "속도 표지판 분류": "https://teachablemachine.withgoogle.com/models/cTrp8ZF93/",
  "방향 표지판 분류": "https://teachablemachine.withgoogle.com/models/JX0oMMrn3/"
};

let isSendingData = false;

function setup() {
  let canvas = createCanvas(400, 300);
  canvas.parent('p5-container');
  
  setupCamera();
  createUI();
}

function setupCamera() {
  video = createCapture({
    video: {
      facingMode: facingMode,
      width: 400,  
      height: 300 
    }
  });
  video.elt.onloadeddata = function() {
    isVideoLoaded = true;
    resizeCanvasToFit(); 
  };
  video.size(400, 300); 
  video.hide();

  let videoLoadCheck = setInterval(() => {
    if (isVideoLoaded) {
      clearInterval(videoLoadCheck);
      return;
    }
    if (video.elt.videoWidth && video.elt.videoHeight) {
      isVideoLoaded = true;
      resizeCanvasToFit();
      clearInterval(videoLoadCheck);
    }
  }, 100);
}

function createUI() {
  // 1. 카메라 버튼 (이모티콘 제거)
  flipButton = createButton("좌우 반전");
  flipButton.parent('camera-control-buttons');
  flipButton.addClass('start-button');
  flipButton.mousePressed(toggleFlip);

  switchCameraButton = createButton("전후방 전환");
  switchCameraButton.parent('camera-control-buttons');
  switchCameraButton.addClass('start-button');
  switchCameraButton.mousePressed(switchCamera);

  // 2. 블루투스 버튼 (이모티콘 제거)
  connectBluetoothButton = createButton("기기 연결");
  connectBluetoothButton.parent('bluetooth-control-buttons');
  connectBluetoothButton.addClass('start-button');
  connectBluetoothButton.mousePressed(connectBluetooth);

  disconnectBluetoothButton = createButton("연결 해제");
  disconnectBluetoothButton.parent('bluetooth-control-buttons');
  disconnectBluetoothButton.addClass('stop-button');
  disconnectBluetoothButton.mousePressed(disconnectBluetooth);

  // 3. 모델 선택 및 로드
  modelSelect = createSelect();
  modelSelect.parent('model-select-and-link');
  modelSelect.option("샘플 모델 선택 또는 직접 입력", "");
  for (const modelName in modelList) {
    modelSelect.option(modelName, modelList[modelName]);
  }
  modelSelect.changed(updateModelInput);

  createA("https://boundaryx.io", "데이터셋 및 설명 보기", "_blank")
    .parent('model-select-and-link')
    .style("color", "#666").style("font-size", "0.9rem").style("display", "block").style("margin-top", "5px");

  modelInput = createInput('');
  modelInput.parent('model-key-container');
  modelInput.attribute('placeholder', '예: https://teachablemachine.withgoogle.com/models/.../');

  modelStatusDiv = createDiv('모델을 로드해주세요.');
  modelStatusDiv.parent('model-key-container');
  modelStatusDiv.id('modelStatus');

  initializeModelButton = createButton('모델 로드 시작');
  initializeModelButton.parent('model-action-buttons');
  initializeModelButton.addClass('start-button');
  initializeModelButton.mousePressed(initializeModel);

  stopClassifyButton = createButton('분류 중지');
  stopClassifyButton.parent('model-action-buttons');
  stopClassifyButton.addClass('stop-button');
  stopClassifyButton.mousePressed(stopClassification);

  updateBluetoothStatusUI();
}

function toggleFlip() {
  isFlipped = !isFlipped;
}

function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  video.remove();
  isVideoLoaded = false; 
  setupCamera();
}

function updateModelInput() {
  const selectedModelURL = modelSelect.value();
  modelInput.value(selectedModelURL || "");
}

function initializeModel() {
  let modelURL = modelInput.value().trim();
  
  if (!modelURL) {
    alert('모델 주소(URL)를 입력하세요!');
    return;
  }

  if (!modelURL.startsWith('http')) {
     alert('올바른 전체 URL을 입력해주세요.');
     return;
  }

  if (!modelURL.endsWith('model.json')) {
      if (!modelURL.endsWith('/')) {
          modelURL += '/';
      }
      modelURL += 'model.json';
  }

  if (modelStatusDiv) {
      modelStatusDiv.html("모델을 불러오는 중입니다...");
      modelStatusDiv.style("color", "#666");
      modelStatusDiv.style("background-color", "#F1F3F4");
  }

  try {
    classifier = ml5.imageClassifier(modelURL, modelLoaded);
  } catch (e) {
      console.error(e);
      if (modelStatusDiv) modelStatusDiv.html("모델 로드 실패. 주소를 확인해주세요.");
  }
}

function modelLoaded() {
  console.log('모델 로드 완료');
  if (modelStatusDiv) {
      modelStatusDiv.html("모델이 성공적으로 로드되었습니다!");
      modelStatusDiv.style("color", "#137333");
      modelStatusDiv.style("background-color", "#E6F4EA");
  }
  label = "준비됨";
  startClassification();
}

function startClassification() {
  if (!classifier) {
    console.error('모델이 로드되지 않았습니다.');
    return;
  }
  isClassifying = true;
  classifyVideo();
}

function stopClassification() {
  isClassifying = false;
  label = "중지됨";
  sendBluetoothData("stop");
  if (modelStatusDiv) {
      modelStatusDiv.html("모델 분류가 중지되었습니다.");
      modelStatusDiv.style("color", "#333");
      modelStatusDiv.style("background-color", "#F1F3F4");
  }
}

function classifyVideo() {
  if (!isClassifying) return;
  classifier.classify(video, gotResults);
}

function gotResults(error, results) {
  if (error) {
    console.error("분류 오류:", error);
    return;
  }
  if (results && results.length > 0) {
    label = results[0].label;
    sendBluetoothData(label);
  }
  classifyVideo();
}

function draw() {
  background(0);
  
  if (!isVideoLoaded) {
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(255);
    text("카메라 로딩 중...", width / 2, height / 2);
    return;
  }

  if (isFlipped) {
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();
  } else {
    image(video, 0, 0, width, height);
  }

  const boxHeight = 50;
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, height - boxHeight, width, boxHeight);
  
  textSize(24);
  textAlign(CENTER, CENTER);
  fill(255);
  text(label, width / 2, height - (boxHeight/2));
}

function resizeCanvasToFit() {
  resizeCanvas(400, 300);
  video.size(400, 300);
}

/* --- Bluetooth Logic --- */

async function connectBluetooth() {
  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID]
    });

    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);
    rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
    txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

    isConnected = true;
    bluetoothStatus = "연결됨: " + bluetoothDevice.name;
    updateBluetoothStatusUI(true);
    
  } catch (error) {
    console.error("Bluetooth connection failed:", error);
    bluetoothStatus = "연결 실패";
    updateBluetoothStatusUI(false, true);
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  isConnected = false;
  bluetoothStatus = "연결 해제됨";
  rxCharacteristic = null;
  txCharacteristic = null;
  bluetoothDevice = null;
  updateBluetoothStatusUI(false);
}

function updateBluetoothStatusUI(connected = false, error = false) {
  const statusElement = select('#bluetoothStatus');
  if(statusElement) {
      statusElement.html(`상태: ${bluetoothStatus}`);
      statusElement.removeClass('status-connected');
      statusElement.removeClass('status-error');
      
      if (connected) {
        statusElement.addClass('status-connected');
      } else if (error) {
        statusElement.addClass('status-error');
      }
  }
}

async function sendBluetoothData(data) {
  if (!rxCharacteristic || !isConnected) return;
  if (isSendingData) return;

  try {
    isSendingData = true;
    const encoder = new TextEncoder();
    await rxCharacteristic.writeValue(encoder.encode(data + "\n"));
  } catch (error) {
    console.error("Error sending data:", error);
  } finally {
    isSendingData = false;
  }
}
