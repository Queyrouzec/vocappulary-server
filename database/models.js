const { Op } = require('sequelize');
const {
  Collection,
  CollectionItem,
  User,
  Language,
  Word,
  Translation,
  Buddies,
  Request,
  Message,
} = require('./config');
const { googleTranslate, googleTextToSpeech } = require('../apiHelpers');


/**
 * Finds a translation of a single collection item, and if the translation doesn't exist it creates
 * one.
 * @param {number} collectionItemId
 * @param {boolean} getAudio - False by default. When set to true gets the audio of a certain word
 * if it is supported by text-to-speech.
 * @returns @tyepof {object} - All the relavant collection item information.
 *    @property {itemId} - Number representing the id of the collectionItem.
 *    @property {url_image} - The url for the image of the collection item.
 *    @property {currentTranslation} - The translation of the learning language.
 *    @property {nativeTranslation} - The translation of the user's native learning language.
 *    @property {currentAudioUrl} - The url for the audio of the learning language.
 */
const findOrCreateTranslations = (collectionItemId, getAudio = false) => CollectionItem.findOne({
  where: {
    id: collectionItemId,
  },
})


  .then(collectionItemRow => Promise.all([collectionItemRow.getCollection(), collectionItemRow]))


  .then(([collectionRow, collectionItemRow]) => Promise
    .all([collectionRow.getUser(), collectionItemRow]))


  // gets rows in the follwing order: collectionItem, native language, current language, english
  // language
  .then(([userRow, collectionItemRow]) => Promise.all([

    new Promise((res, rej) => {
      userRow.getNative_language()
        .then((nativeLanguageRow) => {
          res(nativeLanguageRow);
        })
        .catch((err) => {
          rej(err);
        });
    }),

    new Promise((res, rej) => {
      userRow.getCurrent_language()
        .then((currentLanguageRow) => {
          res(currentLanguageRow);
        })
        .catch((err) => {
          rej(err);
        });
    }),

    new Promise((res, rej) => {
      Language.findOne({
        where: {
          name: 'english',
        },
      })
        .then((englishRow) => {
          res(englishRow);
        })
        .catch((err) => {
          rej(err);
        });
    }),

    collectionItemRow,

  ]))


  .then(([nativeLanguageRow, currentLanguageRow, englishLanguageRow, collectionItemRow]) => Promise
    .all([

      new Promise((res, rej) => {
        Translation.findOne({
          where: {
            wordId: collectionItemRow.wordId,
            languageId: nativeLanguageRow.id,
          },
        })

          .then((transation) => {
            if (transation) {
              res(transation);
            } else {
              Translation.findOne({
                where: {
                  wordId: collectionItemRow.wordId,
                  languageId: englishLanguageRow.id,
                },
              })

                .then(englishTranslationRow => googleTranslate(englishTranslationRow.text, 'en', nativeLanguageRow.lang_code))

                .then(nativeLanguageText => Translation.create({
                  text: nativeLanguageText,
                  languageId: nativeLanguageRow.id,
                  wordId: collectionItemRow.wordId,
                }))

                .then((newTransation) => {
                  res(newTransation);
                });
            }
          })
          .catch((err) => {
            rej(err);
          });
      }),

      new Promise((res, rej) => {
        Translation.findOne({
          where: {
            wordId: collectionItemRow.wordId,
            languageId: currentLanguageRow.id,
          },
        })

          .then((transation) => {
            if (transation) {
              res(transation);
            } else {
              Translation.findOne({
                where: {
                  wordId: collectionItemRow.wordId,
                  languageId: englishLanguageRow.id,
                },
              })

                .then(englishTranslationRow => googleTranslate(englishTranslationRow.text, 'en', currentLanguageRow.lang_code))

                .then(currentLanguageText => Translation.create({
                  text: currentLanguageText,
                  languageId: currentLanguageRow.id,
                  wordId: collectionItemRow.wordId,
                }))

                .then((newTransation) => {
                  res(newTransation);
                });
            }
          })
          .catch((err) => {
            rej(err);
          });
      }),

      currentLanguageRow,

      collectionItemRow,

    ]))


  .then(([nativeTranslationRow, currentTranslationRow, currentLanguageRow, collectionItemRow]) => Promise.all([
    new Promise((res, rej) => {
      if (currentTranslationRow.audio_url || !getAudio || !currentLanguageRow.transTTS) {
        res(currentTranslationRow);
      } else {
        googleTextToSpeech(currentTranslationRow.text, currentLanguageRow.lang_code)

          .then(currentAudioUrl => currentTranslationRow.update({
            audio_url: currentAudioUrl,
          }, {
            fields: ['audio_url'],
          }))

          .then((newCurrentTranslationRow) => {
            res(newCurrentTranslationRow);
          })
          .catch((err) => {
            rej(err);
          });
      }
    }),
    nativeTranslationRow,
    collectionItemRow,
  ]))


  .then(([currentTranslationRow, nativeTranslationRow, collectionItemRow]) => ({
    itemId: collectionItemRow.id,
    url_image: collectionItemRow.image_url,
    currentTranslation: currentTranslationRow.text,
    nativeTranslation: nativeTranslationRow.text,
    currentAudioUrl: currentTranslationRow.audio_url,
  }));


