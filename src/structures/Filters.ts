import { Player } from "../index";

/**
 * There are 15 bands (0-14) that can be changed. "gain" is the multiplier for the given band. The default value is 0. Valid values range from -0.25 to 1.0, where -0.25 means the given band is completely muted, and 0.25 means it is doubled. Modifying the gain could also change the volume of the output.
 * @interface
 * @property {number} band The band (0 to 14)
 * @property {number} gain The gain (-0.25 to 1.0)
 * 
 */

interface Band {
    band: number;
    gain: number;
}

/**
 * Uses equalization to eliminate part of a band, usually targeting vocals.
 * @interface
 * @property {number} level The level (0 to 1.0 where 0.0 is no effect and 1.0 is full effect)
 * @property {number} monoLevel The mono level (0 to 1.0 where 0.0 is no effect and 1.0 is full effect)
 * @property {number} filterBand The filter band (in Hz)
 * @property {number} filterWidth The filter width
 * 
 */

interface karaokeOptions {
    level?: number;
    monoLevel?: number;
    filterBand?: number;
    filterWidth?: number;
}

/**
 * Changes the speed, pitch, and rate. All default to 1.0.
 * @interface
 * @property {number} speed The playback speed 0.0 ≤ x
 * @property {number} pitch The pitch 0.0 ≤ x
 * @property {number} rate The rate 0.0 ≤ x
 * 
 */

interface timescaleOptions {
    speed?: number;
    pitch?: number;
    rate?: number;
}

/**
 * Uses amplification to create a shuddering effect, where the volume quickly oscillates. Demo: https://en.wikipedia.org/wiki/File:Fuse_Electronics_Tremolo_MK-III_Quick_Demo.ogv
 * @interface
 * @property {number} frequency The frequency 0.0 < x
 * @property {number} depth The tremolo depth 0.0 < x ≤ 1.0
 */

interface tremoloOptions {
    frequency?: number;
    depth?: number;
}

/**
 * Similar to tremolo. While tremolo oscillates the volume, vibrato oscillates the pitch.
 * @interface
 * @property {number} frequency The frequency 0.0 < x ≤ 14.0
 * @property {number} depth The vibrato depth 0.0 < x ≤ 1.0
 * 
 */

interface vibratoOptions {
    frequency?: number;
    depth?: number;
}

/**
 * Rotates the sound around the stereo channels/user headphones (aka Audio Panning). It can produce an effect similar to https://youtu.be/QB9EB8mTKcc (without the reverb).
 * @interface
 * @property {number} rotationHz The frequency of the audio rotating around the listener in Hz. 0.2 is similar to the example video above
 * 
 */

interface rotationOptions {
    rotationHz?: number;
}

/**
 * Distortion effect. It can generate some pretty unique audio effects.
 * @interface
 * @property {number} sinOffset The sin offset
 * @property {number} sinScale The sin scale
 * @property {number} cosOffset The cos offset
 * @property {number} cosScale The cos scale
 * @property {number} tanOffset The tan offset
 * @property {number} tanScale The tan scale
 * @property {number} offset The offset
 * @property {number} scale The scale
 * 
 */

interface distortionOptions {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}

/**
 * Mixes both channels (left and right), with a configurable factor on how much each channel affects the other. With the defaults, both channels are kept independent of each other. Setting all factors to 0.5 means both channels get the same audio.
 * @interface
 * @property {number} leftToLeft The left to left channel mix factor (0.0 ≤ x ≤ 1.0)
 * @property {number} leftToRight The left to right channel mix factor (0.0 ≤ x ≤ 1.0)
 * @property {number} rightToLeft The right to left channel mix factor (0.0 ≤ x ≤ 1.0)
 * @property {number} rightToRight The right to right channel mix factor (0.0 ≤ x ≤ 1.0)
 * 
 */

export interface channelMixOptions {
    leftToLeft?: number;
    leftToRight?: number;
    rightToLeft?: number;
    rightToRight?: number;
}

/**
 * Higher frequencies get suppressed, while lower frequencies pass through this filter, thus the name low pass. Any smoothing values equal to or less than 1.0 will disable the filter.
 * @interface
 * @property {number} smoothing The smoothing factor (1.0 < x)
 */

interface lowPassOptions {
    smoothing?: number;
}

export interface FiltersOptions {
    volume: number | null;
    equalizer: Band[];
    karaoke: karaokeOptions | null;
    tremolo: tremoloOptions | null;
    vibrato: vibratoOptions | null;
    rotation: rotationOptions | null;
    distortion: distortionOptions | null;
    channelMix: channelMixOptions | null;
    lowPass: lowPassOptions | null;
    timescale: timescaleOptions | null;
    bassboost: number | null;
    slowmode: boolean | null;
    nightcore: boolean | null;
    vaporwave: boolean | null;
    _8d: boolean | null;
}

