const API_KEY = "PKW0ICL0ZU5JMCBPYYLM";
const SECRET_KEY = "vE9hXlu4vkE0gYsqZndLP3K26XpNBOhuDkbDgJKw";

const quotesElement = document.getElementById("quotes");
const tradesElement = document.getElementById("trades");

let currentBar = {};
let trades = [];

var chart = LightweightCharts.createChart(document.getElementById("chart"), {
  width: 600,
  height: 800,
  layout: {
    backgroundColor: "#1f1f1f",
    textColor: "#d9d9d9",
  },
  grid: {
    vertLines: {
      color: "#666666",
    },
    horzLines: {
      color: "#666666",
    },
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
  },
  priceScale: {
    borderColor: "#d9d9d9",
  },
  timeScale: {
    borderColor: "#d9d9d9",
    timeVisible: true,
    borderVisible: true,
  },
});

var candleSeries = chart.addCandlestickSeries();

// var start = new Date(Date.now())
var start = new Date(Date.now() - 7200 * 1000).toISOString();
var bars_URL =
  "https://data.alpaca.markets/v1beta1/crypto/ETHUSD/bars?exchanges=CBSE&timeframe=1Min,start=" +
  start;
("&limit=1000");

fetch(bars_URL, {
  headers: {
    "APCA-API-KEY-ID": API_KEY,
    "APCA-API-SECRET-KEY": SECRET_KEY,
  },
})
  .then((r) => r.json())
  .then((data) => {
    console.log(data);
    const transData = data.bars.map((bar) => ({
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      time: Date.parse(bar.t) / 1000,
    }));
    // console.log(transData);
    // get the last bar from initial get
    currentBar = transData[transData.length - 1];
    candleSeries.setData(transData);
  });

function connect() {
  const url = "wss://stream.data.alpaca.markets/v1beta1/crypto";
  const socket = new WebSocket(url);
  const auth = { action: "auth", key: API_KEY, secret: SECRET_KEY };
  const sub = {
    action: "subscribe",
    trades: ["ETHUSD"],
    quotes: ["ETHUSD"],
    bars: ["ETHUSD"],
  };

  socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    const message = data[0]["msg"];
    // console.log(data);
    if (message == "connected") {
      console.log("connected");
      socket.send(JSON.stringify(auth));
    }

    if (message == "authenticated") {
      console.log("authenticated");
      socket.send(JSON.stringify(sub));
    }

    for (var key in data) {
      const type = data[key].T;
      // ERSX has some timing issue hence filter it out
      if (type == "q" && data[key].x != "ERSX") {
        //var t = new Date();
        //var time = t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds();
        // console.log(data[key].t, data[key].x);
        const quoteElement = document.createElement("div");
        quoteElement.className = "quote";
        quoteElement.innerHTML = `<b>${data[key].t}</b> -- ${data[key].bp} -- ${data[key].bs} -- ${data[key].ap} -- ${data[key].as} `;
        quotesElement.appendChild(quoteElement);
        if (quotesElement.children.length > 15) {
          quotesElement.removeChild(quotesElement.children[0]);
        }
      }

      if (type == "t") {
        const tradeElement = document.createElement("div");
        tradeElement.className = "trade";
        tradeElement.innerHTML = `<b>${data[key].t}</b> -- ${data[key].p} -- ${data[key].s}`;
        tradesElement.appendChild(tradeElement);

        var elements = tradesElement.getElementsByClassName("trade");
        if (elements.length > 15) {
          tradesElement.removeChild(elements[0]);
        }

        //every time a trade come in we collect and build the open / high / close /low
        //ourselves
        trades.push(data[key].p);
        var open = trades[0];
        var high = Math.max(...trades);
        var low = Math.min(...trades);
        var close = trades[trades.length - 1];

        candleSeries.update({
          time: currentBar.time + 60,
          open: open,
          high: high,
          low: low,
          close: close,
        });
      }

      if (type == "b" && data[key].x == "CBSE") {
        console.log(data[key]);
        var bar = data[key];
        var time = new Date(bar.t).getTime() / 1000;

        currentBar = {
          time: time,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
        };

        // every time a bar comes in we reset the trades array
        trades = [];

        candleSeries.update(currentBar);
      }
    }
  };

  socket.onclose = function(e) {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
    setTimeout(function() {
      connect();
    }, 1000);
  };

  socket.onerror = function(err) {
    console.error('Socket encountered error: ', err.message, 'Closing socket');
    ws.close();
  };
}

connect();