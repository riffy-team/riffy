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
        this.echo = options.echo || null;
        this.chorus = options.chorus || null;
        this.compressor = options.compressor || null;
        this.highpass = options.highpass || null;
        this.phaser = options.phaser || null;
        this.spatial = options.spatial || null;
        this.bassboost = options.bassboost || null;
        this.slowmode = options.slowmode || null;
        this.nightcore = options.nightcore || null;
        this.vaporwave = options.vaporwave || null;
        this._8d = options._8d || null;
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
     * NodeLink Only.
     * Delay-based repetitions with feedback control.
     */
    setEcho(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.echo = {
                delay: options.delay || 500,
                feedback: options.feedback || 0.3,
                mix: options.mix || 0.5
            };

            this.updateFilters();
            return this;
        } else {
            this.echo = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * NodeLink Only.
     * Simulates multiple voices with modulated delays.
     */
    setChorus(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.chorus = {
                rate: options.rate || 1.5,
                depth: options.depth || 0.5,
                delay: options.delay || 25,
                mix: options.mix || 0.6,
                feedback: options.feedback || 0.2
            };

            this.updateFilters();
            return this;
        } else {
            this.chorus = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * NodeLink Only.
     * Dynamic range compression for balanced audio.
     */
    setCompressor(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.compressor = {
                threshold: options.threshold || -20,
                ratio: options.ratio || 4,
                attack: options.attack || 10,
                release: options.release || 100,
                gain: options.gain || 5
            };

            this.updateFilters();
            return this;
        } else {
            this.compressor = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * NodeLink Only.
     * Attenuates low frequencies.
     */
    setHighpass(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.highpass = {
                smoothing: options.smoothing || 20
            };

            this.updateFilters();
            return this;
        } else {
            this.highpass = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * NodeLink Only.
     * Sweeps all-pass filters across the frequency spectrum.
     */
    setPhaser(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.phaser = {
                stages: options.stages || 6,
                rate: options.rate || 0.5,
                depth: options.depth || 0.7,
                feedback: options.feedback || 0.5,
                mix: options.mix || 0.5,
                minFrequency: options.minFrequency || 200,
                maxFrequency: options.maxFrequency || 2000
            };

            this.updateFilters();
            return this;
        } else {
            this.phaser = null;
            this.updateFilters();
            return this;
        }
    }

    /**
     * NodeLink Only.
     * Creates spatial audio using cross-channel delays.
     */
    setSpatial(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            this.spatial = {
                depth: options.depth || 0.8,
                rate: options.rate || 0.3
            };

            this.updateFilters();
            return this;
        } else {
            this.spatial = null;
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
        this.echo = null;
        this.chorus = null;
        this.compressor = null;
        this.highpass = null;
        this.phaser = null;
        this.spatial = null;
        this.bassboost = null;
        this.slowmode = null;
        this.nightcore = null;
        this.vaporwave = null;
        this._8d = null;

        await this.updateFilters();
        return this;
    }

    async updateFilters() {
        const { equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass, echo, chorus, compressor, highpass, phaser, spatial, volume } = this;

        const filters = { volume, equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass };

        // NodeLink supports additional filters beyond standard Lavalink filters.
        if (this.player?.node?.info?.isNodelink) {
            filters.echo = echo;
            filters.chorus = chorus;
            filters.compressor = compressor;
            filters.highpass = highpass;
            filters.phaser = phaser;
            filters.spatial = spatial;
        }

        await this.player.node.rest.updatePlayer({
            guildId: this.player.guildId,
            data: {
                filters
            }
        });

        return this;
    }
}

module.exports = { Filters };