/**
 * takes a lits of words and checks the database for them. If they don't exist it makes an english
 * version of them. Then it returns an object containing the rows of the words in the database in
 * two arrays. One for words with the native language, one for the words without it.
 * @param {array} imageWordList - a list of english strings to be put or retrieved from the
 * database.
 * @param {string} nativeLanguage - native language
 * @returns {object} - object that has complete requested words has two arrays: completeWords, and
 * incompleteWords.
 * Both contain the columns for the words in the word table
 */
const checkWords = (imageWordList, nativeLanguage) => {
  const words = {
    completeWords: [],
    incompleteWords: [],
  };
  // makes an array of promises to find the relavant word columns
  const searchWordPromises = imageWordList.map(engWord => new Promise((res, rej) => {
    Word.findOne({ where: { eng_word: engWord } })
      .then((col) => {
        res(col);
      })
      .catch((err) => {
        rej(err);
      });
  }));
  return Language.findOne({ where: { lang_code: 'en' } })
    .then((engRow) => {
      return Promise.all(searchWordPromises)
        .then((wordCols) => {
          const nonExistantWordsPromises = [];
          // adds words that exist in the database to the wordCols array.
          const filteredWordCols = wordCols.filter((word, index) => {
            if (!word) {
              // if the word doesn't exist in the database it creates a row for it in the word
              // table and an english translation.
              nonExistantWordsPromises.push(
                new Promise((res, rej) => {
                  Word.create({ eng_word: imageWordList[index] })
                    .then((wordCol) => {
                      Translation.create({
                        text: wordCol.eng_word,
                        wordId: wordCol.id,
                        languageId: engRow.id,
                      })
                        .then(() => {
                          res(wordCol);
                        })
                        .catch((err) => {
                          rej(err);
                        });
                    });
                }),
              );
              return false;
            }
            return true;
          });
          // runs the array of promises to create words in the database
          return Promise.all(nonExistantWordsPromises)
            .then((newWordCols) => {
              // pulls together the list of newly created words and old words.
              const allWordCols = filteredWordCols.concat(newWordCols);
              // makes an array of promises to get all the translations
              const getTranslationPromises = allWordCols.map(word => new Promise((res, rej) => {
                // gets the language cols from the language tables for all existing languages of
                // the word
                word.getWord()
                  .then(language => res(language))
                  .catch((err) => {
                    rej(err);
                  });
              }));
              return Promise.all(getTranslationPromises)
                .then((language) => {
                  // gets the code of the native language to see if the word has that language
                  return Language.findOne({ where: { lang_code: nativeLanguage } })
                    .then((nativeLanguage) => {
                      // gets all words with a translation of the native language
                      words.completeWords = allWordCols.filter((word, index) => {
                        let hasNative = false;
                        language[index].forEach((lang) => {
                          if (lang.id === nativeLanguage.id) {
                            hasNative = true;
                          }
                        });
                        return hasNative;
                      });
                      // gets all words without a translation of the native language
                      words.incompleteWords = allWordCols.filter((word, index) => {
                        let hasNative = false;
                        language[index].forEach((lang) => {
                          if (lang.id === nativeLanguage.id) {
                            hasNative = true;
                          }
                        });
                        return !hasNative;
                      });
                      // object returned by the function.
                      return words;
                    });
                });
            });
        });
    });
};


const selectWord = (wordId, collectionId, imgUrl) => CollectionItem.create({
  collectionId,
  wordId,
  image_url: imgUrl,
});


/**
 * gets the collection items of a specific collection.
 * @param {number} collectionId
 * @returns - returns an object with the collection item ids, image urls, active language, and
 * native language
 */
const getAllCollectionItems = collectionId => Collection.findOne({
  where: {
    id: collectionId,
  },
})
  .then(collectionRow => collectionRow.getCollection_items())
  .then(collectionItems => Promise.all(collectionItems.map(item => new Promise((res, rej) => {
    findOrCreateTranslations(item.id, true)
      .then((returnItem) => {
        res(returnItem);
      })
      .catch((err) => {
        rej(err);
      });
  }))));


