var optimist = require('optimist')
  , prompt   = require('prompt')
  , path     = require('path')
  , eyes     = require('eyes')
  , fs       = require('fs')
  ;

var frameless
  , inspect
  , VERBOSE  = process.env.CLIFV || false
  , SAVE     = process.env.CLIFS || false
  , CONFIRM  = process.env.CLIFC || false
  ;

// ———————————————————————————————————————————————————————————————— prompts ~~

//
// function `relax`
//
// gets a bunch of things it needs and a callback continuation function
//
frameless = function relax() {
  //
  // last argument is the callback, rest are required things
  //
  var cb       = [].pop.call(arguments)
    , override = frameless.argv
    ;

  //
  // sometimes we want to override the `argv`
  // when we need to do this we give the argv object as the last argument
  // so the callback becomes the one before the last and so fourth
  //
  if (typeof cb !== 'function') {
    override = cb;
    cb = [].pop.call(arguments);
  }

  //
  // get our configuration from the dotfile
  //
  var cfg = frameless.load_dotfile();

  //
  // set our PS1
  //
  //
  prompt.message = frameless.PS1;

  //
  // if people are not running in setup mode we can just set the values with
  // the config we got
  //
  // this however looses precedent to command line inputed options
  // so --name will win over property `name`
  //
  if(!frameless.argv.setup) {
    Object.keys(cfg).forEach(function (k) {
      if(!override[k]) {
        override[k] = cfg[k];
      }
    });
  }

  //
  // override with whatever arguments where passed
  // or something passed to this function
  //
  prompt.override  = override;
  prompt.delimiter = '';

  //
  // start our prompt
  //
  prompt.start();

  //
  // gather information on if we should or not save each options
  //
  var prompt_save = {};

  //
  // gather prompts from remaining arguments (last is `cb`)
  //
  var prompt_info = [].reduce.call(arguments, function(ac, arg) {
    //
    // strings need to be put in format expected by prompt
    // if you only passed a string then it's required
    //
    var prop = typeof arg === 'string'
             ? { name     : arg
               , required : true
               }
             : arg
             ;

    //
    // check for save/no-save
    //
    if(typeof prop.save === 'boolean') {
      prompt_save[prop.name] = prop.save;
    }
    //
    // default to save
    //
    else {
      prompt_save[prop.name] = true;
    }

    //
    // make sure user is not trying to use a reserved flag
    //
    frameless.reserved_options.forEach(function (word) {
      if (prop.name === word) {
        frameless.err(
          'error: `--' + word + '` is an reserved option. please rename it');
        process.exit();
      }
    });

    //
    // make sensitive info sensitive
    //
    frameless.sensitive_options.forEach(function(word) {
      if (~prop.name.toLowerCase().indexOf(word.toLowerCase())) {
        prop.hidden = true;
      }
    });

    if(cfg[prop.name]) {
      prop['default'] = cfg[prop.name];
    }

    //
    // accumulate the transformed option
    //
    ac.push(prop);

    //
    // return our `nascent` object
    //
    return ac;
  }, []);

  if(VERBOSE) {
    frameless.silly(prompt_info, 'prompt');
  }

  //
  // halp: --help, --halp, -h, --usage
  //
  if (override.help || override.h || override.halp || override.usage) {
    frameless.usage(prompt_info);
    return;
  }

  //
  // version
  //
  if (override.version || override.v) {
    frameless.pp_version();
    return;
  }

  //
  // read the variables that are not passed by `optimist`
  //
  prompt.get(prompt_info, function(err, p) {
    if (err) {
      return frameless.err(err, true);
    }

    if(VERBOSE) {
      frameless.silly(p, 'input');
    }

    var changes = Object.keys(p).reduce(function (ac, k) {
      var e = p[k];
      if(e !== cfg[k]) {
        ac[k] = e;
      }
      return ac;
    }, {});

    if(!CONFIRM) {
      frameless.save_dotfile(changes, cfg);
      return cb(p);
    }

    prompt.get({
      name: 'continue',
      description: 'are you sure?',
      required: true
    }, function(err, confirm) {
      if (err) {
        return frameless.err(err, true);
      }

      if (~['y', 'yes'].indexOf(confirm["continue"].toLowerCase())) {
        frameless.save_dotfile(changes, cfg);
        cb(p);
      }
      else {
        return frameless.aborted(confirm["continue"]);
      }
    });
  });
};

// ——————————————————————————————————————————————————————————————— defaults ~~
//
// stuff like raw mode, and help can be auto generated for you
//

