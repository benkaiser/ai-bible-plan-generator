export async function fakeStream(listOfChunks: any[], callback: (chunk: any) => void, lowerBound: number, upperBound: number) {
  let resolvePromise: (value: any) => void;
  let rejectPromise: (reason?: any) => void;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  const spacer = () => {
    if (listOfChunks.length === 0) {
      resolvePromise('done');
      return;
    } else {
      callback(listOfChunks[0].choices[0]?.delta?.content || '');
      listOfChunks.shift();
      setTimeout(spacer, lowerBound + ((upperBound - lowerBound) * Math.random()));
    }
  };

  setTimeout(spacer, lowerBound + ((upperBound - lowerBound) * Math.random()));
  return promise;
}