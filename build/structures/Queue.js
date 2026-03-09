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
     * @returns {import("./Track").Track | undefined} The first track in the queue, or undefined if empty.
     */
    get first() {
        return this[0];
    }

    /**
     * Get the last track in the queue.
     * @returns {import("./Track").Track | undefined} The last track in the queue, or undefined if empty.
     */
    get last() {
        return this[this.length - 1];
    }

    /**
     * Get the total duration of all tracks in the queue in milliseconds.
     * Streams (tracks with no finite length) are excluded from the calculation.
     * @returns {number} Total duration in milliseconds.
     */
    get totalDuration() {
        let total = 0;
        for (let i = 0; i < this.length; i++) {
            const len = this[i]?.info?.length;
            if (typeof len === "number" && isFinite(len)) total += len;
        }
        return total;
    }

    /**
     * Add one or more tracks to the queue.
     * @param {import("./Track").Track | import("./Track").Track[]} track The track or array of tracks to add.
     * @returns {Queue} The queue instance.
     */
    add(track) {
        if (Array.isArray(track)) {
            for (let i = 0; i < track.length; i++) this.push(track[i]);
        } else {
            this.push(track);
        }
        return this;
    }

    /**
     * Add a track at a specific position in the queue.
     * @param {number} index The index to insert the track at.
     * @param {import("./Track").Track} track The track to insert.
     * @returns {Queue} The queue instance.
     * @throws {RangeError} If the index is out of bounds.
     */
    addAt(index, track) {
        if (index < 0 || index > this.length) {
            throw new RangeError(`Index out of bounds: ${index} (Queue length: ${this.length})`);
        }
        this.splice(index, 0, track);
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
     * Remove a range of tracks from the queue.
     * @param {number} start The start index (inclusive).
     * @param {number} end The end index (exclusive).
     * @returns {import("./Track").Track[]} The removed tracks.
     * @throws {RangeError} If the indices are out of bounds or start >= end.
     */
    removeRange(start, end) {
        if (start < 0 || start >= this.length) throw new RangeError(`'start' index out of bounds: ${start}`);
        if (end < 1 || end > this.length) throw new RangeError(`'end' index out of bounds: ${end}`);
        if (start >= end) throw new RangeError(`'start' (${start}) must be less than 'end' (${end})`);
        return this.splice(start, end - start);
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
     * Reverse the order of tracks in the queue.
     * @returns {Queue} The queue instance.
     */
    reverse() {
        super.reverse();
        return this;
    }

    /**
     * Swap two tracks in the queue by their indices.
     * @param {number} index1 The index of the first track.
     * @param {number} index2 The index of the second track.
     * @returns {Queue} The queue instance.
     * @throws {RangeError} If either index is out of bounds.
     */
    swap(index1, index2) {
        if (index1 < 0 || index1 >= this.length) throw new RangeError(`'index1' out of bounds: ${index1}`);
        if (index2 < 0 || index2 >= this.length) throw new RangeError(`'index2' out of bounds: ${index2}`);
        if (index1 === index2) return this;

        [this[index1], this[index2]] = [this[index2], this[index1]];
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

    /**
     * Remove all tracks before the given index, effectively skipping to that track.
     * The track at the given index becomes the first track in the queue.
     * @param {number} index The index to skip to.
     * @returns {import("./Track").Track[]} The removed tracks.
     * @throws {RangeError} If the index is out of bounds.
     */
    skipTo(index) {
        if (index < 0 || index >= this.length) {
            throw new RangeError(`Index out of bounds: ${index} (Queue length: ${this.length})`);
        }
        return this.splice(0, index);
    }

    /**
     * Remove duplicate tracks from the queue based on track identifier.
     * Keeps the first occurrence of each track.
     * @returns {import("./Track").Track[]} The removed duplicate tracks.
     */
    removeDuplicates() {
        const seen = new Set();
        const removed = [];

        for (let i = this.length - 1; i >= 0; i--) {
            const id = this[i]?.info?.identifier || this[i]?.info?.uri;
            if (!id || seen.has(id)) {
                removed.push(this.splice(i, 1)[0]);
            } else {
                seen.add(id);
            }
        }
        // Reverse so removed array reflects original order
        removed.reverse();
        return removed;
    }
}

module.exports = { Queue };