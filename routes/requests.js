/* eslint-disable no-console */
const router = require('express').Router();
const { db } = require('../database/models.js');
const { isAuthenticated } = require('../middleware');

router.post('/new', isAuthenticated, (req, res) => {
  const { userId, potentialBuddyId } = req.body;

  db.sendRequest(userId, potentialBuddyId)
    .then((request) => {
      res.status(201).json(request);
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

router.get('/all', isAuthenticated, (req, res) => {
  const { id } = req.query;

  db.getRequests(id)
    .then((requests) => {
      res.json(requests);
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

router.post('/accept', isAuthenticated, (req, res) => {
  const { userId, newBuddyId } = req.body;

  db.acceptBuddyRequest(userId, newBuddyId)
    .then((buddyRow) => {
      res.status(201).json(buddyRow);
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

router.post('/reject', (req, res) => {
  const { userId, rejectedBuddyId } = req.body;

  db.rejectBuddyRequest(userId, rejectedBuddyId)
    .then(() => {
      res.status(201).json({ message: 'request has been rejected' });
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

router.get('/potential/:userId', (req, res) => {
  const { userId } = req.params;

  db.getPotentialBuddies(userId)
    .then((potentialBuddies) => {
      res.json(potentialBuddies);
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

module.exports = router;
