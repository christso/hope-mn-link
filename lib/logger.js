'use strict';

function Logger() {
   this.logger = {};

   for (var m in console) {
      if (typeof console[m] == 'function') {
         this.logger[m] = console[m].bind(console);
      }
   }

   return this.logger;
}

module.exports = Logger;
