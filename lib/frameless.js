var optimist = require('optimist')
  , prompt   = require('prompt')
  , path     = require('path')
  , eyes     = require('eyes')
  , crypto   = require('crypto')
  , fs       = require('fs')
  , async    = require('async')
  , keypress = require('keypress')
  , tty      = require('tty')
  , readline = require('readline')
  , rl
  ;

var frameless
  , inspect
  , VERBOSE      = process.env.CLIFV || false
  , SAVE         = process.env.CLIFS || false
  , CONFIRM      = process.env.CLIFC || false
  //
  // make control+c respond by exiting
  //
  , kp_listeners = [{name: 'c', f: function () { process.stdin.pause(); }}]
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

  var args = arguments;

  //
  // get our configuration from the dotfile
  //
  frameless.load_dotfile(function (cfg) {
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
          if (VERBOSE) {
            frameless.silly('set to ' + cfg[k], k);
          }
          override[k] = cfg[k];
        }
      });
    }
    //
    // if they are in set up mode we need to at the very least unlink their
    // config file so the end user does not get stranded in loops trying to
    // fix the dotfile
    //
    else {
      frameless.destroy_dotfile();
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
    var prompt_save = {}
      , prompt_load = {}
      ;

    //
    // gather prompts from remaining arguments (last is `cb`)
    //
    var prompt_info = [].reduce.call(args, function(ac, arg) {
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
      // determine what we need to load
      //
      if(prop.load) {
        prompt_load[prop.name] = typeof prop.load === 'string'
                               ? prop.load
                               : 'utf-8'
                               ;
      }

      //
      // make sure user is not trying to use a reserved flag
      //
      frameless.reserved_options.forEach(function (word) {
        if (prop.name === word) {
          frameless.err(
            '`--' + word + '` is an reserved option. please rename it');
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
      //
      // if we already have this option in our cfg make whats in cfg
      // the default to save the end user time retyping everything
      //
      // dont do this for encrypted things as it would show unencrypted
      // results in plain text
      //
      if(cfg[prop.name] && !prop.hidden) {
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

      function return_to_sender() {
        if(frameless.argv.setup) {
          frameless.info(frameless.dotfile, '������');
        }
        else {
          cb(p);
        }
      }

      var keys    = Object.keys(p)
        , to_load = keys.filter(
          function filter_files_to_load(prop) {
            return prompt_load[prop];
          })
        ;

      if(VERBOSE) {
        frameless.silly(p, 'input');
      }

      async.map(to_load
      , function read_file(prop, cb) {
        var encoding = prompt_load[prop];
        //
        // people can specify load as a boolean or encoding
        // boolean value true will default to utf8
        //
        encoding = typeof encoding === 'string' ? encoding : 'utf8';
        //
        // read the file
        //
        fs.readFile(p[prop], encoding, cb);
        }
      , function (err, responses) {
        if (err) {
          return frameless.err(err, true);
        }

        //
        // update our config file according to what was passed by prompt/argv
        // do not set things that are not supposed to be saved
        //
        keys.forEach(function (k) {
          if(prompt_save[k]) {
            cfg[k] = p[k];
          }
        });

        //
        // replace the values of our prompt with the files loaded
        // with `load: true`
        //
        for(var i = 0; i < to_load.length; i++) {
          p[to_load[i]] = responses[i];
        }

        //
        // check if we can skip the confirmation prompt
        //
        if(!CONFIRM || frameless.argv.yes || frameless.argv.y) {
          frameless.save_dotfile(cfg, return_to_sender);
          return;
        }


        //
        // confirmation prompt
        //
        prompt.get(
          { name        : 'continue'
          , description : 'are you sure?'
          , required    : true
          }
        , function(err, confirm) {
          if (err) {
            return frameless.err(err, true);
          }

          if (~['y', 'yes'].indexOf(confirm["continue"].toLowerCase())) {
            do_ttymagic();
            frameless.save_dotfile(cfg, return_to_sender);
            return;
          }
          else {
            return frameless.aborted(confirm["continue"]);
          }
        });
      });
    });
  });
};

// ——————————————————————————————————————————————————————————————— defaults ~~
//
// stuff like raw mode, and help can be auto generated for you
//
frameless.is_tty = false;

function do_ttymagic() {
  if(tty.isatty(process.stdin)) {
    frameless.is_tty = true;

    rl = readline.createInterface(process.stdin, process.stdout);

    //
    // make `process.stdin` begin emitting "keypress" events
    //
    keypress(process.stdin);

    //
    // listen for the `keypress` event
    //
    process.stdin.on('keypress', function (ch, key) {
      //
      // iterate our kp_listeners
      //
      for (var i = 0; i < kp_listeners.length; i++) {
        var kp = kp_listeners[i];
        //
        // if we have something to do
        //
        if(key && key.ctrl && key.name === kp.name) {
          //
          // do eet
          //
          kp.f();
          break;
        }
      }
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
  }
}

//
// function `keypress`
//
// register listeners for control+key
//
frameless.keypress = function (name, f) {
  kp_listeners.push({name: name, f: function () {
    if (VERBOSE) {
      frameless.silly('keypress on control+'+name, name);
    }
    f();
  }});
};

frameless.kp_listeners = kp_listeners;

//
// remove color output
//
frameless.raw = function () {
  [ 'bold', 'underline', 'strikethrough', 'italic', 'inverse', 'grey'
  , 'black', 'yellow', 'red', 'green', 'blue', 'white', 'cyan'
  , 'magenta'].forEach(function(i) {
    Object.defineProperty(String.prototype, i,
      { get: function() { return this; }
    });
  });
  inspect = eyes.inspector({ stream: null,styles: {} });
};

//
// `raw`, aka `no-colors` mode
//
if (optimist.argv.raw) {
  frameless.raw();
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
frameless.argv     = optimist.argv;

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
// allow to override the name of the dotfile file
// default to null which will make frameless resolve to program name
//
frameless.dotfile_path = function (name) {
  if(VERBOSE) {
    frameless.silly('set dotfile to ' + name);
  }
  frameless.dotfile = path.join(frameless.tilde, '.' + name + '.f.json');
};

//
// the program name
//
frameless.program_name = frameless.argv.$0.replace(/ |\/|\\/g, '_') || 'ƒ';

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
// the current `ƒ` version
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
  { ok   : { label: 'λ', color: 'grey'   }
  , err  : { label: 'ℯ', color: 'red'    }
  , warn : { label: '!', color: 'yellow' }
  , info : { label: 'ⅰ', color: 'blue'   }
  , silly: { label: '☃', color: 'magenta'}
  , dot  : { label: '.', color: 'green'  }
  }
  ;

//
// default usage function
//
frameless.usage = function (opts) {
  //
  // print for all program specific options
  //
  var all_opts = opts.map(function(req) {
    return frameless.pp_option(
      { v : req.name
      , d : req['default'] ? req['default'] : null
      }
      );
  });

  //
  // print for all frameless internal options
  //
  if(SAVE) {
    all_opts.push(frameless.pp_option({v: 'setup'}));
  }

  all_opts.push(frameless.pp_option({v: 'verbose'}));
  all_opts.push(frameless.pp_option({v: 'help', s: 'h'}));
  all_opts.push(frameless.pp_option({v: 'version', s: 'v'}));

  if(CONFIRM) {
    all_opts.push(frameless.pp_option({v: 'yes', s: 'y'}));
  }

  var usage =
    [ frameless.program_name
    , all_opts.join('\n')
    ].join('\n')
    ;

  frameless.ok(usage, frameless.version);
};

//
// function `pp_version`
//
// prints the version
//
frameless.pp_version = function () {
  frameless.ok(frameless.version, 'version');
};

//
// PS1 dawg
//
frameless.PS1 = 'ƒ' + '. '.green;

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
  msg = typeof msg === 'string'
      ? msg
      : frameless.argv.raw
        ? JSON.stringify(msg, null, 2)
        : inspect(msg)
      ;

  //
  // default the level to info in an invalid one was provided
  //
  if(!frameless.msg[level]) {
    if(VERBOSE) {
      frameless.silly('invalid level <' + level + '> changed to info.');
    }
    level = 'info';
  }

  var _n = opts.newline ? '\n' : '';
  var _k = typeof opts.key === 'string' ? opts.key : null;

  //
  // on non raw requests we can default the key to the default key label
  //
  if(!_k && !frameless.argv.raw) {
    _k = frameless.msg[level].label;
  }

  if(_k) {
    return _n + _k[frameless.msg[level].color] +
      frameless.msg.dot.label[frameless.msg.dot.color] + ' ' + msg;
  }
  else {
    return _n + msg[frameless.msg[level].color];
  }
};

//
// function `pp_option`
//
// prints out option for usage
//
frameless.pp_option = function (opt) {
  var s_opt = [];
  //
  // shortcut options, `-v`
  //
  if(typeof opt.s === 'string') {
    s_opt.push((opt.s.length === 1 ? '—' : '--').green + opt.s);
  }
  //
  // verbose options, `--version`
  //
  if(typeof opt.v === 'string') {
    s_opt.push((opt.v.length === 1 ? '—' : '--').green + opt.v);
  }
  //
  // `d` is default value
  //
  return s_opt.join(', '.grey) + ' ' + (opt.d || '').grey;
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
  var to_print = VERBOSE ? err : (err.message || err);
  frameless.logger(
    frameless.pp('err', to_print,
    { newline: newline
    , key: frameless.msg.err.label
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
    var cipher  = crypto.createCipher(frameless.cipher_type, frameless.key)
      , ret     = cipher.update(wat, 'utf8', 'hex') + cipher.final('hex')
      ;

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
    var decipher = crypto.createDecipher(frameless.cipher_type, frameless.key)
      , ret = decipher.update(encoded, 'hex', 'utf8') + decipher.final('utf8')
      ;

    return ret;
  } catch (e) {
    if(VERBOSE) {
      frameless.silly(encoded + ' failed to decrypt: ' + e.message);
    }
    return;
  }
};

// ——————————————————————————————————————————————————————————————— .dotfile ~~
frameless.dotfile_path(frameless.program_name);

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

//
// function `load_dotfile`
//
// loads a dotfile, if one does not exist it returns an empty object
//
frameless.load_dotfile = function (cb) {
  if(VERBOSE) {
    frameless.silly(frameless.dotfile, 'load');
  }

  var cfg = {};

  fs.readFile(frameless.dotfile, 'utf8', function (err, cfg) {
    //
    // if there's no file give an empty object
    //
    if(err) {
      return cb({});
    }

    try {
      cfg = JSON.parse(cfg);

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

      return cb(cfg);
    } catch (e) {
      if(VERBOSE) {
        frameless.silly('load failed for ' + frameless.dotfile +
          ' due to reasons ' + e.message);
      }
      return cb({});
    }
  });
};

//
// function `save_dotfile`
//
// saves the dotfile
// the return value in the callback informs if a save operation was performed
//
frameless.save_dotfile = function (cfg, cb) {
  if(VERBOSE) {
    frameless.silly(frameless.dotfile, 'save');
  }

  if(!SAVE) {
    return cb(false);
  }

  //
  // no updates, just leave
  //
  if(!Object.keys(cfg).length) {
    if(VERBOSE) {
      frameless.silly('nothing to save');
    }
    return cb(false);
  }

  //
  // encrypt all the sensitive thingies
  //
  Object.keys(cfg).forEach(function (k) {
    for(var i=0; i < frameless.sensitive_options.length; i++) {
      var sensitive_word = frameless.sensitive_options[i].toLowerCase();
      if(~k.toLowerCase().indexOf(sensitive_word)) {
        cfg[k] = frameless.encrypt(cfg[k]);
        break;
      }
    }
  });

  //
  // actually write the file
  //
  fs.writeFile(frameless.dotfile, JSON.stringify(cfg, null, 1), function (e) {
    if(e) {
      if(VERBOSE) {
        frameless.silly('save failed for ' + frameless.dotfile +
          ' due to reasons ' + e.message);
      }
      return cb(false);
    }

    //
    // set modes so only the end user can read and no other user
    // with access to the laptop/computer/television/whatever
    //
    if(process.platform !== 'win32') {
       fs.chmod(frameless.dotfile, '600', function (err) {
         return cb(true);
       });
    }
    //
    // just continue then
    //
    else {
      return cb(true);
    }
  });
};

//
// function `destroy_dotfile`
//
// unlinks a dotfile
//
frameless.destroy_dotfile = function (cb) {
  cb = cb || function (){};
  if(VERBOSE) {
    frameless.silly(frameless.dotfile, 'unlink');
  }

  fs.exists(frameless.dotfile, function (exists) {
    if(exists) {
      fs.unlink(frameless.dotfile, function (err) {
        if(err && VERBOSE) {
          frameless.silly('unlink failed for ' + frameless.dotfile +
            ' due to reasons ' + err.message);
        }
        cb();
      });
    }
    else {
      return cb();
    }
  });
};

// ———————————————————————————————————————————————————————————————— .ohai!1 ~~
module.exports = frameless;