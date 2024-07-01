const { soundcloud, spotify } = require("../build/functions/autoPlay");

soundcloud("https://soundcloud.com/alanwalker/alan-walker-peder-elias-putri-ariani-who-i-am").then(x => {
    console.log(x)
})

spotify("1zHzHVjNlhj2PwRlngEKEo").then(x => {
    console.log(x)
})