/**
 *
 * @param {number} wordId
 * @param {string} language
 * @returns - a promise with the language row.
 */
const getTranslation = (wordId, language) => Language.findOne({ where: { lang_code: language } })
  .then(langRow => Translation.findOne({ where: { wordId, languageId: langRow.id } }));


/**
 * adds a trnastlation to a word
 * @param {number} wordId
 * @param {string} language - lang_code
 * @param {string} translation
 * @returns - promise with new translation row
 */
const addTranslationToWord = (wordId, language, translation) => Language
  .findOne({ where: { lang_code: language } })
  // finds or creates the relavant language
  .then(langCol => Translation.findOrCreate({
    where: { wordId, languageId: langCol.id },
    defaults: { wordId, text: translation, languageId: langCol.id },
  }))
  // returns only the translated column
  .then(translatedCol => translatedCol[0]);


/**
 * Adds translation of word if possible, adds a count to the collection count, and creates a new
 * collection item
 * @param {number} collectionId
 * @param {string} image_url
 * @param {number} wordId
 * @returns an object with image_url and currentLangText. The currentLangText is the language of
 * the text they are learning.
 */
const makeNewCollectionItem = (collectionId, imageUrl, wordId) => Promise.all([
  CollectionItem.create({
    collectionId,
    image_url: imageUrl,
    wordId,
  }),
  Collection.findOne({
    where: {
      id: collectionId,
    },
  }),
])
  .then(([collectionItemRow, collectionRow]) => {
    collectionRow.update({
      count: collectionRow.count + 1,
    }, {
      fields: ['count'],
    });
    return findOrCreateTranslations(collectionItemRow.id, true);
  });


/**
 * makes a collection
 * @param {number} userId
 * @param {string} name
 * @param {boolean} isPublic - optional
 * @returns collection row
 */
const createCollection = (userId, name, isPublic = false) => Collection.create({
  name,
  is_public: isPublic,
  count: 0,
  userId,
});


const deleteCollection = (name, userId) => Collection.destroy({
  where: {
    name,
    userId,
  },
});


const getAllCollectionItemsForUser = userId => Collection.findAll({
  where: {
    userId,
  },
})
  .then(collectionRows => Promise.all(
    collectionRows.map(collectionRow => new Promise((res, rej) => {
      collectionRow.getCollection_items()
        .then((collectionItemRows) => {
          res(collectionItemRows);
        })
        .catch((err) => {
          rej(err);
        });
    })),
  ))
  .then(unflattenedUserCollectionItems => Promise.all(
    unflattenedUserCollectionItems.reduce((seed, array) => seed.concat(array), [])
      .map(userCollectionItem => new Promise((res, rej) => {
        findOrCreateTranslations(userCollectionItem.id, true)
          .then((userCollectionItemRow) => {
            res(userCollectionItemRow);
          })
          .catch((err) => {
            rej(err);
          });
      })),
  ));


/**
 * gets all collections by userId
 * @param {number} userId
 * @returns - object containing the collection rows
 */
const getAllCollections = userId => Collection.findAll({ where: { userId } });


/**
 * @returns all language rows
 */
const getAllLanguages = () => Language.findAll();


const getLanguageById = languageId => Language.findOne({
  where: {
    userId: languageId,
  },
});


const makeUser = (username, email, currentLanguageId, nativeLanguageId, points, firebase) => User
  .create({
    username, email, currentLanguageId, nativeLanguageId, points, firebase,
  });

// made this for jest testing
const deleteUser = (username, email) => {
  User.destroy({
    where: {
      username,
      email,
    },
  });
};


const findUser = (email, firebase) => User.findOne({
  where: {
    email,
    firebase,
  },
});

const verifyUser = (id, firebase) => User.findOne({
  where: {
    id,
    firebase,
  },
});


const editUser = (userId, currentLanguageId, nativeLanguageId, email) => {
  const fields = [];
  const updateObj = {};
  if (currentLanguageId) {
    fields.push('currentLanguageId');
    updateObj.currentLanguageId = currentLanguageId;
  }
  if (nativeLanguageId) {
    fields.push('nativeLanguageId');
    updateObj.nativeLanguageId = nativeLanguageId;
  }
  if (email) {
    fields.push('email');
    updateObj.email = email;
  }
  return User.findOne({
    where: {
      id: userId,
    },
  })
    .then(userRow => userRow.update(updateObj, { fields }));
};


