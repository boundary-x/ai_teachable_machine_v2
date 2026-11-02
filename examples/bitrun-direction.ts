// Teachable Machine 클래스: forward, backward, left, right, stop
// 확장: bluetooth, servos / 왼쪽 바퀴 P1, 오른쪽 바퀴 P2
function 비트런_전진 () {
    servos.P1.run(50)
    servos.P2.run(-50)
}
function 비트런_후진 () {
    servos.P1.run(-50)
    servos.P2.run(50)
}
function 비트런_좌회전 () {
    servos.P1.run(-50)
    servos.P2.run(-50)
}
function 비트런_우회전 () {
    servos.P1.run(50)
    servos.P2.run(50)
}
function 비트런_정지 () {
    servos.P1.stop()
    servos.P2.stop()
}
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    받은문자 = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (받은문자 == "forward") {
        비트런_전진()
    } else if (받은문자 == "backward") {
        비트런_후진()
    } else if (받은문자 == "left") {
        비트런_좌회전()
    } else if (받은문자 == "right") {
        비트런_우회전()
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
