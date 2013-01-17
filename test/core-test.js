var clieasy = require('cli-easy')
  , assert  = require('assert')
  , path    = require('path')
  , core    = path.join(__dirname, '../usage/core')
  ;

clieasy.describe('usage/core')
  .use(core)
  .discuss('when using `usage/core`')
  //
  // specify a required option
  //
  .discuss('with the `--required` option')
    .arg('--required wat')
    .arg('--raw')
    .expect('should return `wat`', /wat/)
  .undiscuss()
  //
  // get the usage information
  //
  .discuss('with the `--help` option')
    .arg('--help')
    .arg('--raw')
    .expect('should return `-h`', /\-h/)
    .expect('should return `--help`', /\-\-help/)
    .expect('should return `-v`', /\-v/)
    .expect('should return `--version`', /\-\-version/)
    .expect('should return `--verbose`', /\-\-verbose/)
  .undiscuss()
  //
  // get the version
  //
  .discuss('with the `--version` option')
    .arg('--version')
    .arg('--raw')
    .expect('should return `1.0.1`', /1\.0\.1/)
  .undiscuss()
  //
  // testing verbose output
  //
  .discuss('with the `--verbose` option')
    .arg('--required testing')
    .arg('--verbose')
    .arg('--raw')
    .expect('should return verbose output', function (stdout) {
      return stdout.match(/load\./m) &&     // load. line
             stdout.match(/prompt\./m) &&   // prompt. line
             stdout.match(/input\./m);      // input. line
    })
["export"](module);