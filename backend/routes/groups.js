const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');

// @route   POST api/groups
// @desc    Create a new group
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Create new group
    const newGroup = new Group({
      name,
      description,
      admin: req.user.id,
      members: [req.user.id]
    });

    const group = await newGroup.save();
    res.json(group);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/groups
// @desc    Get all groups user is a member of
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('admin', 'name avatar')
      .populate('members', 'name avatar');
    
    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/groups/:id
// @desc    Get group by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('admin', 'name avatar')
      .populate('members', 'name avatar');
    
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is a member
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

// @route   PUT api/groups/:id
// @desc    Update group
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    let group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is admin
    if (group.admin.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to update this group' });
    }

    group = await Group.findByIdAndUpdate(
      req.params.id,
      { $set: { name, description } },
      { new: true }
    ).populate('admin', 'name avatar')
     .populate('members', 'name avatar');

    res.json(group);
  } catch (err) {
    console.error(err.message);
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

    // Check if user is admin
    if (group.admin.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this group' });
    }

    // Delete all messages associated with this group
    await GroupMessage.deleteMany({ group: req.params.id });
    
    // Delete the group
    await group.remove();

    res.json({ msg: 'Group deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/groups/:id/members
// @desc    Add a member to group
// @access  Private
router.put('/:id/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is admin
    if (group.admin.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to add members to this group' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ msg: 'User is already a member of this group' });
    }

    group.members.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(req.params.id)
      .populate('admin', 'name avatar')
      .populate('members', 'name avatar');

    res.json(updatedGroup);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/groups/:id/members/:userId
// @desc    Remove a member from group
// @access  Private
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if user is admin or removing self
    if (group.admin.toString() !== req.user.id && req.params.userId !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to remove this member' });
    }

    // Cannot remove admin
    if (req.params.userId === group.admin.toString()) {
      return res.status(400).json({ msg: 'Cannot remove group admin' });
    }

    // Check if user is a member
    if (!group.members.includes(req.params.userId)) {
      return res.status(400).json({ msg: 'User is not a member of this group' });
    }

    // Remove member
    group.members = group.members.filter(
      member => member.toString() !== req.params.userId
    );

    await group.save();

    const updatedGroup = await Group.findById(req.params.id)
      .populate('admin', 'name avatar')
      .populate('members', 'name avatar');

    res.json(updatedGroup);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 