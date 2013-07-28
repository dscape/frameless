var clieasy   = require('cli-easy')
  , assert    = require('assert')
  , path      = require('path')
  , fs        = require('fs')
  , crypto    = require('crypto')
  , bin       = path.join(__dirname, '../usage/encrypt-aes')
  , frameless = require('../lib/frameless')
  , key       = fs.readFileSync(
    path.join(__dirname, 'keys', 'id_rsa'), 'utf-8')
  ;

function encrypt(text) {
  var cipher = crypto.createCipher('aes-256-cbc', key);
  var crypted = cipher.update(text,'utf8', 'hex') + cipher.final('hex');
  return crypted;
}

function decrypt(text) {
  var decipher = crypto.createDecipher('aes-256-cbc', key);
  var dec = decipher.update(text,'hex', 'utf8') + decipher.final('utf8');
  return dec;
}

clieasy.describe('usage/encrypt')
  .use(
    [ 'echo "a" | '
    , bin + ' -k ' + path.join(__dirname, 'keys', 'id_rsa')
    ].join(''))
  .discuss('when using `usage/encrypt-aes`')
  .discuss('with our test key')
    .expect('should encrypt the same as node does', function (h) {
      return h === encrypt("a\n");
    })
["export"](module);

clieasy.describe('usage/decrypt')
  .use(
    [ 'echo -ne "' + encrypt('a\n') + '" | '
    , bin + ' -d -k ' + path.join(__dirname, 'keys', 'id_rsa')
    ].join(''))
  .discuss('when using `usage/encrypt-aes`')
  .discuss('with our test key')
    .expect('should decrypt the same as node does', function (h) {
      return h === "a\n";
    })
["export"](module);

var cycle = 
  [ 'echo -ne "' + encrypt('a\n') + '" | '
  , bin + ' -d -k ' + path.join(__dirname, 'keys', 'id_rsa') + ' | '
  , bin + ' -k ' + path.join(__dirname, 'keys', 'id_rsa') + ' | '
  , bin + ' -d -k ' + path.join(__dirname, 'keys', 'id_rsa')
  ].join('');
console.log(cycle)
clieasy.describe('usage/cycle')
  .use(cycle)
  .discuss('when using `usage/encrypt-aes`')
  .discuss('with our test key')
    .expect('should cycle isomorphically', function (h) {
      return h === "a\n";
    })
["export"](module);
