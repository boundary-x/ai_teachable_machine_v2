// Teachable Machine 클래스: slow, normal, fast, stop
// 확장: bluetooth, servos / 왼쪽 P1, 오른쪽 P2
// 전진 속도 조절 예제입니다. 방향 제어 예제와 별도로 사용하세요.
function 비트런_느리게 () {
    servos.P1.run(25)
    servos.P2.run(-25)
}
function 비트런_보통 () {
    servos.P1.run(50)
    servos.P2.run(-50)
}
function 비트런_빠르게 () {
    servos.P1.run(75)
    servos.P2.run(-75)
}
function 비트런_정지 () {
    servos.P1.stop()
    servos.P2.stop()
}
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    받은문자 = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (받은문자 == "slow") {
        비트런_느리게()
    } else if (받은문자 == "normal") {
        비트런_보통()
    } else if (받은문자 == "fast") {
        비트런_빠르게()
    } else {
        비트런_정지()
    }
})
bluetooth.onBluetoothConnected(function () {
    비트런_정지()
})
bluetooth.onBluetoothDisconnected(function () {
    비트런_정지()
})
let 받은문자 = ""
servos.P1.setPulse(1500)
servos.P2.setPulse(1500)
비트런_정지()
bluetooth.startUartService()
