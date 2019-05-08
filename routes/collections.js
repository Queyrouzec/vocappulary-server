require('dotenv').config();
const express = require('express');
const router = express.Router();
const { db } = require('../database/models.js')


/**
 * takes name, userId, and public
 * creates a new collection
 */
router.post('/', (req, res) => {

  const { name, userId, public } = req.body;

  db.createCollection(userId, name, public)
  .then((response) => {
    res.status(200).json(response);
  }).catch((err) => {
    console.log(err);
  });
});

/**
 * takes userId
 * gets all collections related to a user
 */
router.post('/get', (req, res)=>{
  
  let { userId } = req.body
  
  db.getAllCollections(userId)
  .then((result)=>{
    res.json(result)
  })
  .catch((err)=>{
    res.send(err)
  })
});

/**
 * 
 */
router.patch('/', (req, res) => {

  const { id, public, name} = req.body

  db.editCollection(id, {public, name})
    .then(collectionRow => {
      res.status(200).json(collectionRow);
    })
    .catch(err => {
      console.error(err);
      res.sendStatus(500);
    });

})


router.post('/copy', (req, res) => {

  const { collectionId, userId, isPublic } = req.body

  db.copyCollection(collectionId, userId, isPublic)
    .then(collectionItems => {
      res.status(200).json(collectionItems)
    })
    .catch(err => {
      console.error(err);
      res.sendStatus(500);
    })

})


module.exports = router;