const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');

// @route   GET api/groups
// @desc    Get all groups for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('admin', 'name email')
      .select('-messages')
      .sort({ updatedAt: -1 });
    
    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/groups/:id
// @desc    Get a specific group
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.some(member => member._id.toString() === req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to access this group' });
    }

    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/groups/:id/messages
// @desc    Get messages for a specific group
// @access  Private
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to access this group' });
    }

    const messages = await Message.find({ group: req.params.id })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/groups
// @desc    Create a group
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ msg: 'Group name is required' });
  }

  try {
    const newGroup = new Group({
      name,
      description,
      admin: req.user.id,
      members: [req.user.id]
    });

    const group = await newGroup.save();
    
    await group.populate('admin', 'name email');
    await group.populate('members', 'name email');

    res.json(group);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/groups/:id/messages
// @desc    Add a message to a group
// @access  Private
router.post('/:id/messages', auth, async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ msg: 'Message content is required' });
  }

  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to message this group' });
    }

    const newMessage = new Message({
      content,
      sender: req.user.id,
      group: req.params.id
    });

    const message = await newMessage.save();
    
    await message.populate('sender', 'name email');

    // Update group's last activity
    group.updatedAt = Date.now();
    await group.save();

    res.json(message);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/groups/:id/members
// @desc    Add a member to a group
// @access  Private
router.post('/:id/members', auth, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email is required' });
  }

  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is the admin of the group
    if (group.admin.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Only the group admin can add members' });
    }

    // Find the user to add
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is already a member
    if (group.members.includes(user._id)) {
      return res.status(400).json({ msg: 'User is already a member of this group' });
    }

    // Add user to group
    group.members.push(user._id);
    await group.save();
    
    await group.populate('admin', 'name email');
    await group.populate('members', 'name email');

    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id/members/:userId
// @desc    Remove a member from a group
// @access  Private
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is the admin of the group
    if (group.admin.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Only the group admin can remove members' });
    }

    // Check if removing the admin
    if (req.params.userId === group.admin.toString()) {
      return res.status(400).json({ msg: 'Admin cannot be removed from the group' });
    }

    // Remove user from group
    group.members = group.members.filter(
      member => member.toString() !== req.params.userId
    );
    
    await group.save();
    
    await group.populate('admin', 'name email');
    await group.populate('members', 'name email');

    res.json(group);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id/leave
// @desc    Leave a group
// @access  Private
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.id)) {
      return res.status(400).json({ msg: 'You are not a member of this group' });
    }

    // Check if user is the admin
    if (group.admin.toString() === req.user.id) {
      return res.status(400).json({ msg: 'Admin cannot leave the group. Transfer ownership first or delete the group.' });
    }

    // Remove user from group
    group.members = group.members.filter(
      member => member.toString() !== req.user.id
    );
    
    await group.save();

    res.json({ msg: 'Successfully left the group' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id
// @desc    Delete a group
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is the admin of the group
    if (group.admin.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Only the group admin can delete the group' });
    }

    // Delete all messages in the group
    await Message.deleteMany({ group: req.params.id });
    
    // Delete the group
    await Group.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Group deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router; 