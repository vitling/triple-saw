/*
  Copyright 2020 David Whiting

  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/


/** Simple monosynth with decay-enveloped amp and lowpass filter */
class MonoSynth {
    constructor(audio, type="sawtooth") {
        this.osc = audio.createOscillator();
        this.amp = audio.createGain();
        this.filter = audio.createBiquadFilter();
        this.osc.connect(this.filter);
        this.filter.connect(this.amp);
        this.out = this.amp;

        this.osc.type = type;
        this.osc.frequency.setValueAtTime(110, audio.currentTime);
        this.amp.gain.setValueAtTime(0.1, audio.currentTime);
        this.osc.start();

        this.filter.type = "lowpass";
        this.filter.frequency.setValueAtTime(440, audio.currentTime);
        this.filter.Q.setValueAtTime(10, audio.currentTime);
        this.audio = audio;
    }
    connect(target) {
        this.out.connect(target);
    }
    play(pitch, filterFreq, decay) {
        let ctime = this.audio.currentTime+0.01;
        const attack = 0.04;
        const glide = 0.005;
        const error = Math.random()*0.01 - 0.005;

        this.osc.frequency.cancelScheduledValues(ctime);
        this.osc.frequency.setTargetAtTime((1 + error) * pitch, ctime, glide);

        this.amp.gain.cancelScheduledValues(ctime);
        this.amp.gain.setTargetAtTime(0.1, ctime, attack);
        this.amp.gain.setTargetAtTime(0.0, ctime + attack, decay);
        this.filter.frequency.cancelScheduledValues(ctime);
        this.filter.frequency.setTargetAtTime(filterFreq, ctime, attack);
        this.filter.frequency.setTargetAtTime(filterFreq / 2, ctime + attack, decay/2);
    }
}

/** Descending sine-based kick sound */
class Kick {
    constructor(audio) {
        this.osc = audio.createOscillator();
        this.osc.type = "sine";
        this.amp = audio.createGain();
        this.amp.gain.setValueAtTime(0, audio.currentTime);
        this.osc.connect(this.amp);
        this.osc.start(audio.currentTime);
        this.out = this.amp;
        this.audio = audio;
    }
    connect(target) {
        this.out.connect(target);
    }

    play() {
        let ctime = this.audio.currentTime+0.01;
        this.amp.gain.cancelScheduledValues(ctime);
        this.amp.gain.setTargetAtTime(0.3, ctime, 0.002);
        this.amp.gain.setTargetAtTime(0, ctime +0.002, 0.1);
        this.osc.frequency.cancelScheduledValues(ctime);
        this.osc.frequency.setTargetAtTime(440, ctime, 0.002);
        this.osc.frequency.setTargetAtTime(55, ctime +0.002, + 0.02);
    }
}

/** Delay line with feedback */
class FeedbackDelay {
    constructor(audio, delayTime, feedback) {
        this.delay = audio.createDelay();
        this.delay.delayTime.setValueAtTime(delayTime, audio.currentTime);
        this.delayFeedbackGain = audio.createGain();
        this.delayFeedbackGain.gain.setValueAtTime(feedback, audio.currentTime);
        this.feedback = this.delayFeedbackGain.gain;
        this.delay.connect(this.delayFeedbackGain);

        this.in = this.delay;
        this.out = this.delayFeedbackGain;
        this.delayFeedbackGain.connect(this.delay);
    }
}

/** Panner unit (should be just StereoPanner but that's not supported by Safari) */
class Panner {
    constructor(audio, pan) {
        if (audio.createStereoPanner) {
            this.panner = audio.createStereoPanner();
            this.panner.pan.setValueAtTime(pan, audio.currentTime);
        } else {
            // https://stackoverflow.com/questions/52809552/how-to-pan-audio-in-ios-web-audio-implementation
            this.panner = audio.createPanner();
            this.panner.panningModel = "equalpower";
            this.panner.setPosition(pan,0,1-Math.abs(pan));
        }
        this.in = this.panner;
        this.out = this.panner;
    }
}

export {MonoSynth, FeedbackDelay, Kick, Panner}