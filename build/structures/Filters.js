class Filters {
    constructor(player, options = {}) {
        this.player = player;
        this.volume = options.volume || 1
        this.equalizer = options.equalizer || [];
        this.karaoke = options.karaoke || null;
        this.timescale = options.timescale || null;
        this.tremolo = options.tremolo || null;
        this.vibrato = options.vibrato || null;
        this.rotation = options.rotation || null;
        this.distortion = options.distortion || null;
        this.channelMix = options.channelMix || null;
        this.lowPass = options.lowPass || null;
        this.bassboost = options.bassboost || null;
        this.slowmode = options.slowmode || null;
        this.nightcore = options.nightcore || null;
        this.vaporwave = options.vaporwave || null;
        this._8d = options._8d || null;
    }

    /**
     * @typedef {Object} EqualizerBand
     * @property {number} band
     * @property {number} gain
     */

    /**
     * Available Equalizer Presets
     */
    static Presets = {
        BassBoost: [
            { band: 0, gain: 0.6 }, { band: 1, gain: 0.67 }, { band: 2, gain: 0.67 }, { band: 3, gain: 0 }, { band: 4, gain: -0.5 },
            { band: 5, gain: 0.15 }, { band: 6, gain: -0.45 }, { band: 7, gain: 0.23 }, { band: 8, gain: 0.35 }, { band: 9, gain: 0.45 },
            { band: 10, gain: 0.55 }, { band: 11, gain: 0.6 }, { band: 12, gain: 0.55 }
        ],
        Soft: [
            { band: 0, gain: 0 }, { band: 1, gain: 0 }, { band: 2, gain: 0 }, { band: 3, gain: 0 }, { band: 4, gain: 0 },
            { band: 5, gain: 0 }, { band: 6, gain: 0 }, { band: 7, gain: 0 }, { band: 8, gain: -0.25 }, { band: 9, gain: -0.25 },
            { band: 10, gain: -0.25 }, { band: 11, gain: -0.25 }, { band: 12, gain: -0.25 }
        ],
        TV: [
            { band: 0, gain: 0 }, { band: 1, gain: 0 }, { band: 2, gain: 0 }, { band: 3, gain: 0 }, { band: 4, gain: 0 },
            { band: 5, gain: 0 }, { band: 6, gain: 0 }, { band: 7, gain: 0 }, { band: 8, gain: 0 }, { band: 9, gain: 0 },
            { band: 10, gain: 0 }, { band: 11, gain: 0 }, { band: 12, gain: 0 }
        ],
        TrebleBass: [
            { band: 0, gain: 0.6 }, { band: 1, gain: 0.67 }, { band: 2, gain: 0.67 }, { band: 3, gain: 0 }, { band: 4, gain: -0.5 },
            { band: 5, gain: 0.15 }, { band: 6, gain: -0.45 }, { band: 7, gain: 0.23 }, { band: 8, gain: 0.35 }, { band: 9, gain: 0.45 },
            { band: 10, gain: 0.55 }, { band: 11, gain: 0.6 }, { band: 12, gain: 0.55 }
        ],
        Nightcore: [
            { band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }, { band: 2, gain: 0.3 }, { band: 3, gain: 0.3 }, { band: 4, gain: 0.3 },
            { band: 5, gain: 0.3 }, { band: 6, gain: 0.3 }, { band: 7, gain: 0.3 }, { band: 8, gain: 0.3 }, { band: 9, gain: 0.3 },
            { band: 10, gain: 0.3 }, { band: 11, gain: 0.3 }, { band: 12, gain: 0.3 }
        ],
        Vaporwave: [
            { band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }, { band: 2, gain: 0.3 }, { band: 3, gain: 0.3 }, { band: 4, gain: 0.3 },
            { band: 5, gain: 0.3 }, { band: 6, gain: 0.3 }, { band: 7, gain: 0.3 }, { band: 8, gain: 0.3 }, { band: 9, gain: 0.3 },
            { band: 10, gain: 0.3 }, { band: 11, gain: 0.3 }, { band: 12, gain: 0.3 }
        ]
    };

    /**
     * Applies a predefined equalizer preset
     * @param {string} preset The name of the preset
     * @returns {Filters}
     */
    setPreset(preset) {
        if (!Filters.Presets[preset]) throw new Error(`Preset ${preset} not found. Available presets: ${Object.keys(Filters.Presets).join(", ")}`);
        
        this.setEqualizer(Filters.Presets[preset]);
        return this;
    }

    /**
     * 
     * @param {string[]} band
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
                level: options.level || 1.0,
                monoLevel: options.monoLevel || 1.0,
                filterBand: options.filterBand || 220.0,
                filterWidth: options.filterWidth || 100.0
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
                speed: options.speed || 1.0,
                pitch: options.pitch || 1.0,
                rate: options.rate || 1.0
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
                frequency: options.frequency || 2.0,
                depth: options.depth || 0.5
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
                frequency: options.frequency || 2.0,
                depth: options.depth || 0.5
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
                rotationHz: options.rotationHz || 0.0
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
                sinOffset: options.sinOffset || 0.0,
                sinScale: options.sinScale || 1.0,
                cosOffset: options.cosOffset || 0.0,
                cosScale: options.cosScale || 1.0,
                tanOffset: options.tanOffset || 0.0,
                tanScale: options.tanScale || 1.0,
                offset: options.offset || 0.0,
                scale: options.scale || 1.0
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
                leftToLeft: options.leftToLeft || 1.0,
                leftToRight: options.leftToRight || 0.0,
                rightToLeft: options.rightToLeft || 0.0,
                rightToRight: options.rightToRight || 1.0
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
                smoothing: options.smoothing || 20.0
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
            if (options.value < 0 || options.value > 5) throw new Error("Bassboost value must be between 0 and 5");

            this.bassboost = options.value || 5;
            const num = (options.value || 5 - 1) * (1.25 / 9) - 0.25;

            this.setEqualizer(Array(13).fill(0).map((n, i) => ({
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
                rate: options.rate || 0.8
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
                rate: options.rate || 1.5
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
                pitch: options.pitch || 0.5
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
                rotationHz: options.rotationHz || 0.2
            });
        } else {
            this._8d = null;
            this.setRotation(false)
        }
    }

    /**
     * Sets the speed of the audio (Timescale)
     * @param {number} speed
     */
    setSpeed(speed) {
        return this.setTimescale(true, {
            speed,
            pitch: this.timescale?.pitch || 1.0,
            rate: this.timescale?.rate || 1.0
        });
    }

    /**
     * Sets the pitch of the audio (Timescale)
     * @param {number} pitch
     */
    setPitch(pitch) {
        return this.setTimescale(true, {
            speed: this.timescale?.speed || 1.0,
            pitch,
            rate: this.timescale?.rate || 1.0
        });
    }

    /**
     * Sets the rate of the audio (Timescale)
     * @param {number} rate
     */
    setRate(rate) {
        return this.setTimescale(true, {
            speed: this.timescale?.speed || 1.0,
            pitch: this.timescale?.pitch || 1.0,
            rate
        });
    }

    /**
     * Clears all filters applied to the player
     * @returns {Filters}
     */
    async clear() {
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

    async clearFilters() {
        Object.assign(this, new Filters(this.player))
        
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
