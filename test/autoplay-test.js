const { scAutoPlay, spAutoPlay } = require("../build/functions/autoPlay");

// scAutoPlay("https://soundcloud.com/alanwalker/alan-walker-peder-elias-putri-ariani-who-i-am").then(x => {
//     console.log("—".repeat(7), "soundcloud Autoplay Result: ", x)
// })

spAutoPlay("1zHzHVjNlhj2PwRlngEKEo").then(x => {
    console.log("—".repeat(7)," Spotify AutoPlay Result: ", x)
})