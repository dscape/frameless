var clieasy  = require('cli-easy')
  , assert   = require('assert')
  , path     = require('path')
  , fs       = require('fs')
  , couchdb  = path.join(__dirname, '../usage/couchdb-create-user')
  , dotfile
  ;

var response     = {}
  , encrypted    = {}
  , dotfile_path = ''
  ;

//
// first run, no dot file should exist
//
clieasy.describe('usage/dotfiles-setup')
  .use(couchdb)
  .discuss('when using `usage/couchdb-*`')
  .arg('--raw')
  .discuss('with the `--help` option')
    .arg('--help')
    .expect('should return `--setup`', /\-\-setup/)
  .undiscuss()
  .discuss('with all required options')
    .arg('--hostname anotherhost:5984')
    .arg('--protocol http')
    .arg('--username food')
    .arg('--password bar')
    .arg('--usr-name maciej')
    .arg('--usr-email mmalecki@completelyeffincrazy.org')
    .arg('--usr-pwd ilikedawgfoodyo')
    .expect('should be able to parse the user', function (h) {
      var lines = h.split('\n');
      dotfile_path = lines.shift();
      response = JSON.parse(lines.join('\n'));
      return true;
    })
    .expect('response user id should be `maciej`', function () {
      return response.id && ~response.id.indexOf('maciej');
    })
    .expect('response should have been ok', function () {
      return response.ok;
    })
    .expect('dot file should exist', function () {
      dotfile = fs.readFileSync(dotfile_path, 'utf-8');
      return true;
    })
    .expect('dot file should be valid json', function () {
      dotfile = JSON.parse(dotfile);
      return true;
    })
    .expect('protocol to be `http`', function () {
      return dotfile.protocol === 'http';
    })
    .expect('`usr-name` not to be saved', function () {
      return !dotfile['usr-name'];
    })
    .expect('`usr-pwd` not to be saved', function () {
      return !dotfile['usr-pwd'];
    })
    .expect('`usr-email` not to be saved', function () {
      return !dotfile['usr-email'];
    })
    .expect('hostname to be encrypted', function () {
      encrypted.hostname = dotfile.hostname;
      return dotfile.hostname !== 'localhost:5984';
    })
    .expect('password to be encrypted', function () {
      encrypted.password = dotfile.password;
      return dotfile.password !== 'food';
    })
    .expect('foobar', function () { return true; })
["export"](module);

//
// nao we dont need to specify things that got and we have the same
// behavior
//
clieasy.describe('usage/dotfiles-assumed-options')
  .use(couchdb)
  .discuss('when using `usage/couchdb-*`')
  .arg('--raw')
  .discuss('again with just non saved options')
    .arg('--usr-name avianflu')
    .arg('--usr-email avianflu@incoolsunglasses.org')
    .arg('--usr-pwd IWRITEEVERYTHINGINCAPSCAUSEIDODEVOPS')
    .expect('should be able to parse the user', function (h) {
      var lines = h.split('\n');
      lines.shift();
      response = JSON.parse(lines.join('\n'));
      return true;
    })
    .expect('response user id should be `avianflu`', function () {
      return response.id && ~response.id.indexOf('avianflu');
    })
    .expect('response should have been ok', function () {
      return response.ok;
    })
    .expect('dot file should exist', function () {
      dotfile = fs.readFileSync(dotfile_path, 'utf-8');
      return true;
    })
    .expect('dot file should be valid json', function () {
      dotfile = JSON.parse(dotfile);
      return true;
    })
    .expect('protocol to be `http`', function () {
      return dotfile.protocol === 'http';
    })
    .expect('hostname to be encrypted and same as before', function () {
      return dotfile.hostname === encrypted.hostname;
    })
    .expect('password to be encrypted and same as before', function () {
      return dotfile.password === encrypted.password;
    })
["export"](module);

//
// nao we dont need to specify things that got and we have the same
// behavior
//
clieasy.describe('usage/dotfiles-help')
  .use(couchdb)
  .discuss('when using `usage/couchdb-*`')
  .arg('--raw')
  .discuss('with `--help`')
    .arg('--help')
    .expect('it should not include encrypted fields as plain text', function (usage) {
      return !/anotherhost/.test(usage);
    })
["export"](module);

//
// cleaning up, making sure encryption stayed solid
//
clieasy.describe('usage/dotfiles-teardown')
  .use(couchdb)
  .discuss('when using `usage/couchdb-*`')
  .arg('--raw')
  .discuss('again with just non saved options except password')
    .arg('--usr-name bradley')
    .arg('--password changed')
    .arg('--usr-email bmeck@notdrunkinpoland.org')
    .arg('--usr-pwd yoyoidislikeyoyo')
    .expect('should be able to parse the user', function (h) {
      var lines = h.split('\n');
      lines.shift();
      response = JSON.parse(lines.join('\n'));
      return true;
    })
    .expect('response user id should be `bradley`', function () {
      return response.id && ~response.id.indexOf('bradley');
    })
    .expect('response should have been ok', function () {
      return response.ok;
    })
    .expect('dot file should exist', function () {
      dotfile = fs.readFileSync(dotfile_path, 'utf-8');
      return true;
    })
    .expect('dot file should be valid json', function () {
      dotfile = JSON.parse(dotfile);
      return true;
    })
    .expect('protocol to be `http`', function () {
      return dotfile.protocol === 'http';
    })
    .expect('hostname to be encrypted and same as before', function () {
      return dotfile.hostname === encrypted.hostname;
    })
    .expect('password to be encrypted and changed', function () {
      return dotfile.password !== encrypted.password;
    })
    .expect('unlink to work', function () {
      fs.unlinkSync(dotfile_path);
      return true;
    })
["export"](module);