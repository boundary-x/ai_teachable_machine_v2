/**
 * sketch.js
 * Boundary X Teachable Machine Controller Logic (Square Crop Fixed)
 */

// Bluetooth UUIDs
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
let canvas; // Canvas 객체 저장용

// 반복 실패 시 안내 메시지가 매 프레임 깜빡이지 않도록 최소 간격을 둠
let lastSendErrorTime = 0;

// BLE 연결 시각과 모델 로드 단계(debugStage)를 기록해서, 연결이 끊기는 시점의 상태를 화면과 콘솔에서 바로 확인할 수 있게 함
let debugStage = "idle";
let bleConnectedAt = 0;

function setStage(stage) {
  debugStage = stage;
  const t = performance.now().toFixed(0);
  console.log(`[DEBUG ${t}ms] Stage -> ${stage}`);
}

// 문자열에 한글(자모/완성형)이 포함되어 있는지 검사
function containsKorean(text) {
  return /[\uAC00-\uD7A3\u3131-\u318E]/.test(text);
}

// 주어진 프로미스가 정해진 시간 안에 끝나지 않으면 강제로 실패 처리 (BLE 응답이 영영 안 올 때 대비)
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('BLE write timeout')), ms))
  ]);
}

function setup() {
  // 400x400 정사각형 캔버스
  canvas = createCanvas(400, 400);
  canvas.parent('p5-container');
  
  setupCamera();
  createUI();
}

function setupCamera() {
  let constraints = {
    video: {
      facingMode: facingMode
      // width, height를 강제하지 않음 (카메라 고유 비율 사용)
    },
    audio: false
  };

  video = createCapture(constraints);
  
  video.elt.onloadeddata = function() {
    console.log("Video metadata loaded");
  };

  // 원본 비율 유지를 위해 video.size()로 강제 리사이즈하지 않음
  video.hide();

  let videoLoadCheck = setInterval(() => {
    if (isVideoLoaded) {
      clearInterval(videoLoadCheck);
      return;
    }
    // 데이터가 들어오기 시작하면 로드 완료
    if (video.elt.readyState >= 2 && video.width > 0) {
      isVideoLoaded = true;
      resizeCanvasToFit();
      clearInterval(videoLoadCheck);
      console.log(`Video Stream Ready: ${video.width}x${video.height}`);
    }
  }, 100);
}

