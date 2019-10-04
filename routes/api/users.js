const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();

const auth = require('../auth');
const { Response } = require('../../models');

const Users = mongoose.model('Users');
const Posts = mongoose.model('Posts');
const Comments = mongoose.model('Comments');

const ObjectId = mongoose.Types.ObjectId;

mongoose.set('useFindAndModify', false);

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
    const { payload: { id }, query: { unlogedUserId } } = req;

    const idToSearch = unlogedUserId ? unlogedUserId : id;

    return Users.findById(idToSearch)
        .then((user) => {
            if (!user) {
                return res.sendStatus(400);
            }

            return res.json(user.getUserData());
        });
});

router.post('/update-avatar', auth.required, (req, res, next) => {
    const { payload: { id }, body: { newAvatarStr } } = req;

    return Users.updateOne(
        { _id: id },
        { $set: { "posts.$[elem].postAuthorAvatar": newAvatarStr }, userAvatar: newAvatarStr },
        { arrayFilters: [{ 'elem.postAuthorAvatar': { $exists: true } }], multi: true })
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

router.put('/add-post', auth.required, (req, res, next) => {
    const { payload: { id }, body: { postText, image } } = req;

    return Users.findById(id)
        .then(user => {
            if (!user) {
                return res.sendStatus(400);
            }

            Users.updateOne({
                _id: id,
            }, { $push: { posts: new Posts({
                        postText,
                        image,
                        postId: mongoose.Types.ObjectId(),
                        postAuthorLogin: user.login,
                        postAuthorId: user._id,
                        postAuthorAvatar: user.userAvatar,
                        postDate: new Date().toISOString(),
                    }) } })
                .then(() => res.json(user.getUserData()))
        });
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

router.get('/search', auth.required, (req, res, next) => {
    const { query: { searchQuery } } = req;

    Users.find({
        login: new RegExp(searchQuery, 'gi'),
    }).then(usersArray => {
        if (!usersArray || !usersArray.length) {
            return res.sendStatus(400);
        }

        return res.json(usersArray[0].getUserSearchResult(usersArray));
    })
});

router.put('/follow', auth.required, (req, res, next) => {
    const { payload: { id }, body: { subscriptionId } } = req;

    Users.findOneAndUpdate(
        { _id: id },
        { $push: { subscriptions: subscriptionId } },
        { new: true },
    ).then(user => {
        if (!user) {
            return res.sendStatus(400);
        }

        return res.json(user.getUserData());
    })
});

router.put('/unfollow', auth.required, (req, res, next) => {
    const { payload: { id }, body: { subscriptionId } } = req;

    Users.findOneAndUpdate(
        { _id: id },
        { $pull: { subscriptions: subscriptionId } },
        { new: true },
    ).then(user => {
        if (!user) {
            return res.sendStatus(400);
        }

        return res.json(user.getUserData());
    })
});

router.put('/like-post', auth.required, (req, res, next) => {
    const { payload: { id }, body: { postId, postAuthorId } } = req;

    Users.findOneAndUpdate(
        { _id: postAuthorId },
        { $push: { "posts.$[elem].likedBy": id } },
        { arrayFilters: [{ 'elem._id': postId }], multi: false, new: true }
    ).then(user => {
        if (!user) {
            return res.sendStatus(400);
        }

        return res.json(new Response({ data: 'like success' }));
    })
});

router.put('/unlike-post', auth.required, (req, res, next) => {
    const { payload: { id }, body: { postId, postAuthorId } } = req;

    Users.findOneAndUpdate(
        { _id: postAuthorId },
        { $pull: { "posts.$[elem].likedBy": id } },
        { arrayFilters: [{ 'elem._id': postId }], multi: false, new: true }
    ).then(user => {
        if (!user) {
            return res.sendStatus(400);
        }

        return res.json(new Response({ data: 'unlike success' }));
    })
});

router.get('/get-likes', auth.required, (req, res, next) => {
    const { payload: { id }, query: { userIds } } = req;

    Users.findById(id).then(user => {
        return user.getPostLikes(userIds).then(likesResponse => res.json(likesResponse));
    })
});

router.put('/add-post-comment', auth.required, (req, res, next) => {
    const { payload: { id }, body: { postId, text, replyTo, commentDate, postAuthorId, commentAuthorAvatar, commentAuthorLogin } } = req;

    const postComment = new Comments({
        text,
        ...(replyTo ? replyTo : null),
        commentDate,
        commentAuthorAvatar,
        commentAuthorLogin,
        commentAuthorId: id,
    });

    Users.findOneAndUpdate(
        { _id: postAuthorId },
        { $push: { "posts.$[elem].comments": postComment } },
        { arrayFilters: [{ 'elem._id': postId }], multi: false, new: true }
    ).then(() => res.json(postComment))
    .catch(() => res.json(new Response({ erorMessage: 'add comment error' })));
});

router.put('/like-post-comment', auth.required, (req, res, next) => {
    const { payload: { id }, body: { postCommentId, postCommentAuthorId, postId } } = req;

    Users.findOneAndUpdate(
        { _id: postCommentAuthorId },
        { $push: { "posts.$[post].comments.$[comment].likedBy": id } },
        { arrayFilters: [{ 'post._id': postId }, { 'comment._id': postCommentId }], multi: false, new: true }
    ).then(user => {
        if (!user) {
            return res.sendStatus(400);
        }

        return res.json(new Response({ data: 'like success' }));
    })
});

router.put('/unlike-post-comment', auth.required, (req, res, next) => {
    const { payload: { id }, body: { postCommentId, postCommentAuthorId, postId } } = req;

    Users.findOneAndUpdate(
        { _id: postCommentAuthorId },
        { $pull: { "posts.$[post].comments.$[comment].likedBy": id } },
        { arrayFilters: [{ 'post._id': postId }, { 'comment._id': postCommentId }], multi: false, new: true }
    ).then(user => {
        if (!user) {
            return res.sendStatus(400);
        }

        return res.json(new Response({ data: 'unlike success' }));
    })
});

router.get('/get-comments-list', auth.required, (req, res, next) => {
    const { query: { postId, postAuthorId } } = req;

    Users.aggregate([
        { $match: { _id: ObjectId(postAuthorId) } },
        { $unwind: { path: '$posts' } },
        { $match: { 'posts._id': ObjectId(postId) } },
        { $project: {
            comments: '$posts.comments'
        } },
    ]).then(commentsResponse => res.json(commentsResponse[0]))
});

router.get('/get-user-avatar', auth.required, (req, res, next) => {
    const { query: { id } } = req;

    Users.aggregate([
        { $match: { _id: ObjectId(id) } },
        { $project: {
                userAvatar: 1
        } },
    ]).then(response => res.json(response[0]))
});

module.exports = router;
