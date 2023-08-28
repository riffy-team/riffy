class Plugin {
    constructor(name) {
        this.name = name;
    }

    load(riffy) { }
    unload(riffy) { }
}

module.exports = { Plugin };