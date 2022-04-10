const url = "wss://stream.data.alpaca.markets/v1beta1/crypto";
const socket = new WebSocket(url);

console.log(socket)

socket.onmessage = function(event) {
    console.log(event);
}