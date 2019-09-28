const mongoose = require('mongoose');
const router = require('express').Router();

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

module.exports = router;
