import { createCRT } from "./crt.js";
import { MonoSynth, Kick, FeedbackDelay, Panner } from "./devices.js";

const startButton = document.getElementById("startButton");

const SCALES = {
    majPent: [0, 2, 4, 7, 9],
    maj: [0, 2, 4, 5, 7, 9, 11],
    minPent: [0,2,3,7,10],
    minSix: [0,2,3,5,7,10]
};
const NOTE_NAMES = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const SEMITONE_FACTOR = Math.pow(2, 1.0 / 12); // equal temperament tuning

function choose(array, power = 1) {
    return array[rndInt(array.length, power)]
}

function rndInt(max, power = 1) {
    return Math.floor(Math.pow(Math.random(), power) * max);
}

function Pattern(scale) {
    const seq=[];

    function reshapeSequence() {
        const seqLength = choose([3,4, 5,8,12]);
        seq.length = seqLength;
        for (let i =0 ; i < seqLength; i++) {
            if (seq[i] === undefined) {
                seq[i] = choose(scale) + choose([0,12]);
            }
        }
    }
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

    function get(step) {
        return seq[step % seq.length];
    }

    reshapeSequence();

    return {seq, get, mutate}
}

function WanderingParameter(lowerBound, upperBound, drift, correction) {
    let value = (lowerBound + upperBound) / 2;
    let direction = Math.random() * 20 * drift - 10 * drift;

    function moveAndGet() {
        value += direction;
        direction *= 0.95;
        if (value < lowerBound) {
            direction += correction;
        }
        if (value > upperBound) {
            direction -= correction;
        }

        direction += choose([drift, -drift]);
        return value;
    }

    return {moveAndGet: moveAndGet, value: () => value};
}

function start() {

    const audio = new (window.AudioContext || window.webkitAudioContext)();

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

    let baseKey = rndInt(12);

    function createPart(baseAPitch = 110, scale, wave="sawtooth", pan = 0) {
        const monoSynth = new MonoSynth(audio, wave);
        const delay = new FeedbackDelay(audio, secondsPer16th * 3 + Math.random() * 0.02 - 0.01, 0.5);

        let panner = new Panner(audio, pan);

        monoSynth.connect(panner.in);
        monoSynth.connect(delay.in);

        delay.out.connect(panner.in);
        panner.out.connect(mainOut);

        function keyToFreq(semisAboveBase) {
            // equal temperament tuning
            return Math.pow(SEMITONE_FACTOR, semisAboveBase + baseKey) * baseAPitch;
        }

        let stepNumber = 0;
        const pattern = Pattern(scale);

        const filterExponent = WanderingParameter(5, 9, 0.002, 0.03);
        const delayFeedback = WanderingParameter(0.1,0.9,0.0007,0.001);

        function step() {
            stepNumber++;

            const oscFreq = keyToFreq(pattern.get(stepNumber));
            const filterFreq = Math.exp(filterExponent.moveAndGet());

            monoSynth.play(oscFreq, filterFreq, 0.2);

            if (stepNumber % 4 === 0) {
                pattern.mutate();
            }

            delay.feedback.setTargetAtTime(delayFeedback.moveAndGet(), audio.currentTime, 0.04);

            return {
               step: (stepNumber % pattern.seq.length), filter: Math.floor(Math.exp(filterExponent.value())), delayFb: Math.floor(delayFeedback.value() * 100), seq: pattern.seq
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

    const kick = new Kick(audio);
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
