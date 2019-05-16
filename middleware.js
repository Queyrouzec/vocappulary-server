/* eslint-disable no-console */
const { db } = require('./database/models');

module.exports = {
  isAuthenticated: (req, res, next) => {
    const { userId, firebase } = req.body;
    db.verifyUser(
      userId || req.query.id || req.param.id,
      firebase || req.query.firebase,
    ).then((result) => {
      console.log(result);
      next();
    }).catch((err) => {
      console.log(err);
      res.redirect('/auth/');
    });
  },
};
