module.exports = class ContractError extends Error {
   constructor(message, method, data) {
      super(message);
      this.name = 'ContractError';
      this.method = method;
      this.data = data;
   }
};
