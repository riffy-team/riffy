console.log(process.env)
const { Track } = require("../build/index")



const testTrack = {
  "encoded": "QAABRgMAPFJPWSBLTk9YIC0gTWVtb3J5IEJveCB8IER1YnN0ZXAgfCBOQ1MgLSBDb3B5cmlnaHQgRnJlZSBNdXNpYwARTm9Db3B5cmlnaHRTb3VuZHMAAAAAAAH36AALREZ5SUE3NkJ2RDAAAQAraHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1ERnlJQTc2QnZEMAEAm2h0dHBzOi8vaS55dGltZy5jb20vdmkvREZ5SUE3NkJ2RDAvbWF4cmVzZGVmYXVsdC5qcGc/c3FwPS1vYXltd0VtQ0lBS0VOQUY4cXVLcVFNYThBRUItQUgtQ1lBQzBBV0tBZ3dJQUJBQkdDd2dVaWhfTUE4PSZycz1BT240Q0xETjJsZDdUVU51Q2tvQVZEVVJfdnVqUzd6X3B3AAAHeW91dHViZQAAAAAAAAAA",
  "info": {
    "identifier": "DFyIA76BvD0",
    "isSeekable": true,
    "author": "NoCopyrightSounds",
    "length": 129000,
    "isStream": false,
    "position": 0,
    "title": "ROY KNOX - Memory Box | Dubstep | NCS - Copyright Free Music",
    "uri": "https://www.youtube.com/watch?v=DFyIA76BvD0",
    "sourceName": "youtube",
    "artworkUrl": "https://i.ytimg.com/vi/DFyIA76BvD0/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGCwgUih_MA8=&rs=AOn4CLDN2ld7TUNuCkoAVDUR_vujS7z_pw",
    "isrc": null
  },
  "pluginInfo": {
    "authorURL": "https://example.com/acma-authors/crew"
  },
  "userData": {}
}

const track = new Track(testTrack, {}, { rest: { version: "v4" } });

console.log(track);
// (async () => {
// console.log("1", await track.info.thumbnail);
// console.log("2", await track.info.thumbnail);
// console.log("2", await track.#cachedThumbnail, track.#rawData);
// setTimeout(async () => {
// console.log("3", await track._cachedThumbnail)
// }, 5000)
// })()

console.log(track.pluginInfo)
