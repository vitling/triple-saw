import { createCRT } from "./crt.js";

const startButton = document.getElementById("startButton");

const SCALES = {
    majPent: [0, 2, 4, 7, 9],
    maj: [0, 2, 4, 5, 7, 9, 11],
    minPent: [0,2,3,7,10],
    minSix: [0,2,3,5,7,10]
};
const NOTE_NAMES = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const SEMITONE_FACTOR = Math.pow(2, 1.0 / 12); // equal temperament tuning

function start() {

    const audio = new (window.AudioContext || window.webkitAudioContext)();

    class MonoSynth {
        constructor(type="sawtooth") {
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
        }
        connect(target) {
            this.out.connect(target);
        }
        play(pitch, filterFreq, decay = secondsPer16th * 4) {
            let ctime = audio.currentTime+0.01;
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
    class Kick {
        constructor() {
            this.osc = audio.createOscillator();
            this.osc.type = "sine";
            this.amp = audio.createGain();
            this.amp.gain.setValueAtTime(0, audio.currentTime);
            this.osc.connect(this.amp);
            this.osc.start(audio.currentTime);
            this.out = this.amp;
        }
        connect(target) {
            this.out.connect(target);
        }

        play() {
            let ctime = audio.currentTime+0.01;
            this.amp.gain.cancelScheduledValues(ctime);
            this.amp.gain.setTargetAtTime(0.3, ctime, 0.002);
            this.amp.gain.setTargetAtTime(0, ctime +0.002, 0.1);
            this.osc.frequency.cancelScheduledValues(ctime);
            this.osc.frequency.setTargetAtTime(440, ctime, 0.002);
            this.osc.frequency.setTargetAtTime(55, ctime +0.002, + 0.02);
        }
    }

    class FeedbackDelay {
        constructor(delayTime, feedback) {
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

    class Panner {
        constructor(pan) {
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

    const bpm = 111;
    const secondsPerBeat = 60 / bpm;
    const secondsPer16th = secondsPerBeat / 4;

    let mainOut = audio.destination;

    let kickEnabled = false;
    let mondrianEnabled = false;

    window.addEventListener("keypress", function(k) {
        if (k.key === "k") kickEnabled = !kickEnabled;
        if (k.key === "m") mondrianEnabled = !mondrianEnabled;
    });

    function choose(array, power = 1) {
        return array[rndInt(array.length, power)]
    }

    function rndInt(max, power = 1) {
        return Math.floor(Math.pow(Math.random(), power) * max);
    }

    let baseKey = rndInt(12);

    function createPart(baseAPitch = 110, scale, wave="sawtooth", pan = 0) {
        const monoSynth = new MonoSynth(wave);
        const delay = new FeedbackDelay(secondsPer16th * 3 + Math.random() * 0.02 - 0.01, 0.5);

        let panner = new Panner(pan);

        monoSynth.connect(panner.in);
        monoSynth.connect(delay.in);

        delay.out.connect(panner.in);
        panner.out.connect(mainOut);

        function keyToFreq(semisAboveBase) {
            // equal temperament tuning
            return Math.pow(SEMITONE_FACTOR, semisAboveBase + baseKey) * baseAPitch;
        }

        let stepNumber = 0;
        let seq = [];

        //### Pattern mutators
        function reshapeSequence() {
            const seqLength = choose([3,4, 5,8,12]);
            seq.length = seqLength;
            for (let i =0 ; i < seqLength; i++) {
                if (seq[i] === undefined) {
                    seq[i] = choose(scale) + choose([0,12]);
                }
            }
        }
        reshapeSequence();

        function swap() {
            //swap elements
            let a = rndInt(seq.length);
            let b = rndInt(seq.length);
            let t = seq[a];
            seq[a] = seq[b];
            seq[b] = t;
        }

        function randomizeOne() {
            //randomize element
            let index = rndInt(seq.length);
            seq[index] = choose(scale) + choose([0, 12])
        }

        function mutate() {
            choose([swap, randomizeOne, reshapeSequence], 5)();
        }

        // TODO refactor these into general-purpose second-order brownian parameter
        let filterExp = 7;
        let filterDirection = Math.random() * 0.04 - 0.02;

        let delayFeedback = 0.5;
        let delayDirection = Math.random() * 0.004 - 0.002;

        function step() {
            stepNumber++;
            monoSynth.play(keyToFreq(seq[stepNumber % seq.length]), Math.exp(filterExp), 0.2);
            if (stepNumber % 4 === 0) {
                mutate();
            }
            filterExp += filterDirection;
            filterDirection += choose([0.002, -0.002]);
            filterDirection *= 0.95;
            if (filterExp > 9) filterDirection -= 0.03;
            if (filterExp < 5) filterDirection += 0.03;


            delayFeedback += delayDirection;
            delayDirection += choose([0.0007, -0.0007]);
            delayDirection *= 0.95;
            if (delayFeedback > 0.9) delayDirection -= 0.001;
            if (delayFeedback < 0.1) delayDirection += 0.001;
            delay.feedback.setTargetAtTime(delayFeedback, audio.currentTime, 0.04);

            return {
               step: (stepNumber % seq.length), filter: Math.floor(Math.exp(filterExp)), delayFb: Math.floor(delayFeedback * 100), seq
            };
        }
        return {step}
    }

    const crt = createCRT(null, "./filters.svg", 0.4);
    document.getElementById("wrapper").append(crt.screen);
    const g = crt.context;
    const w = crt.canvas.width;
    const h = crt.canvas.height;

    const fontSize = 20;
    g.font = fontSize + "px 'Share Tech Mono'";

    function visualisePart(out, color, offsetX, offsetY = fontSize * 2) {
        const bW = (w/(3 * 24));
        const bH = fontSize;
        g.globalAlpha = 0.3;
        g.fillStyle = color;
        JSON.stringify(out,null,1).split("\n").forEach((line, i) => g.fillText(line, offsetX, offsetY +i * bH));
        g.globalAlpha = 1;

        for (let i = 0; i < out.seq.length; i++) {
            let y = offsetY + (4 + i) * bH;
            let x = offsetX + out.seq[i] * bW;
            let isStep = i === out.step;
            g.fillStyle = isStep ? "white" : color;
            g.fillRect(x,y,bW,bH);
            if (isStep) {
                g.fillRect(offsetX,y + bH/2, 2, 2);
            }
        }

        g.globalCompositeOperation = "difference";
        g.strokeStyle = color;
        g.lineWidth = 6;
        g.beginPath();
        let y = offsetY  + bH * 4 + + h * out.filter/10000;
        g.moveTo(offsetX, y);
        g.lineTo(offsetX + bW * 24, y);
        g.stroke();
        g.globalCompositeOperation = "source-over";
    }

    function displayCurrentKey() {
        g.fillStyle = "white";
        const key = NOTE_NAMES[baseKey % 12];
        g.fillText("Key: " + key + " minor", 10, fontSize);
    }

    function randomRectangles() {
        g.save();
        g.globalCompositeOperation = "difference";
        for (let i = 0; i < 5; i++) {
            g.fillStyle = choose(["magenta", "cyan", "yellow", "white"]);
            let x = rndInt(w);
            let y = rndInt(h);
            let rw = rndInt(w - x);
            let rh = rndInt(h - y);
            g.fillRect(x, y, rw, rh);
        }
        g.restore();
    }

    const kick = new Kick();
    kick.out.connect(mainOut);

    const left = createPart(110, SCALES.minPent, "sawtooth", -0.6);
    const right = createPart(110, SCALES.minPent, "sawtooth", 0.6);
    const bass = createPart(55, [0], "sawtooth", 0);

    let stepGlobal = 0;
    function globalStep() {
        stepGlobal++;
        if (kickEnabled && stepGlobal % 4 === 0) {
           kick.play();
        }
        if (stepGlobal % 128 === 0) {
            baseKey = (baseKey + choose([0,7,5,10,2], 3)) % 12;
        }
        let leftOut = left.step();
        let rightOut = right.step();
        let bassOut = bass.step();

        g.clearRect(0,0,w,h);

        visualisePart(leftOut, "magenta",0);
        visualisePart(bassOut, "yellow",w/3);
        visualisePart(rightOut, "cyan",2 * w/3);

        displayCurrentKey();

        if (mondrianEnabled) {
            randomRectangles();
        }
    }

    function paint() {
        crt.paintCanvasToScreen();
    }


    window.setInterval(paint, 1000 / 30);
    window.setInterval(globalStep, 1000 * secondsPer16th);

    startButton.style.display = "none";
}

startButton.onclick = start;