//
// `raw`, aka `no-colors` mode
//
if (optimist.argv.raw) {
  [ 'bold', 'underline', 'strikethrough', 'italic', 'inverse', 'grey'
  , 'black', 'yellow', 'red', 'green', 'blue', 'white', 'cyan'
  , 'magenta'].forEach(function(i) {
    Object.defineProperty(String.prototype, i,
      { get: function() { return this; }
    });
  });
  inspect = eyes.inspector({ stream: null,styles: {} });
}
//
// default is colors mode
//
else {
  inspect = eyes.inspector({ stream: null });
}

//
// verbose mode outputs more stuff
//
if (optimist.argv.verbose) {
  VERBOSE = true;
}
if (optimist.argv["no-verbose"]) {
  VERBOSE = false;
}

//
// save stuff into a dotfile for reuse
//
if (optimist.argv.save) {
  SAVE = true;
}
if (optimist.argv["no-save"]) {
  SAVE = false;
}

//
// not confirming
//
if (optimist.argv.y || optimist.argv.yes) {
  CONFIRM = false;
}

// ————————————————————————————————————————————————————————————— hackers <3 ~~
//
// these are things you can customize from your scripts
// if you think i did a wrong choice with the defaults send in a pr
//
// if you wish this was modular the right way, write the code and send a pr
// you might want to ask if i think that is the right way, i really dislike
// complicated code bases. don't we all?
//

//
// give users direct access to argv and other fun stuff from optimist
//
frameless.optimist = optimist;
frameless.argv = optimist.argv;

//
// allow people to know if we are in `verbose`, `confirm`, and `save`
//
frameless.save    = function (b) {
  if(typeof b === 'boolean') {
    if(VERBOSE) {
      frameless.silly('set save to ' + b);
    }
    SAVE = b;
  }
  else {
    return SAVE;
  }
};

frameless.verbose = function (b) {
  if(typeof b === 'boolean') {
    if(VERBOSE) {
      frameless.silly('set verbose to ' + b);
    }
    VERBOSE = b;
  }
  else {
    return VERBOSE;
  }
};

frameless.confirm = function (b) {
  if(typeof b === 'boolean') {
    if(VERBOSE) {
      frameless.silly('set confirm to ' + b);
    }
    CONFIRM = b;
  }
  else {
    return CONFIRM;
  }
};

//
// the program name
//
frameless.program_name = frameless.argv.$0.replace(/ |\/|\\/g, '_') || 'frameless';

//
// default encryption key
// please override with your own
//
frameless.key =
  [ 'c11094d856cae4ac4f2e0a1dcf68ba2ad50d313ce6495c12a8c86792243e9094'
  , '6de079d0c32d690bd20948ca2fc7fafcc271f855125365b6776d4de4ac8d2296'
  , '144e1c7c3da392db710bcdb390de33c3169e420b3295f274b3e14fb89b84e2b7'
  , '3587ad4985305a0f242b507de062aa6186a84668a997fb08cb6cd9b37dba2008'
  , 'c520c5e586f2e21355bf3ff88a0630bfd8b1040291da66c9e6eb53adb50b7006'
  , 'fd807084c26576ed020517aa71cd7d094e9a66eafc520c9771e97c4759f42956'
  , '990bd7a3b96629bd0cbf44bf32085a20cbfb06dbb80f8b7903845b6f58484750'
  , '65d1041ebf52ecf8c8bd54465f54e80ba2a96d682a50eaae2205d9f0df8aafea'
  , 'f6fb5897b68e44602ed08b2119c468fcf726691bea23f6755922bd17f842389b'
  , 'e37f4e621eff6f1dd6ba08613913eff2848dc07f8d7b4b8ce29bb315a714ffc8'
  , 'c07b94cde54f3c19b5cd2a2a22b2ef3ebb6d197a33ec36fbb62b801f11494ffb'
  , 'fc6abb102def3729d211d07a8931a17553fe794f4abcca24148a418ea7396538'
  , 'cf550f9f427eeaa5cb44fbc9bc98d44a7b30c18633afd16a25cc39af4f8366c6'
  , '563409962525f5f9f285b13a3575f20fb0bb39103a00c1739dfc7333acf5dd18'
  , 'b47bf744140ded6bd1a60c4aec6db311245228aac2706cdc5a8f1befd8315b0a'
  , '4b9f993bee4f78f2f8bdca27199c6dbad50c56fa41ea795898ae607772d2056c'
  , 'badd2484bf7d24ece629b93042a4bfbb92c272f9836919c117483b7db4a71876'
  , '9c26996f0a47e54e4fc3db3e40339939abe1056955ec83b908d75e117c3466d0'
  ].join('');

