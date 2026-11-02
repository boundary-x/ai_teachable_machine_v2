// Teachable Machine 클래스: slow, normal, fast, stop
// 확장: bluetooth, github:boundary-x/ai_ponybot_basic
// 전진 속도 조절 예제입니다. 방향 제어 예제와 별도로 사용하세요.
function 포니봇_느리게 () {
    aiPonybot.runNormal(aiPonybot.DirectionControl.Forward, 50)
}
function 포니봇_보통 () {
    aiPonybot.runNormal(aiPonybot.DirectionControl.Forward, 100)
}
function 포니봇_빠르게 () {
    aiPonybot.runNormal(aiPonybot.DirectionControl.Forward, 150)
}
function 포니봇_정지 () {
    aiPonybot.stopAllMotors()
}
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    받은문자 = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (받은문자 == "slow") {
        포니봇_느리게()
    } else if (받은문자 == "normal") {
        포니봇_보통()
    } else if (받은문자 == "fast") {
        포니봇_빠르게()
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
aiPonybot.runNormal(aiPonybot.DirectionControl.Forward, 0)
포니봇_정지()
bluetooth.startUartService()
