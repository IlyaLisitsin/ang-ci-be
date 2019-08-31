const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();

const auth = require('../auth');
const { Response } = require('../../models');

const Users = mongoose.model('Users');

router.post('/', auth.optional, (req, res, next) => {
    const { body: { user } } = req;

    if (!user) {
        res.status(422).json(new Response({ errorMessage: 'You have to pass user data' }));
        return
    }

    if (!user.email) {
        res.status(422).json(new Response({ errorMessage: 'Email is required' }));
        return
    }

    if (!user.password) {
        res.status(422).json(new Response({ errorMessage: 'Password is required' }));
        return
    }

    const finalUser = new Users(user);

    finalUser.setPassword(user.password);

    return finalUser.save()
        .then(() => {
            res.json(finalUser.getAuthUser())
        })
});

router.post('/login', auth.optional, (req, res, next) => {
    const { body: { user } } = req;

    if (!user) {
        res.status(422).json(new Response({ errorMessage: 'You have to pass user data' }));
        return
    }

    if (!user.email) {
        res.status(422).json(new Response({ errorMessage: 'Email is required' }));
        return
    }

    if (!user.password) {
        res.status(422).json(new Response({ errorMessage: 'Password is required' }));
        return
    }

    return passport.authenticate('local', { session: false }, (err, passportUser, info) => {
        if (err) {
            return next(err);
        }

        if (passportUser) {
            const user = passportUser;
            user.token = passportUser.generateJWT();

            return res.json(user.getAuthUser());
        }

        return res.status(401).json(new Response({ errorMessage: 'Auth failed' }));
    })(req, res, next);
});

router.get('/current', auth.required, (req, res, next) => {
    const { payload: { id } } = req;

    return Users.findById(id)
        .then((user) => {
            if (!user) {
                return res.sendStatus(400);
            }

            return res.json(user.getAuthUser());
        });
});

module.exports = router;
