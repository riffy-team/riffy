const withDefault = (value, fallback) => value ?? fallback;

class Filters {
    constructor(player, options = {}) {
        this.player = player;
        this.volume = withDefault(options.volume, 1)
        this.equalizer = withDefault(options.equalizer, []);
        this.karaoke = withDefault(options.karaoke, null);
        this.timescale = withDefault(options.timescale, null);
        this.tremolo = withDefault(options.tremolo, null);
        this.vibrato = withDefault(options.vibrato, null);
        this.rotation = withDefault(options.rotation, null);
        this.distortion = withDefault(options.distortion, null);
        this.channelMix = withDefault(options.channelMix, null);
        this.lowPass = withDefault(options.lowPass, null);
        this.bassboost = withDefault(options.bassboost, null);
        this.slowmode = withDefault(options.slowmode, null);
        this.nightcore = withDefault(options.nightcore, null);
        this.vaporwave = withDefault(options.vaporwave, null);
        this._8d = withDefault(options._8d, null);
    }

    /**
     * 
     * @param {{ band: number; gain: number; }[]} band
     * @returns 
     */

    setEqualizer(band) {
        this.equalizer = band;
        this.updateFilters();
        return this;
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setKaraoke(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.karaoke = {
                level: withDefault(options.level, 1.0),
                monoLevel: withDefault(options.monoLevel, 1.0),
                filterBand: withDefault(options.filterBand, 220.0),
                filterWidth: withDefault(options.filterWidth, 100.0)
            };

            this.updateFilters();
            return this;
        } else {
            this.karaoke = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setTimescale(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.timescale = {
                speed: withDefault(options.speed, 1.0),
                pitch: withDefault(options.pitch, 1.0),
                rate: withDefault(options.rate, 1.0)
            };

            this.updateFilters();
            return this;
        } else {
            this.timescale = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setTremolo(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.tremolo = {
                frequency: withDefault(options.frequency, 2.0),
                depth: withDefault(options.depth, 0.5)
            };

            this.updateFilters();
            return this;
        } else {
            this.tremolo = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setVibrato(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.vibrato = {
                frequency: withDefault(options.frequency, 2.0),
                depth: withDefault(options.depth, 0.5)
            };

            this.updateFilters();
            return this;
        } else {
            this.vibrato = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setRotation(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.rotation = {
                rotationHz: withDefault(options.rotationHz, 0.0)
            };

            this.updateFilters();
            return this;
        } else {
            this.rotation = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setDistortion(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.distortion = {
                sinOffset: withDefault(options.sinOffset, 0.0),
                sinScale: withDefault(options.sinScale, 1.0),
                cosOffset: withDefault(options.cosOffset, 0.0),
                cosScale: withDefault(options.cosScale, 1.0),
                tanOffset: withDefault(options.tanOffset, 0.0),
                tanScale: withDefault(options.tanScale, 1.0),
                offset: withDefault(options.offset, 0.0),
                scale: withDefault(options.scale, 1.0)
            };

            this.updateFilters();
            return this;
        } else {
            this.distortion = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setChannelMix(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.channelMix = {
                leftToLeft: withDefault(options.leftToLeft, 1.0),
                leftToRight: withDefault(options.leftToRight, 0.0),
                rightToLeft: withDefault(options.rightToLeft, 0.0),
                rightToRight: withDefault(options.rightToRight, 1.0)
            };

            this.updateFilters();
            return this;
        } else {
            this.channelMix = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setLowPass(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.lowPass = {
                smoothing: withDefault(options.smoothing, 20.0)
            };

            this.updateFilters();
            return this;
        } else {
            this.lowPass = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setBassboost(enabled, options = {}) {
        if (!this.player) return;

        if (enabled) {
            const value = withDefault(options.value, 5);

            if (value < 0 || value > 5) throw new Error("Bassboost value must be between 0 and 5");

            this.bassboost = value;
            const num = (value - 1) * (1.25 / 9) - 0.25;

            this.setEqualizer(Array(13).fill(0).map((_n, i) => ({
                band: i,
                gain: num
            })));
        } else {
            this.bassboost = null;
            this.setEqualizer([]);
        }
    }

    setSlowmode(enabled, options = {}) {
        if (!this.player) return;

        if (enabled) {
            this.slowmode = true;

            this.setTimescale(true, {
                rate: withDefault(options.rate, 0.8)
            })
        } else {
            this.slowmode = null;
            this.setTimescale(false)
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setNightcore(enabled, options = {}) {
        if (!this.player) return;

        if (enabled) {
            if (!this.player) return;
            this.nightcore = enabled;

            this.setTimescale(true, {
                rate: withDefault(options.rate, 1.5)
            })

            this.vaporwave = false;
        } else {
            this.nightcore = null;
            this.setTimescale(false)
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    setVaporwave(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.vaporwave = enabled;

            this.setTimescale(true, {
                pitch: withDefault(options.pitch, 0.5)
            })

            if (enabled) {
                this.nightcore = false;
            }
        } else {
            this.vaporwave = null;
            this.setTimescale(false)
        }
    }

    /**
     * 
     * @param {boolean} enabled 
     * @param {*} options 
     * @returns 
     */

    set8D(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this._8d = enabled;

            this.setRotation(true, {
                rotationHz: withDefault(options.rotationHz, 0.2)
            });
        } else {
            this._8d = null;
            this.setRotation(false)
        }
    }

    async clearFilters() {
        this.volume = 1;
        this.equalizer = [];
        this.karaoke = null;
        this.timescale = null;
        this.tremolo = null;
        this.vibrato = null;
        this.rotation = null;
        this.distortion = null;
        this.channelMix = null;
        this.lowPass = null;
        this.bassboost = null;
        this.slowmode = null;
        this.nightcore = null;
        this.vaporwave = null;
        this._8d = null;

        await this.updateFilters();
        return this;
    }

    async updateFilters() {
        const { equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass, volume } = this;

        await this.player.node.rest.updatePlayer({
            guildId: this.player.guildId,
            data: {
                filters: { volume, equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass }
            }
        });

        return this;
    }
}

module.exports = { Filters };