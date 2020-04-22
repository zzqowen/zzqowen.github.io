onmessage = function(e) {
  console.log(e);
  var workerResult = 'Result: ' + e.data;
  console.log('Posting message back to main script');
  return close();
  postMessage(workerResult);
}