# clif

## introduction

[“clif”](https://github.com/dscape/clif) (**c**ommand **l**ine **i**nterface **f**ramework) is a framework to write cli programs. “clif” allows you to write [command line interfaces](http://en.wikipedia.org/wiki/Command-line_interface) that are easy to read, and fun to write.

thus, “clif” is two things: (1) a set of decisions focused around how command line interfaces should work; and (2) a node.js module that demonstrates those decisions

the main design goal behind “clif” is to allow you to migrate your day-to-day scripts to an cli program with minimal effort. “clif” is designed with hackers in mind so all the internals are deliberately exported. this allows fellow developers to tailor behavior if they disagree with the decisions made by the maintainers of the “clif” itself, as well as perform necessary customization in style and security

the best way to get a feel for “clif” is to simply look at an node.js cli program that uses “clif”. for example, you can check the [usage examples](https://github.com/dscape/clif/tree/master/usage) listed in the project’s repository

“clif” is free software, available under the apache open source license (v2). see the [license](https://raw.github.com/dscape/clif/master/license.md) for more information

## basics

### default options

command line interfaces are expected to respond consistently to options such as `version`, `yes`, `raw`, `verbose`, `help`, `setup`. “clif” will perform all these operations and behave according to the principle of least surprise. you can check which options are reserved by printing `clif.reserved_options`, and customize styles by overriding the style methods that correspond to the options

``` javascript
var clif = require('clif');

// assuming placement in `bin/` folder
clif.version = require('../package').version;

clif.main(function () {
  clif.silly(clif.reserved_options);
});
```

### prompt

“clif” will ask for options that are required but were not provided at run time using  a prompt

``` javascript
clif.main('name', function (input) {
  clif.info('hello ' + input.name);
});
```

if you run “clif” without specifying `--name alice` “clif” will prompt you for the name.

“clif” prompt is built on top of the [flatiron/prompt](https://github.com/flatiron/prompt) module. all the arguments to the main function (except the callback) are assumed to be either a string (i.e. a mandatory option) or an object that represents a [flatiron/prompt option object](https://github.com/flatiron/prompt#prompting-with-validation-default-values-and-more-complex-properties)

### the confirmation prompt

“cli” will enable an “are you sure?” prompt if deliberately ask for it in your code

``` javascript
clif.confirm(true);
```
this check can then be overridden by the end user by using the `-y` or `--yes` option

## persisting options across different requests

“clif” enables programs to save and reuse the options specified in a request by exposing the `clif.save` function. calling this function with `true` will make clif automatically record the options inputed in a dot file located in your home directory

``` javascript 
clif.save(true);

clif.main('name', 'password', function (opts) {
  clif.info(clif.dotfile, 'dotfile');
  clif.info(clif.sensitive_options,  'sensitive');
});
```

special considerations are taken for saving options which are member of an internal array called `clif.sensitive_options`. “clif” will attempt to encrypt options that include any of the substrings listed in this array, using the `clif.cypher_type` and `clif.key`. “clif” ships with a default key, but you are encouraged to change it in your program. “clif” will also attempt to read the `~/.ssh/id_rsa` private key and use it as an encryption key whenever possible

“clif” allows you to select which options should be saved. the default is to save the option once you called the `clif.save` method

``` javascript 
clif.save(true);

clif.main('name',
  { name: 'password', required: true, save: false}, function (opts) {
  clif.info(clif.dotfile, 'dotfile');
  clif.info(clif.sensitive_options,  'sensitive');
});
```

### router

tbd.

### themes

internally “clif” exposes methods that format output presented to user. please check the source code in the `style` section for a better understanding of all functions you can customize to your liking (e.g. `clif.PS1`)

### man pages

### publishing your module with npm

tbd.

## apps built using clif

* [ghcopy](https://github.com/dscape/ghcopy)

## license

copyright 2011 nuno job <nunojob.com> (oO)--',--

licensed under the apache license, version 2.0 (the "license");
you may not use this file except in compliance with the license.
you may obtain a copy of the license at

    http://www.apache.org/licenses/LICENSE-2.0

unless required by applicable law or agreed to in writing, software
distributed under the license is distributed on an "as is" basis,
without warranties or conditions of any kind, either express or implied.
see the license for the specific language governing permissions and
limitations under the license.
