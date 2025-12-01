// Quick test to see if the flag is working
const config = {
  __timeoutFired: true,
  __timeoutValue: 1000
};

console.log('Checking __timeoutFired:', config.__timeoutFired);
console.log('Truthiness:', !!config.__timeoutFired);
console.log('Condition result:', config.__timeoutFired ? 'THROW TIMEOUT' : 'SKIP');