//
// so i can complain if you dont change this
//
frameless.original_key = frameless.key;

//
// which algorithm to use to encrypt the key
//
frameless.cipher_type  = 'aes-256-cbc';

//
// home directory
//
frameless.tilde = process.env[(process.platform === 'win32') 
           ? 'USERPROFILE'
           : 'HOME']
           ;

//
// the current `frameless` version
//
frameless.version  = require('../package.json').version;

//
// logger function, should behave like console.log
//
frameless.logger   = console.log;

//
// info not to be logged *ever*
//
frameless.sensitive_options =
  [ 'password'
  , 'auth'
  , 'key'
  , 'apiKey'
  , 'secret'
  , 'apiSecret'
  ]
  ;

//
// reserved arguments
//
frameless.reserved_options =
  [ 'h'
  , 'help'
  , 'halp'
  , 'usage'
  , 'raw'
  , 'verbose'
  , 'v'
  , 'version'
  , 'json'
  , 'save'
  , 'y'
  , 'yes'
  , 'no-verbose'
  , 'no-save'
  , 'setup'
  ]
  ;

// —————————————————————————————————————————————————————————————————— style ~~

//
// default messages and colors for different log levels
//
frameless.msg =
  { ok   : { label: 'great', color: 'grey'   }
  , err  : { label: 'error', color: 'red'    }
  , warn : { label: 'warn' , color: 'yellow' }
  , info : { label: 'info' , color: 'blue'   }
  , silly: { label: 'silly', color: 'magenta'}
  , dot  : { label: '.'    , color: 'green'  }
  }
  ;

//
// default usage function
//
frameless.usage = function (opts) {
  var all_opts = opts.map(function(req) {
    return '   —-'.green + req.name + ' ' + 
           (req['default'] || 'default-value').grey;
  });

  if(CONFIRM) {
    all_opts.push('   —-'.green + 'continue' + ' y/n'.grey);
  }

  var usage = 
    [ ''
    , ' ' + frameless.program_name + ' \\'.grey
    , all_opts.join(' \\'.grey + '\n')
    ].join('\n')
    ; 

  frameless.ok(usage, 'usage');
};

frameless.pp_version = function () {
  frameless.ok(frameless.version, 'version');
};

//
// PS1 dawg
//
frameless.PS1 = 'frameless' + '. '.green;

//
// function `pp`
//
// returns a pretty print string for logging
//
// this is an `internal` function not meant to be consumed by apps
// but as in everything that is good, yes you can!
//
// args:
//   @level: one of the levels as defined in `frameless.msg`
//   @msg  : the message to log, can either be a string or an object
//           [dude a string is an object, dur dur dur]
//   @opts : currently a key, which replaces `level.label` as the message to
//           be logged and omit_newline if you don't want a new line before
//           your pretty printed output
//
//
frameless.pp = function (level, msg, opts) {
  opts = opts || {};
  msg = typeof msg === 'string' ? msg : inspect(msg);

  if(!frameless.msg[level]) {
    frameless.logger('invalid level <' + level + '> changed to info.');
    level = 'info';
  }

  var _n = opts.newline ? '\n' : '';
  var _k = typeof opts.key === 'string' ? opts.key : null;
  if(_k) {
    return _n + _k[frameless.msg[level].color] +
      frameless.msg.dot.label[frameless.msg.dot.color] + ' ' + msg;
  }
  else {
    if(frameless.argv.raw) {
      return _n + msg;
    }
    else {
      return _n + msg[frameless.msg[level].color];
    }
  }
};

//
// function `aborted`
//
// prints when you abort an operation on prompt
//
frameless.aborted = function (msg) {
  frameless.err('aborted by you. ' + '['.blue + msg + ']'.blue);
};

//
// function `err`
//
// pretty prints an error
//
frameless.err = function(err, newline) {
  frameless.logger(
    frameless.pp('err', (err.message || err), 
    { newline: newline
    , key: 'error'
    })
  );
};

//
// function `ok`, `warn`, `info`, `silly`
//
// exposes methods to pretty print messages on these levels
//
['ok', 'warn', 'info', 'silly'].forEach(function (l) {
  frameless[l] = function(msg, key) {
    frameless.logger(frameless.pp(l, msg, {key: key}));
  };
});

