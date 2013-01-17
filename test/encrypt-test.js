var clieasy   = require('cli-easy')
  , assert    = require('assert')
  , path      = require('path')
  , encrypt   = path.join(__dirname, '../usage/encrypt-aes')
  , frameless = require('../lib/frameless')
  ;

//clieasy.describe('usage/encrypt')
//  .use(encrypt)
//  .discuss('when using `usage/encrypt-aes`')
//  .discuss('with all required options')
//    .arg('-k ' + path.join(frameless.tilde, '.ssh', 'id_rsa'))
//    .expect('should be able to parse the user', function (h) {
//      var lines = h.split('\n');
//      dotfile_path = lines.shift();
//      response = JSON.parse(lines.join('\n'));
//      return true;
//    })
//    .expect('response user id should be `maciej`', function () {
//      return response.id && ~response.id.indexOf('maciej');
//    })
//    .expect('response should have been ok', function () {
//      return response.ok;
//    })
//    .expect('dot file should exist', function () {
//      dotfile = fs.readFileSync(dotfile_path, 'utf-8');
//      return true;
//    })
//    .expect('dot file should be valid json', function () {
//      dotfile = JSON.parse(dotfile);
//      return true;
//    })
//    .expect('protocol to be `http`', function () {
//      return dotfile.protocol === 'http';
//    })
//    .expect('`usr-name` not to be saved', function () {
//      return !dotfile['usr-name'];
//    })
//    .expect('`usr-pwd` not to be saved', function () {
//      return !dotfile['usr-pwd'];
//    })
//    .expect('`usr-email` not to be saved', function () {
//      return !dotfile['usr-email'];
//    })
//    .expect('hostname to be encrypted', function () {
//      encrypted.hostname = dotfile.hostname;
//      return dotfile.hostname !== 'localhost:5984';
//    })
//    .expect('password to be encrypted', function () {
//      encrypted.password = dotfile.password;
//      return dotfile.password !== 'food';
//    })
//    .expect('foobar', function () { return true; })
//["export"](module);
//