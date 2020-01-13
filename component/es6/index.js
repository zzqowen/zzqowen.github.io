import '@babel/polyfill';

var a = () => {
  console.log('试试')
}

var arr = [1,2,3,5,6]

arr.map((item) => {
  console.log(item)
})

for (var i in arr) {
  console.log(arr[i])
}

String.raw`Hi\n${2+3}!`;

var url = new URL()


var a = {a: 3}

const b = Object.assign({}, a)
console.log(b)