const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  avatar: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('group', GroupSchema); 