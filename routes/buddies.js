const router = require('express').Router();
const { db } = require('../database/models.js');
const { isAuthenticated } = require('../middleware');

router.get('/all/', isAuthenticated, (req, res) => {
  const { id } = req.query;

  db.getBuddies(id)
    .then((buddiesList) => {
      res.json(buddiesList);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      res.sendStatus(500);
    });
});

module.exports = router;
