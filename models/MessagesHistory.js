const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessagesHistorySchema = new Schema({
    lowerIdHigherId: String,
    messages: [{ sender: String, text: String }],
    lastActivity: String,
}, { collection: 'messages-history', versionKey: false });

mongoose.model('MessagesHistory', MessagesHistorySchema);