function stopVideo() {
  if (video) {
    if (video.elt.srcObject) {
      const tracks = video.elt.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    video.remove(); 
    video = null;
  }
}

function createUI() {
  flipButton = createButton("좌우 반전");
  flipButton.parent('camera-control-buttons');
  flipButton.addClass('start-button');
  flipButton.mousePressed(toggleFlip);

  switchCameraButton = createButton("전후방 전환");
  switchCameraButton.parent('camera-control-buttons');
  switchCameraButton.addClass('start-button');
  switchCameraButton.mousePressed(switchCamera);

  connectBluetoothButton = createButton("기기 연결");
  connectBluetoothButton.parent('bluetooth-control-buttons');
  connectBluetoothButton.addClass('start-button');
  connectBluetoothButton.mousePressed(connectBluetooth);

  disconnectBluetoothButton = createButton("연결 해제");
  disconnectBluetoothButton.parent('bluetooth-control-buttons');
  disconnectBluetoothButton.addClass('stop-button');
  disconnectBluetoothButton.mousePressed(disconnectBluetooth);

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
  modelInput.attribute('placeholder', '모델 전체 주소 또는 짧은 ID 입력 (예: lSgKZj_c5)');

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
  stopVideo();
  isVideoLoaded = false; 
  facingMode = facingMode === "user" ? "environment" : "user";
  
  setTimeout(() => {
    setupCamera();
  }, 200); 
}

function updateModelInput() {
  const selectedModelURL = modelSelect.value();
  modelInput.value(selectedModelURL || "");
}

function initializeModel() {
  let inputVal = modelInput.value().replace(/\s+/g, '');
  let finalModelURL = "";
  
  if (!inputVal) {
    alert('모델 주소 또는 ID를 입력하세요!');
    return;
  }

  if (inputVal.startsWith('http')) {
      finalModelURL = inputVal;
  } else {
      finalModelURL = "https://teachablemachine.withgoogle.com/models/" + inputVal + "/";
  }

  if (!finalModelURL.endsWith('model.json')) {
      if (!finalModelURL.endsWith('/')) {
          finalModelURL += '/';
      }
      finalModelURL += 'model.json';
  }

  if (modelStatusDiv) {
      modelStatusDiv.html("모델을 불러오는 중입니다...");
      modelStatusDiv.style("color", "#666");
      modelStatusDiv.style("background-color", "#F1F3F4");
  }

  console.log("Loading model from:", finalModelURL);

  setStage("metadata_fetch_start");
  if (bleConnectedAt > 0) {
    console.log(`[DEBUG] BLE 연결 후 모델 로드 시작까지 ${((performance.now() - bleConnectedAt) / 1000).toFixed(1)}초 경과 (연결은 유지 중)`);
  }

  // 클래스 이름에 한글이 있는지 metadata.json으로 먼저 확인
  const metadataURL = finalModelURL.replace(/model\.json$/, 'metadata.json');
  fetch(metadataURL)
    .then(res => res.json())
    .then(metadata => {
      setStage("metadata_fetch_done");
      const labels = metadata.labels || [];
      const koreanLabels = labels.filter(containsKorean);
      if (koreanLabels.length > 0) {
        if (modelStatusDiv) {
          modelStatusDiv.html(`⚠️ 클래스 이름은 영어로만 지정해야 합니다. (한글 클래스: ${koreanLabels.join(', ')})`);
          modelStatusDiv.style("color", "#EA4335");
          modelStatusDiv.style("background-color", "#FCE8E6");
        }
        return; // 분류 모델 로드 자체를 시작하지 않음
      }
      loadClassifier(finalModelURL);
    })
    .catch(err => {
      // metadata.json을 못 가져와도(자체 호스팅 모델 등 구조가 다른 경우) 검사 없이 진행
      setStage("metadata_fetch_failed");
      console.warn("메타데이터 확인 실패, 클래스명 검사 없이 진행합니다:", err);
      loadClassifier(finalModelURL);
    });
}

function loadClassifier(finalModelURL) {
  setStage("model_json_precheck");
  // model.json이 실제로 존재하고 유효한 JSON인지 먼저 확인한 뒤에만 ml5로 전달함
  fetch(finalModelURL)
    .then(res => {
      if (!res.ok) throw new Error(`model.json 응답 실패 (HTTP ${res.status})`);
      return res.json(); // 응답이 실제로 유효한 JSON인지까지 확인 (XML 에러 페이지 등을 걸러냄)
    })
    .then(() => {
      setStage("ml5_imageClassifier_start (모델/가중치 다운로드+빌드 구간)");
      classifier = ml5.imageClassifier(finalModelURL, modelLoaded);
    })
    .catch(e => {
      setStage("model_json_precheck_failed");
      console.error("model.json 사전 검증 실패:", e);
      if (modelStatusDiv) {
        modelStatusDiv.html("⚠️ 모델 주소가 올바르지 않습니다. 링크의 영문 대소문자까지 정확히 입력했는지 확인해주세요.");
        modelStatusDiv.style("color", "#EA4335");
        modelStatusDiv.style("background-color", "#FCE8E6");
      }
    });
}

function modelLoaded() {
  setStage("model_loaded_success");
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
  consecutiveClassifyErrors = 0;
  circuitBreakerTrips = 0;
  isClassifying = true;
  classifyVideo();
}

async function stopClassification() {
  isClassifying = false;
  label = "중지됨";
  const sent = await sendBluetoothDataReliable("stop");

  if (modelStatusDiv) {
    if (sent) {
      modelStatusDiv.html("모델 분류가 중지되었습니다.");
      modelStatusDiv.style("color", "#333");
      modelStatusDiv.style("background-color", "#F1F3F4");
    } else {
      modelStatusDiv.html("⚠️ 정지 신호 전송에 실패했어요. 블루투스 연결을 확인해주세요.");
      modelStatusDiv.style("color", "#EA4335");
      modelStatusDiv.style("background-color", "#FCE8E6");
    }
  }
}

function classifyVideo() {
  if (!isClassifying) return;
  // 왜곡 없는 캔버스 화면 자체를 분류 (정확도 향상)
  // video를 직접 넣으면 원본(4:3)이 들어가서 AI가 찌그러진 상태로 인식할 수 있음
  classifier.classify(canvas, gotResults);
}

// 분류가 연속으로 실패하면 잠깐 쉬었다가 재시도하고, 그마저 반복되면 완전히 멈추는 안전장치
let consecutiveClassifyErrors = 0;
let circuitBreakerTrips = 0;
const MAX_CONSECUTIVE_CLASSIFY_ERRORS = 15; // 카메라 전환, 일시적 WebGL 문제 등 순간적인 hiccup에 여유를 둠
const RETRY_COOLDOWN_MS = 3000;
const MAX_COOLDOWN_RETRIES = 3; // 쿨다운 후 재시도까지 이 횟수만큼 반복 실패하면 완전히 중지

function gotResults(error, results) {
  if (error) {
    consecutiveClassifyErrors++;
    console.error(`분류 오류 (연속 ${consecutiveClassifyErrors}회):`, error);
    if (consecutiveClassifyErrors >= MAX_CONSECUTIVE_CLASSIFY_ERRORS) {
      circuitBreakerTrips++;
      if (circuitBreakerTrips >= MAX_COOLDOWN_RETRIES) {
        console.error("분류 오류가 반복되어 완전히 중지합니다.");
        isClassifying = false;
        if (modelStatusDiv) {
          modelStatusDiv.html("⚠️ 모델 분류에 반복적으로 실패하여 자동 중지되었습니다. 모델 링크를 확인해주세요.");
          modelStatusDiv.style("color", "#EA4335");
          modelStatusDiv.style("background-color", "#FCE8E6");
        }
        return; // classifyVideo()를 다시 호출하지 않음 -> 루프 종료
      }
      console.warn(`분류 오류가 반복되어 ${RETRY_COOLDOWN_MS}ms 후 재시도합니다. (${circuitBreakerTrips}/${MAX_COOLDOWN_RETRIES})`);
      consecutiveClassifyErrors = 0;
      setTimeout(() => { if (isClassifying) classifyVideo(); }, RETRY_COOLDOWN_MS);
      return;
    }
    classifyVideo();
    return;
  }
  consecutiveClassifyErrors = 0; // 성공하면 카운터 리셋
  circuitBreakerTrips = 0;
  if (results && results.length > 0) {
    label = results[0].label;
    sendBluetoothData(label);
  }
  classifyVideo();
}

function draw() {
  background(0);
  
  if (!isVideoLoaded || video.width === 0) {
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(255);
    text("카메라 로딩 중...", width / 2, height / 2);
    return;
  }

  // 센터 크롭(Center Crop) 로직
  // 영상의 가로/세로 중 작은 쪽을 기준으로 1:1 비율을 만듦
  let vw = video.width;
  let vh = video.height;
  let minDim = min(vw, vh); // 정사각형 한 변의 길이
  
  // 영상의 정중앙 좌표 계산
  let sx = (vw - minDim) / 2;
  let sy = (vh - minDim) / 2;

  push();
  if (isFlipped) {
    translate(width, 0);
    scale(-1, 1);
  }
  
  // image(원본, 캔버스x, 캔버스y, 캔버스w, 캔버스h, 원본x, 원본y, 원본w, 원본h)
  // 원본 영상의 중앙(sx, sy)에서 정사각형(minDim)만큼 잘라내어 캔버스(400x400)에 꽉 차게 그림
  image(video, 0, 0, width, height, sx, sy, minDim, minDim);
  pop();

  // 결과 표시 바
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
  resizeCanvas(400, 400);
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

    // 마이크로비트가 범위를 벗어나거나 전원이 꺼지는 등 예기치 않게 끊겼을 때도 상태를 동기화
    bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

    isConnected = true;
    bluetoothStatus = "연결됨: " + bluetoothDevice.name;
    bleConnectedAt = performance.now();
    setStage("ble_connected_idle");
    updateBluetoothStatusUI(true);
    
  } catch (error) {
    console.error("Bluetooth connection failed:", error);
    bluetoothStatus = "연결 실패";
    updateBluetoothStatusUI(false, true);
  }
}

