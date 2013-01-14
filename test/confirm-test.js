var clieasy = require('cli-easy')
  , assert  = require('assert')
  , path    = require('path')
  , confirm = path.join(__dirname, '../usage/confirm')
  ;

clieasy.describe('usage/confirm')
  .use(confirm)
  .discuss('when using `usage/confirm`')
  //
  // specify a required option
  //
  .discuss('with the `--yes` option')
    .arg('--whoami dawg')
    .arg('--raw')
    .arg('--yes')
    .expect('should return `dawg`', /dawg/)
["export"](module);