const getBuddies = userId => User.findOne({
  where: {
    id: userId,
  },
})
  .then(userRow => Promise.all([
    userRow.getBuddy1s(),
    userRow.getBuddy2s(),
  ]))
  .then(([buddySet1, buddySet2]) => buddySet1.concat(buddySet2).map(buddyRow => ({
    id: buddyRow.id,
    username: buddyRow.username,
    nativeLanguageId: buddyRow.nativeLanguageId,
    currentLanguageId: buddyRow.currentLanguageId,
  })));


const getRequests = userId => User.findOne({
  where: {
    id: userId,
  },
})
  .then(userRow => userRow.getPotentialBuddies())
  .then(potentialBuddyRows => potentialBuddyRows.map(potentialBuddyRow => ({
    id: potentialBuddyRow.id,
    username: potentialBuddyRow.username,
    nativeLanguageId: potentialBuddyRow.nativeLanguageId,
    currentLanguageId: potentialBuddyRow.currentLanguageId,
  })));


const sendRequest = (userId, potentialBuddyId) => Request.create({
  requesterId: userId,
  potentialBuddyId,
});


const acceptBuddyRequest = (userId, newBuddyId) => Request.findOne({
  where: {
    potentialBuddyId: userId,
    requesterId: newBuddyId,
  },
})
  .then((requestRow) => {
    requestRow.destroy();
    return Buddies.create({
      buddy1Id: requestRow.requesterId,
      buddy2Id: requestRow.potentialBuddyId,
    });
  });


const rejectBuddyRequest = (userId, rejectedBuddyId) => Request.findOne({
  where: {
    potentialBuddyId: userId,
    requesterId: rejectedBuddyId,
  },
})
  .then(requestRow => requestRow.destroy());


const getPotentialBuddies = userId => Request.findAll({
  where: {
    [Op.or]: {
      potentialBuddyId: userId,
      requesterId: userId,
    },
  },
})


  .then(userRequestRows => Promise.all([
    Buddies.findAll({
      where: {
        [Op.or]: [{ buddy1Id: userId }, { buddy2Id: userId }],
      },
    }),
    userRequestRows,
  ]))


  .then(([buddiesRows, userRequestRows]) => User.findAll({
    where: {
      id: {
        [Op.not]: buddiesRows
          .reduce((seed, buddyRow) => seed.concat([buddyRow.buddy1Id, buddyRow.buddy2Id]), [])
          .concat(userRequestRows
            .reduce((seed, userRequestRow) => seed
              .concat([userRequestRow.potentialBuddyId, userRequestRow.requesterId]), [])),
      },
    },
  })


    .then(userRows => Promise.all(
      userRows.map(userRow => new Promise((resOuter, rejOuter) => {
        Promise.all([
          new Promise((res, rej) => {
            userRow.getNative_language()
              .then((nativeLanguageRow) => {
                res(nativeLanguageRow);
              })
              .catch((err) => {
                rej(err);
              });
          }),

          new Promise((res, rej) => {
            userRow.getCurrent_language()
              .then((currentLanguageRow) => {
                res(currentLanguageRow);
              })
              .catch((err) => {
                rej(err);
              });
          }),

        ])


          .then(([nativeLanguage, currentLanguage]) => {
            resOuter({
              id: userRow.id,
              username: userRow.username,
              nativeLanguage,
              currentLanguage,
            });
          })


          .catch((err) => {
            rejOuter(err);
          });
      })),
    ))


    .then(userRows => userRows.filter(userRow => userRow.id !== userId)));


const getMessages = (userId, buddyId) => Promise.all([
  Message.findAll({
    where: {
      senderId: userId,
      receiverId: buddyId,
    },
  }),
  Message.findAll({
    where: {
      senderId: buddyId,
      receiverId: userId,
    },
  }),
])
  .then(([userMessages, buddyMessages]) => userMessages
    .concat(buddyMessages)
    .sort((a, b) => {
      if (a.createdAt.getTime() > b.createdAt.getTime()) {
        return 1;
      }
      return -1;
    }));


const addMessage = (userId, buddyId, text) => Message.create({
  senderId: userId,
  receiverId: buddyId,
  text,
});


module.exports.db = {
  checkWords,
  getTranslation,
  addTranslationToWord,
  getAllCollectionItems,
  makeNewCollectionItem,
  selectWord,
  createCollection,
  getAllCollections,
  getAllLanguages,
  makeUser,
  findUser,
  verifyUser,
  deleteUser,
  deleteCollection,
  findOrCreateTranslations,
  getAllCollectionItemsForUser,
  editUser,
  getLanguageById,
  getBuddies,
  getRequests,
  sendRequest,
  acceptBuddyRequest,
  rejectBuddyRequest,
  getPotentialBuddies,
  getMessages,
  addMessage,
};
