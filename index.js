require('dotenv').config();
const njwt = require('njwt');
const express = require('express');
const PORT = process.env.PORT || 5000;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const { Response } = require('./models');

require('./models/Users');
require('./config/passport');

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

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ port: 1312 });

wss.on('connection', function(connection, req) {

    const token = req.url.split('/?token=')[1];

    try {
        const { body: { id } } = njwt.verify(token, process.env.JWTTKN);
        if (!app.locals.wsConnections) app.locals.wsConnections = [];
        if (id) app.locals.wsConnections.push({ id, connection });

        // console.log('AFTER ADD\n', app.locals.wsConnections.map(el => ({ id: el.id, state: el.connection.readyState })))
    } catch (e) {
        console.log('(((')
    }

    connection.on('close', () => {
        // console.log('LENGTH BC', app.locals.wsConnections.length)
        // console.log('CLOSING\n', app.locals.wsConnections.map(el => ({ id: el.id, state: el.connection.readyState })))
        if (app.locals.wsConnections) {
            app.locals.wsConnections = app.locals.wsConnections.filter(connectionObj => connectionObj.connection.readyState !== 3)
        }
        // console.log('LENGTH AC', app.locals.wsConnections.length)
    })

    connection.on('message', function(message) {
        const data = JSON.parse(message).data;
        const event = JSON.parse(message).event;

        console.log('data', data, event)

        switch (event) {
            case 'send-message':

                const sender = app.locals.wsConnections.find(connectionObj => connectionObj.id === data.from);
                sender && sender.connection.send(JSON.stringify({
                    event: 'messages',
                    data: data.text,
                }));

                const recipient = app.locals.wsConnections.find(connectionObj => connectionObj.id === data.to);
                recipient && recipient.connection.send(JSON.stringify({
                    event: 'messages',
                    data: data.text,
                }));
        }
    })
});
