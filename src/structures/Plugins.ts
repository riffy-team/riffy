import { Riffy } from ".."

export class Plugin {
    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    load(riffy: Riffy) { }
    unload(riffy: Riffy) { }
}