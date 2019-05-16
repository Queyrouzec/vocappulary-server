require('dotenv').config();
const app = require('express')();

const port = 3000;
// eslint-disable-next-line no-console
const httpInstance = app.listen(port, () => console.log(`Vocapp server listening on port ${port}!`));

module.exports = {
  app,
  httpInstance,
};
