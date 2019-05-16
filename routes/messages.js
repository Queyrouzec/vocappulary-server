const router = require('express').Router();
const { db } = require('../database/models.js');
// const { isAuthenticated } = require('../middleware');


router.get('/all/:userId/:buddyId', (req, res) => {
  const { userId, buddyId } = req.params;

  db.getMessages(userId, buddyId)
    .then((messages) => {
      res.json({ messages });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      res.sendStatus(500);
    });
});

router.post('/new', (req, res) => {
  const { userId, buddyId, text } = req.body;

  db.addMessage(userId, buddyId, text)
    .then((newMessage) => {
      res.json(newMessage);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      res.sendStatus(500);
    });
});

module.exports = router;
