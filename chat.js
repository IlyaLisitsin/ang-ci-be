const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 1312 });

const connections = {};

wss.on('connection', function(connection, req) {
    const userId = req.url.split('/?id=')[1];

    connections[userId] = connection;
    connection.on('message', function(message) {
        console.log('onmessage', message)
        const event = JSON.parse(message);

        switch (event.type) {
            case 'message':
                connections[event.to].send(event.data)
        }
    })
});