//
// function `print`
//
// just a default callback helper that does what you expect
// if theres an error its prints it as such,
// if not it prints the success
//
frameless.print = function(err, response) {
  if (err) {
    return frameless.err(err, true);
  }
  frameless.ok(response);
};

// ————————————————————————————————————————————————————————————————— crypto ~~

//
// function `encrypt`
//
// encrypts some shit, namely @wat
//
frameless.encrypt = function (wat) {
  if(VERBOSE) {
    if (frameless.key === frameless.original_key) {
      frameless.silly('you should use a different key', 'key');
    }
    frameless.silly('encrypting ' + wat.length + ' chars');
  }

  try {
    var crypto  = require('crypto')
      , cipher  = crypto.createCipher(frameless.cipher_type, frameless.key)
      , ret     = cipher.update(wat, 'utf8', 'hex')
      ;

    ret += cipher.final('hex');

    return ret;
  } catch (e) {
    if(VERBOSE) {
      frameless.silly(wat + ' failed to encrypt: ' + e.message);
    }
    return;
  }
};

//
// function `decrypt`
//
// dude, common. yu reading thiz?
//
frameless.decrypt = function (encoded) {
  if(VERBOSE) {
    if (frameless.key === frameless.original_key) {
      frameless.silly('you should use a different key', 'key');
    }
    frameless.silly('decrypting ' + encoded);
  }

  try {
    var crypto   = require('crypto')
      , decipher = crypto.createDecipher(frameless.cipher_type, frameless.key)
      , ret      = decipher.update(encoded, 'hex', 'utf8')
      ;

    ret += decipher.final('utf8');

    return ret;
  } catch (e) {
    if(VERBOSE) {
      frameless.silly(encoded + ' failed to decrypt: ' + e.message);
    }
    return;
  }
};

// ——————————————————————————————————————————————————————————————— .dotfile ~~
frameless.dotfile = path.join(frameless.tilde, '.' + frameless.program_name +
  '.frameless.json');

//
// try to get the user rsa key as default
//
var key_path = path.join(frameless.tilde, '.ssh', 'id_rsa');

try {
  key = fs.readFileSync(key_path, 'utf-8');
  if(VERBOSE) {
    frameless.silly('loaded rsa key from ' + key_path);
  }
} catch (e) {
  if(VERBOSE) {
    frameless.silly('user private key was not in ' + key_path + 
      '. using default key');
  }
}

frameless.load_dotfile = function () {
  if(VERBOSE) {
    frameless.silly(frameless.dotfile, 'load');
  }

  var cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(frameless.dotfile, 'utf8'));

    if(typeof cfg !== 'object') {
      throw new Error('invalid config');
    }

    //
    // decode each of the encrypted thingies
    //
    Object.keys(cfg).forEach(function (k) {
      for(var i=0; i < frameless.sensitive_options.length; i++) {
        var sensitive_word = frameless.sensitive_options[i].toLowerCase();
        if(~k.toLowerCase().indexOf(sensitive_word)) {
          cfg[k] = frameless.decrypt(cfg[k]);
          break;
        }
      }
    });
  } catch (e) {
    cfg = {};
  }
  return cfg;
};

frameless.save_dotfile = function (updates, cfg) {
  if(!SAVE) {
    return;
  }

  //
  // no updates, just leave
  //
  if(!Object.keys(updates).length) {
    if(VERBOSE) {
      frameless.silly('nothing to do cause there are no updates');
    }
    return;
  }

  Object.keys(updates).forEach(function (k) {
    cfg[k] = updates[k];
    for(var i=0; i < frameless.sensitive_options.length; i++) {
      var sensitive_word = frameless.sensitive_options[i].toLowerCase();
      if(~k.toLowerCase().indexOf(sensitive_word)) {
        cfg[k] = frameless.encrypt(cfg[k]);
        break;
      }
    }
  });

 fs.writeFileSync(frameless.dotfile, JSON.stringify(cfg, null, 1));

  if(process.platform !== 'win32') {
     fs.chmodSync(frameless.dotfile, '600');
  }

  if(VERBOSE) {
    frameless.silly(frameless.dotfile, 'save');
  }
};

frameless.destroy_dotfile = function () {
  if(VERBOSE) {
    frameless.silly(frameless.dotfile, 'unlink');
  }
  fs.unlinkSync(frameless.dotfile);
};

module.exports = frameless;