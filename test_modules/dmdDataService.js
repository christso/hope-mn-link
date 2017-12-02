module.exports = function(seedData) {
   let data = seedData;

   function find() {
      return data;
   }

   function create(txn) {
      data.push(txn);
   }

   return {
      data: data,
      find: find,
      create: create
   };
};
