var clieasy  = require('cli-easy')
  , assert   = require('assert')
  , path     = require('path')
  , reserved = path.join(__dirname, '../usage/reserved')
  ;

clieasy.describe('usage/reserved')
  .use(reserved)
  .discuss('when using `usage/reserved`')
  //
  // should fail because it tries to use one of the reserved options
  //
  .discuss('with no options')
    .arg('--raw')
    .expect('should return `error`',
      /`--help` is an reserved option. please rename it/)
["export"](module);