var clieasy = require('cli-easy')
  , assert  = require('assert')
  , path    = require('path')
  , nested_params    = path.join(__dirname, '../usage/nested-params')
  ;

var output = "{ provider: { username: 'julianduque', password: 'jitsuka' } }\n";

clieasy.describe('usage/nested-params')
  .use(nested_params)
  .discuss('when using usage/nested-params')
  .arg('--raw')
  .discuss('with all the nested params')
    .arg('--provider-username julianduque')
    .arg('--provider-password jitsuka')
    .expect('should be able to parse the provider', output)
  .undiscuss()
["export"](module);