// 사용자가 직접 '연결 해제' 버튼을 눌렀는지 구분하기 위한 플래그
let isManualDisconnect = false;

// 수동 해제든 예기치 않은 끊김이든 이 함수 하나로 상태를 정리
function onDisconnected() {
  // 끊기기 직전 어느 단계였는지, 연결이 얼마나 유지됐는지 기록
  const elapsedSec = bleConnectedAt > 0 ? ((performance.now() - bleConnectedAt) / 1000).toFixed(1) : "?";
  console.error(`[DEBUG] BLE 연결 끊김 발생 -> 마지막 단계: "${debugStage}", 연결 유지 시간: ${elapsedSec}초, 수동해제여부: ${isManualDisconnect}`);

  isConnected = false;
  rxCharacteristic = null;
  txCharacteristic = null;
  bluetoothDevice = null;

  // 연결이 끊기면 인식(분류)도 함께 자동 중지 — 끊긴 채로 계속 돌아가는 것 방지
  const wasClassifying = isClassifying;
  if (isClassifying) {
    isClassifying = false;
    label = "중지됨";
  }

  if (isManualDisconnect) {
    bluetoothStatus = "연결 해제됨";
    updateBluetoothStatusUI(false);
    if (modelStatusDiv && wasClassifying) {
      modelStatusDiv.html("블루투스 연결이 해제되어 인식이 중지되었습니다.");
      modelStatusDiv.style("color", "#333");
      modelStatusDiv.style("background-color", "#F1F3F4");
    }
  } else {
    bluetoothStatus = "연결이 끊어졌습니다. 다시 연결해주세요.";
    updateBluetoothStatusUI(false, true);
    if (modelStatusDiv) {
      // 화면에도 마지막 단계/유지 시간을 표시 (PC 콘솔 없이 아이폰에서 바로 확인 가능)
      modelStatusDiv.html(`⚠️ 블루투스 연결이 예기치 않게 끊어졌습니다.<br><small>[진단정보] 마지막 단계: ${debugStage} / 연결 유지 시간: ${elapsedSec}초</small>`);
      modelStatusDiv.style("color", "#EA4335");
      modelStatusDiv.style("background-color", "#FCE8E6");
    }
  }
  isManualDisconnect = false;
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    // 실제 상태 정리는 'gattserverdisconnected' 이벤트를 받는 onDisconnected()가 담당
    isManualDisconnect = true;
    bluetoothDevice.gatt.disconnect();
  } else {
    isConnected = false;
    bluetoothStatus = "연결 해제됨";
    rxCharacteristic = null;
    txCharacteristic = null;
    bluetoothDevice = null;
    updateBluetoothStatusUI(false);
  }
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

