class Queue extends Array {
    get size() {
        return this.length;
    }

    /**
     * Returns the total duration of the queue in milliseconds
     * @returns {number}
     */
    get duration() {
        return this.reduce((acc, track) => acc + (track.info.length || 0), 0);
    }

    get first() {
        return this.length ? this[0] : null;
    }

    add(track) {
        if (!track || typeof track !== 'object' || !track.info) {
            throw new TypeError("Invalid track provided to queue.add(). Expected a Track object.");
        }
        this.push(track);
        return this;
    }

    /**
     * Removes a track or a range of tracks from the queue
     * @param {number} index The index to remove, or the start index of the range
     * @param {number} [count=1] The number of tracks to remove
     * @returns {Track|Track[]} The removed track(s)
     */
    remove(index, count = 1) {
        if (typeof index !== 'number' || index < 0 || index >= this.length) {
            throw new Error(`Index ${index} out of range (0-${this.length - 1})`);
        }
        
        if (count === 1) {
            return this.splice(index, 1)[0];
        }
        
        return this.splice(index, count);
    }

    clear() {
        this.length = 0;
    }

    shuffle() {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
    }

    /**
     * Moves a track from one position to another
     * @param {number} from Index of the track to move
     * @param {number} to Index to move the track to
     * @returns {Queue}
     */
    move(from, to) {
        if (from < 0 || from >= this.length) throw new Error(`Invalid 'from' index: ${from}`);
        if (to < 0 || to >= this.length) throw new Error(`Invalid 'to' index: ${to}`);

        if (from === to) return this;

        const [track] = this.splice(from, 1);
        this.splice(to, 0, track);
        return this;
    }
}

module.exports = { Queue };
