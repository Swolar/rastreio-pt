const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
console.log('Start');
delay(5000).then(() => console.log('End'));
