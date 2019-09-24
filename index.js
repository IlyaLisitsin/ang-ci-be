require('dotenv').config();
require('./chat');
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
express()
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
    })

    .listen(PORT, () => console.log(`Listening on ${ PORT }`));
