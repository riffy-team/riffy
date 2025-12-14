/**
 * Represents a music queue.
 * @extends Array
 */
class Queue extends Array {
    /**
     * Gets the size of the queue.
     * @returns {number}
     */
    get size() {
        return this.length;
    }

    /**
     * Gets the first track in the queue.
     * @returns {*} The first track or null.
     */
    get first() {
        return this.length ? this[0] : null;
    }

    /**
     * Adds a track to the queue.
     * @param {*} track - The track to add.
     * @returns {Queue} The queue instance.
     */
    add(track) {
        this.push(track);
        return this;
    }

    /**
     * Removes a track from the queue at the specified index.
     * @param {number} index - The index to remove.
     * @returns {*} The removed track.
     * @throws {Error} If index is out of range.
     */
    remove(index) {
        if (index >= 0 && index < this.length) {
            return this.splice(index, 1)[0];
        } else {
            throw new Error("Index out of range");
        }
    }

    /**
     * Clears the queue.
     * @returns {void}
     */
    clear() {
        this.length = 0;
    }

    /**
     * Shuffles the queue.
     * @returns {void}
     */
    shuffle() {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
    }
}

module.exports = { Queue };