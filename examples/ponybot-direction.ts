// Teachable Machine 클래스: forward, backward, left, right, stop
// 확장: bluetooth, github:boundary-x/ai_ponybot_basic
// 오른쪽 앞 1, 오른쪽 뒤 2, 왼쪽 뒤 3, 왼쪽 앞 4
function 포니봇_전진 () {
    aiPonybot.runNormal(aiPonybot.DirectionControl.Forward, 50)
}
function 포니봇_후진 () {
    aiPonybot.runNormal(aiPonybot.DirectionControl.Backward, 50)
}
function 포니봇_좌회전 () {
    // 확장 코드에서 Clockwise는 오른쪽 전진 + 왼쪽 후진입니다.
    aiPonybot.runNormal(aiPonybot.DirectionControl.Clockwise, 50)
}
function 포니봇_우회전 () {
    // 확장 코드에서 CounterClockwise는 오른쪽 후진 + 왼쪽 전진입니다.
    aiPonybot.runNormal(aiPonybot.DirectionControl.CounterClockwise, 50)
}
function 포니봇_정지 () {
    aiPonybot.stopAllMotors()
}
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    받은문자 = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (받은문자 == "forward") {
        포니봇_전진()
    } else if (받은문자 == "backward") {
        포니봇_후진()
    } else if (받은문자 == "left") {
        포니봇_좌회전()
    } else if (받은문자 == "right") {
        포니봇_우회전()
    } else {
        포니봇_정지()
    }
})
bluetooth.onBluetoothConnected(function () {
    포니봇_정지()
})
bluetooth.onBluetoothDisconnected(function () {
    포니봇_정지()
})
let 받은문자 = ""
// 먼저 모터 제어 보드를 초기화한 뒤 모든 모터를 정지합니다.
aiPonybot.runNormal(aiPonybot.DirectionControl.Forward, 0)
포니봇_정지()
bluetooth.startUartService()
