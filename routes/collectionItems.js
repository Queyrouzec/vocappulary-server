require('dotenv').config();
const router = require('express').Router();
const { db } = require('../database/models.js');
const { isAuthenticated } = require('../middleware');


/**
 * takes collectionId
 * gets an array of all the collection items of a collection with their native transltion, current
 * translation, collectionItemId, and image url
 */
router.get('/', isAuthenticated, (req, res) => {
  db.getAllCollectionItems(req.query.id)
    .then((collection) => {
      res.json(collection);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      res.sendStatus(404);
    });
});

/**
 * takes collectionId, imgUrl, and wordId
 * creates a new collection item, and adds a translation of the word if nessisary
 */
router.post('/', isAuthenticated, (req, res) => {
  const { collectionId, imgUrl, wordId } = req.body;

  db.makeNewCollectionItem(collectionId, imgUrl, wordId)
    .then((item) => {
      res.status(200).json(item);
    })
    .catch((err) => {
      res.status(400).send({ message: 'There was an error making new item' });
      // eslint-disable-next-line no-console
      console.error(err);
    });
});

module.exports = router;
