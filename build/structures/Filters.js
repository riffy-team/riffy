class Filters {
    constructor(player, options = {}) {
        this.player = player;
        this.volume = options.volume || 1;
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

    setEqualizer(bands) {
        this.equalizer = bands;
        this.updateFilters();
        return this;
    }

    setKaraoke(karaoke) {
        if (!this.player) return;
        this.karaoke = karaoke || {
            level: 1.0,
            monoLevel: 1.0,
            filterBand: 220.0,
            filterWidth: 100.0
        };

        this.updateFilters();
        return this;
    }

    setTimescale(timescale) {
        this.timescale = timescale || {
            "speed": 1.0,
            "pitch": 1.0,
            "rate": 1.0
        };
        this.updateFilters();
        return this;
    }

    setTremolo(tremolo) {
        this.tremolo = tremolo || {
            "frequency": 2.0,
            "depth": 0.5
        };
        this.updateFilters();
        return this;
    }

    setVibrato(vibrato) {
        this.vibrato = vibrato || {
            "frequency": 2.0,
            "depth": 0.5
        };
        this.updateFilters();
        return this;
    }

    setRotation(rotation) {
        this.rotation = rotation || {
            "rotationHz": 0.0
        };
        this.updateFilters();
        return this;
    }

    setDistortion(distortion) {
        this.distortion = distortion || {
            "sinOffset": 0.0,
            "sinScale": 1.0,
            "cosOffset": 0.0,
            "cosScale": 1.0,
            "tanOffset": 0.0,
            "tanScale": 1.0,
            "offset": 0.0,
            "scale": 1.0
        };
        this.updateFilters();
        return this;
    }

    setChannelMix(mix) {
        this.channelMix = mix || {
            "leftToLeft": 1.0,
            "leftToRight": 0.0,
            "rightToLeft": 0.0,
            "rightToRight": 1.0
        };
        this.updateFilters();
        return this;
    }

    setLowPass(pass) {
        this.lowPass = pass || {
            "smoothing": 20.0
        };
        this.updateFilters();
        return this;
    }

    clearFilters() {
        this.player.filters = new Filters(this.player);
        this.updateFilters();
        return this;
    }

    setBassboost(val) {
        if (!this.player) return;
        if (val < 0 || val > 5) throw new Error("Bassboost value must be between 0 and 5");

        this.bassboost = val;
        const num = (val - 1) * (1.25 / 9) - 0.25;
        this.setEqualizer(Array(13).fill(0).map((n, i) => ({
            band: i,
            gain: num
        })));

        return this;
    }

    setSlowmode(val) {
        if (!this.player) return;
        this.slowmode = val;
        this.setTimescale(val ? { rate: 0.8 } : null);

        return val;
    }

    setNightcore(val) {
        if (!this.player) return;
        this.nightcore = val;
        this.setTimescale(val ? { rate: 1.5 } : null);

        if (val) {
            this.vaporwave = false;
        }

        return val;
    }

    setVaporwave(val) {
        if (!this.player) return;
        this.vaporwave = val;

        if (val) {
            this.nightcore = false;
        }

        this.setTimescale(val ? { pitch: 0.5 } : null);
    }

    set8D(val) {
        if (!this.player) return;
        this._8d = val;
        this.setRotation(val ? { rotationHz: 0.2 } : null);
    }

    setFilters(options) {
        this.player.filters = new Filters(this.player, options);
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