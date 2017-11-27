'use strict';

function Logger(name) {
   this.logger = {};

   for (var m in console)
      if (typeof console[m] == 'function')
         this.logger[m] = console[m].bind(console, `[${name}]`);

   return this.logger;
}

module.exports = Logger;
