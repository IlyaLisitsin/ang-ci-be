const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { Schema } = mongoose;

const CommentsSchema = new Schema({
    commentAuthorLogin: String,
    commentAuthorId: { type: Schema.Types.ObjectId, ref: 'Users' },
    commentAuthorAvatar: String,
    text: String,
    replyTo: { type: Schema.Types.ObjectId, ref: 'Comments' },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
    commentDate: Date,
});

const PostsSchema = new Schema({
    postId: Schema.Types.ObjectId,
    postAuthorLogin: String,
    postAuthorId: Schema.Types.ObjectId,
    postAuthorAvatar: String,
    image: String,
    postText: String,
    postDate: Date,
    comments: [CommentsSchema],
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
});

const UsersSchema = new Schema({
    email: String,
    login: String,
    hash: String,
    salt: String,
    userAvatar: String,
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
    subscriptions: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
    posts: [PostsSchema],
}, { collection: 'users-collection', versionKey: false });

UsersSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UsersSchema.methods.validatePassword = function(password) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UsersSchema.methods.generateJWT = function() {
    return jwt.sign({
        email: this.email,
        id: this._id,
    }, process.env.JWTTKN, { expiresIn: 60 * 60 });
};

UsersSchema.methods.getAuthUser = function() {
    return {
        user: {
            _id: this._id,
            email: this.email,
        },
        token: this.generateJWT(),
    };
};

UsersSchema.methods.getUserData = function() {
    return {
        user: {
            _id: this._id,
            email: this.email,
            login: this.login,
            userAvatar: this.userAvatar,
            subscribers: this.subscribers,
            subscriptions: this.subscriptions,
            posts: this.posts,
        },
        token: this.generateJWT(),
    };
};

UsersSchema.methods.getUserFeed = function() {
    const userPosts = this.posts.map(post => {
        post.comments = post.comments.map(post => post._id);
        return post;
    });
    const userAvatar = this.userAvatar;
    const login = this.login;
    const userId = this._id;
    const subscriptions = this.subscriptions;

    const token = this.generateJWT();

    const promise = new Promise(resolve => {
        mongoose.model('Users', UsersSchema).find({
            _id: { $in: this.subscriptions }
        }, function (err, res) {
            const postsResult = res.reduce(
                (postsCollection, nextUser) => {
                    const posts = nextUser.posts.map(post => {
                        post.comments = post.comments.map(post => post._id);
                        return post;
                    });
                    return postsCollection.concat(posts)
                },
                userPosts
            );

            resolve({
                posts: postsResult.sort((b, a) => (a.postDate < b.postDate) ? -1 : ((a.postDate > b.postDate) ? 1 : 0)),
                token,
                userAvatar,
                userId,
                subscriptions,
                login,
            });
        });
    });

    return promise;
};

UsersSchema.methods.getUserSearchResult = function(usersArray) {
    const usersSearchResult = usersArray.map(({ login, userAvatar, _id}) => ({ login, userAvatar, _id }));
    return {
        usersSearchResult,
        token: this.generateJWT(),
    }
};

UsersSchema.methods.getPostLikes = function(userIds) {
    const subscriptions = this.subscriptions;

    const promise = new Promise(resolve => {
        mongoose.model('Users', UsersSchema).find({
            _id: { $in: userIds.split(',') }
        }, function(err, res) {
            const likeResponse = res.map(liker => {
                return { userId: liker._id, userAvatar: liker.userAvatar, login: liker.login, isInSubscriptions: subscriptions.includes(liker._id) }
            });

            resolve(likeResponse);
        })
    });

    return promise;
};

mongoose.model('Users', UsersSchema);
mongoose.model('Posts', PostsSchema);
mongoose.model('Comments', CommentsSchema);
