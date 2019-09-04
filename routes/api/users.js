const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();

const auth = require('../auth');
const { Response } = require('../../models');

const Users = mongoose.model('Users');
const Posts = mongoose.model('Posts');

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

            return res.json(user.getUserData());
        });
});

router.post('/update-avatar', auth.required, (req, res, next) => {
    const { payload: { id }, body: { newAvatarStr } } = req;

    return Users.updateOne({
        _id: id,
    }, { userAvatar: newAvatarStr })
        .then((user) => {
            if (!user) {
                return res.sendStatus(400);
            }

            return Users.findById(id)
                .then((user) => {
                    if (!user) {
                        return res.sendStatus(400);
                    }

                    return res.json(user.getUserData());
                });
        });
});

router.post('/add-post', auth.required, (req, res, next) => {
    const { payload: { id }, body: { post } } = req;

    console.log(324, id)
    console.log(324, post)

    // return Users.updateOne({
    //     _id: id,
    // }, { posts: { $push: 324 } })
    //     .then((user) => {
    //         if (!user) {
    //             return res.sendStatus(400);
    //         }
    //
    //         return Users.findById(id)
    //             .then((user) => {
    //                 if (!user) {
    //                     return res.sendStatus(400);
    //                 }
    //
    //                 return res.json(user.getUserData());
    //             });
    //     });

    Users.updateOne({
    _id: id,
    }, { $push: { posts: new Posts(post) } })
    .then(user => {
        console.log(34, user)
    })
});

router.get('/feed', auth.required, (req, res, next) => {
    const { payload: { id } } = req;

    return Users.findById(id)
        .then(user => {
            if (!user) {
                return res.sendStatus(400);
            }

            return user.getUserFeed().then(posts => res.json(posts))
        });
});

module.exports = router;
