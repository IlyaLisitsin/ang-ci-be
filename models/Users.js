const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { Schema } = mongoose;

const UsersSchema = new Schema({
    email: String,
    login: String,
    hash: String,
    salt: String,
    userAvatar: String,
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
    subscriptions: [{ type: Schema.Types.ObjectId, ref: 'Users' }],
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
        },
        token: this.generateJWT(),
    };
};

mongoose.model('Users', UsersSchema);