// 성공하면 true, 스킵되거나 실패하면 false를 반환
async function sendBluetoothData(data) {
  if (!rxCharacteristic || !isConnected) return false;
  // 방어적 안전망: 어떤 경로로든 한글 라벨이 들어오면 전송하지 않음
  if (containsKorean(data)) {
    console.warn("한글 라벨은 전송하지 않습니다:", data);
    return false;
  }
  if (isSendingData) return false;

  try {
    isSendingData = true;
    const encoder = new TextEncoder();
    // writeValue가 끝내 응답하지 않는 경우를 대비해 2초 타임아웃을 둠 (전송 영구 정지 방지)
    await withTimeout(rxCharacteristic.writeValue(encoder.encode(data + "\n")), 2000);
    return true;
  } catch (error) {
    console.error("Error sending data:", error);
    const now = Date.now();
    if (modelStatusDiv && now - lastSendErrorTime > 3000) {
      lastSendErrorTime = now;
      modelStatusDiv.html("⚠️ 데이터 전송에 실패했어요. 연결 상태를 확인해주세요.");
      modelStatusDiv.style("color", "#EA4335");
      modelStatusDiv.style("background-color", "#FCE8E6");
    }
    return false;
  } finally {
    isSendingData = false;
  }
}

// 'stop'처럼 반드시 전달되어야 하는 명령을 위한 재시도 버전
async function sendBluetoothDataReliable(data, maxRetries = 5, retryDelayMs = 80) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const sent = await sendBluetoothData(data);
    if (sent) return true;
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
  }
  console.error(`전송 재시도 실패: ${data}`);
  return false;
}