export class Filters {
    public player: Player;
    public volume: number | null;
    public equalizer: Band[];
    public karaoke: karaokeOptions | null;
    public timescale: timescaleOptions | null;
    public tremolo: tremoloOptions | null;
    public vibrato: vibratoOptions | null;
    public rotation: rotationOptions | null;
    public distortion: distortionOptions | null;
    public channelMix: channelMixOptions | null;
    public lowPass: lowPassOptions | null;

    // Custom Filters
    public bassboost: number | null;
    public slowmode: boolean | null;
    public nightcore: boolean | null;
    public vaporwave: boolean | null;
    public _8d: boolean | null;

    constructor(player: Player, options?: FiltersOptions) {
        this.player = player;
        this.volume = options?.volume || 1.0
        this.equalizer = options?.equalizer || [];
        this.karaoke = options?.karaoke || null;
        this.timescale = options?.timescale || null;
        this.tremolo = options?.tremolo || null;
        this.vibrato = options?.vibrato || null;
        this.rotation = options?.rotation || null;
        this.distortion = options?.distortion || null;
        this.channelMix = options?.channelMix || null;
        this.lowPass = options?.lowPass || null;
        this.bassboost = options?.bassboost || null;
        this.slowmode = options?.slowmode || null;
        this.nightcore = options?.nightcore || null;
        this.vaporwave = options?.vaporwave || null;
        this._8d = options?._8d || null;
    }

    setEqualizer(band: Band[]) {
        if (!this.player) return;

        this.equalizer = band;

        this.updateFilters();
        return this;
    }

    setKaraoke(options: karaokeOptions | null) {
        if (!this.player) return;

        this.karaoke = options
        this.updateFilters();
        return this;
    }

    setTimescale(options: timescaleOptions | null) {
        if (!this.player) return;

        this.timescale = options

        this.updateFilters();
        return this;
    }

    setTremolo(options: tremoloOptions | null) {
        if (!this.player) return;

        this.tremolo = options

        this.updateFilters();
        return this;
    }

    setVibrato(options: vibratoOptions | null) {
        if (!this.player) return;

        this.vibrato = options

        this.updateFilters();
        return this;
    }

    setRotation(options: rotationOptions | null) {
        if (!this.player) return;

        this.rotation = options

        this.updateFilters();
        return this;
    }

    setDistortion(options: distortionOptions | null) {
        if (!this.player) return;

        this.distortion = options

        this.updateFilters();
        return this;
    }

    setChannelMix(options: channelMixOptions | null) {
        if (!this.player) return;

        this.channelMix = options

        this.updateFilters();
        return this;
    }

    setLowPass(options: lowPassOptions | null) {
        if (!this.player) return;

        this.lowPass = options

        this.updateFilters();
        return this;
    }

    setBassboost(value: number) {
        if (!this.player) return;

        if (value < 0 && value > 6) throw Error('Bassboost value must be between 0 to 5')

        this.bassboost = value;

        let num = (value - 1) * (1.25 / 9) - 0.25;

        this.setEqualizer(Array(13).fill(0).map((n, i) => ({
            band: i,
            gain: num
        })));

        return null;
    }

    setSlowmode(value: boolean) {
        if (!this.player) return;

        this.slowmode = value;

        this.setTimescale(value ? { speed: 0.5, pitch: 1.0, rate: 0.8 } : null)
    }

    setNightcore(value: boolean) {
        if (!this.player) return;

        this.nightcore = value;

        if (value) this.vaporwave = false;

        this.setTimescale(value ? { rate: 1.5 } : null)
    }


    setVaporwave(value: boolean) {
        if (!this.player) return;

        this.vaporwave = value;

        if (value) this.nightcore = false;

        this.setTimescale(value ? {
            pitch: 0.5
        } : null)
    }

    set8D(value: boolean) {
        if (!this.player) return;

        this._8d = value;

        this.setRotation(value ? { rotationHz: 0.2 } : null);
    }

    async clearFilters() {
        this.player.filters = new Filters(this.player);

        if (this.nightcore) this.setNightcore(false)
        if (this.equalizer.length !== 0) this.setEqualizer([])
        if (this._8d) this.set8D(false)
        if (this.slowmode) this.setSlowmode(false)

        await this.updateFilters();
        return this;
    }

    async updateFilters() {
        const { equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass, volume } = this;

        await this.player.node.rest.updatePlayer({
            guildId: this.player.guildId,
            data: {
                filters: {
                    volume, equalizer, karaoke, timescale, tremolo, vibrato, rotation, distortion, channelMix, lowPass
                }
            }
        })

        return this;
    }
}