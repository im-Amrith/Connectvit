const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupMessageSchema = new Schema({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'group',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }]
});

module.exports = mongoose.model('groupMessage', GroupMessageSchema); 