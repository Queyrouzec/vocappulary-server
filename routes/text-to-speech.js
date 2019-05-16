require('dotenv').config();
const router = require('express').Router();
const { googleTextToSpeech } = require('../apiHelpers');
// const { isAuthenticated } = require('../middleware')


router.get('/:word', (req, res) => {
  const { word } = req.params;

  googleTextToSpeech(word)
    .then((mp3Path) => {
      res.send(mp3Path);
    });
});


module.exports = router;
