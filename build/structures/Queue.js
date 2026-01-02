class Queue extends Array {
    get size() {
        return this.length;
    }

    get first() {
        return this.length ? this[0] : null;
    }

    add(track) {
        this.push(track);
        return this;
    }

    remove(index) {
        if (index >= 0 && index < this.length) {
            return this.splice(index, 1)[0];
        } else {
            throw new Error("Index out of range");
        }
    }

    clear() {
        this.length = 0;
    }

    shuffle() {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
    }
}

module.exports = { Queue };