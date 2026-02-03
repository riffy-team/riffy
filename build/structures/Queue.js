/**
 * Represents a queue of tracks.
 * @extends {Array}
 */
class Queue extends Array {
    /**
     * Get the size of the queue.
     * @returns {number} The number of tracks in the queue.
     */
    get size() {
        return this.length;
    }

    /**
     * Get the first track in the queue.
     * @returns {import("./Track").Track | undefined} The first track in the queue.
     */
    get first() {
        return this.length ? this[0] : null;
    }

    /**
     * Add a track to the queue.
     * @param {import("./Track").Track} track The track to add.
     * @returns {Queue} The queue instance.
     */
    add(track) {
        this.push(track);
        return this;
    }

    /**
     * Add a track to the beginning of the queue (priority).
     * @param {import("./Track").Track} track The track to add.
     * @returns {Queue} The queue instance.
     */
    unshift(track) {
        super.unshift(track);
        return this;
    }

    /**
     * Remove a track from the queue by index.
     * @param {number} index The index of the track to remove.
     * @returns {import("./Track").Track} The removed track.
     * @throws {RangeError} If the index is out of bounds.
     */
    remove(index) {
        if (index < 0 || index >= this.length) {
            throw new RangeError(`Index out of bounds: ${index} (Queue length: ${this.length})`);
        }
        return this.splice(index, 1)[0];
    }

    /**
     * Clear the queue.
     * @returns {Queue} The queue instance.
     */
    clear() {
        this.length = 0;
        return this;
    }

    /**
     * Shuffle the queue using the Fisher-Yates algorithm.
     * @returns {Queue} The queue instance.
     */
    shuffle() {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
    }

    /**
     * Move a track from one position to another.
     * @param {number} from The index of the track to move.
     * @param {number} to The index to move the track to.
     * @returns {Queue} The queue instance.
     * @throws {RangeError} If the index is out of bounds.
     */
    move(from, to) {
        if (from < 0 || from >= this.length) throw new RangeError(`'from' index out of bounds: ${from}`);
        if (to < 0 || to >= this.length) throw new RangeError(`'to' index out of bounds: ${to}`);

        if (from === to) return this;

        const [item] = this.splice(from, 1);
        this.splice(to, 0, item);
        return this;
    }
}

module.exports = { Queue };