function * custom_map(array,transformation) {
    for (const val of array) yield transformation(val)
}

const square = custom_map([1,2,3,4],(x) => x*x)

console.log([...square])

(function test() {
    for (const val in [2,3,4,51,1]) {
        console.log(val)
    }
}())


