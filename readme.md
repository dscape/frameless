# clif

`clif` (short for command line interface framework) is a set of decisions on how to build cli apps

the main design goals are:

* totally hackable and badly done by design™
* get the fuck out of your way™
* designed for synchronous application, which are most cli. if you intend to run a server on it make sure you read the code

## usage

check the `usage/` folder for some samples

## dependencies

`clif` depends on some awesome packages. check them out cause there's a lot you can do with them, and clif exposes their internals anyway:

* [prompt]
* [optimist]
* [eyes]
* [colors]