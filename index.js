require('dotenv').config();

require('./models/Users');
require('./models/MessagesHistory');
require('./config/passport');

const njwt = require('njwt');
const express = require('express');
const PORT = process.env.PORT || 5000;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({ server });
const { Response } = require('./models');
const MessagesHistory = mongoose.model('MessagesHistory');

mongoose.connect(
    process.env.DATABASE_CONNECTION_URL,
    { useNewUrlParser: true },
);

const app = express()
.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
})
.use(bodyParser.json({ limit: '50mb' }))
.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
.use(require('./routes'))
.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json(new Response({ errorMessage: err.message }));
});

const server = http.createServer(app);

server.listen(PORT);
console.log(`Listening on ${ PORT }`);

wss.on('connection', function(connection, req) {

    const token = req.url.split('/?token=')[1];

    try {
        const { body: { id } } = njwt.verify(token, process.env.JWTTKN);
        if (!app.locals.wsConnections) app.locals.wsConnections = [];
        if (id) app.locals.wsConnections.push({ id, connection });
    } catch (e) {
        console.log('(((', e)
    }

    connection.on('close', () => {
        if (app.locals.wsConnections) {
            app.locals.wsConnections = app.locals.wsConnections.filter(connectionObj => connectionObj.connection.readyState !== 3)
        }
    });

    connection.on('message', function(message) {
        const data = JSON.parse(message).data;
        const event = JSON.parse(message).event;

        console.log('data', data, event)

        switch (event) {
            case 'send-message':

                const sender = app.locals.wsConnections.find(connectionObj => connectionObj.id === data.from);
                sender && sender.connection.send(JSON.stringify({
                    event: 'messages',
                    data: {
                        text: data.text,
                        sender: data.from,
                    },
                    recipient: data.to,
                }));

                const recipient = app.locals.wsConnections.find(connectionObj => connectionObj.id === data.to);
                recipient && recipient.connection.send(JSON.stringify({
                    event: 'messages',
                    data: {
                        text: data.text,
                        sender: data.from,
                    },
                    recipient: data.from,
                }));

                const lowerIdHigherId = [data.from, data.to].sort((a, b) => {
                    if (a > b) return 1;
                    else return -1;
                }).join('');

                MessagesHistory.update(
                    { lowerIdHigherId },
                    { $push : { messages: { sender: data.from, text: data.text } }},
                    { upsert : true}
                );

        }
    })
});
