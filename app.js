require('dotenv').config();
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { app } = require('./appInitialization');
const { db } = require('./database/models');


app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));
app.use(bodyParser.json({ type: 'application/json' }));


const images = require('./routes/images');
const textToSpeech = require('./routes/text-to-speech.js');
const collections = require('./routes/collections');
const collectionItems = require('./routes/collectionItems');
const auth = require('./routes/auth');
const user = require('./routes/user');
const speechToText = require('./routes/speech-to-text');
const buddies = require('./routes/buddies');
const messages = require('./routes/messages');
const requests = require('./routes/requests');


app.use('/images', images);
app.use('/texttospeech', textToSpeech);
app.use('/collections', collections);
app.use('/collectionItems', collectionItems);
app.use('/auth', auth);
app.use('/user', user);
app.use('/upload', speechToText);
app.use('/buddies', buddies);
app.use('/messages', messages);
app.use('/requests', requests);


/**
 * returns all languages
 */
app.get('/languages', (req, res) => {
  db.getAllLanguages()
    .then((languages) => {
      res.json(languages);
    });
});
