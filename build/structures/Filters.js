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

    setEqualizer(band) {
        this.equalizer = band;
        this.updateFilters();
        return this;
    }

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

    setBassboost(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
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

        if (enabled == true) {
            this.slowmode = true;

            this.setTimescale(true, {
                rate: options.rate || 0.8
            })
        } else {
            this.slowmode = null;
            this.setTimescale(false)
        }
    }

    setNightcore(enabled, options = {}) {
        if (!this.player) return;

        if (enabled == true) {
            if (!this.player) return;
            this.nightcore = enabled;

            this.setTimescale(true, {
                rate: options.rate || 1.5
            })

            if (enabled) {
                this.vaporwave = false;
            }
        } else {
            this.nightcore = null;
            this.setTimescale(false)
        }
    }

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

    clearFilters() {
        this.player.filters = new Filters(this.player);
        this.updateFilters();
        return this;
    }

    updateFilters() {
        const { equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass, volume } = this;

        this.player.node.rest.updatePlayer({
            guildId: this.player.guildId,
            data: {
                filters: { volume, equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass }
            }
        });

        return this;
    }
}

module.exports = { Filters };
