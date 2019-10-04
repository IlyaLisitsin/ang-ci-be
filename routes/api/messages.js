const mongoose = require('mongoose');
const router = require('express').Router();
const jwt = require('jsonwebtoken');

const MessagesHistory = mongoose.model('MessagesHistory');

const auth = require('../auth');

router.get('/get-messages-history', auth.required, (req, res, next) => {
    const { query: { lowerIdHigherId } } = req;

    MessagesHistory.find({
        lowerIdHigherId
    }).then(response => {

        if (response && response.length) {
            res.json(response[0].messages)
        } else res.json([]);
    })
});

router.get('/get-account-messages-list', auth.required, (req, res, next) => {
    const { query: { token } } = req;

    try {
        const payload = jwt.verify(token, process.env.JWTTKN);
        const id = payload.id;

        MessagesHistory.find({
            lowerIdHigherId: new RegExp(id, 'gi'),
        }).then(resArray => res.json(resArray))
    } catch (e) {
        res.json([]);
    }
});
module.exports = router;
