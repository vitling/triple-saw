import {createCRT} from "./crt.js";

function choose(array, power = 1) {
    return array[rndInt(array.length, power)]
}

function rndInt(max, power = 1) {
    return Math.floor(Math.pow(Math.random(), power) * max);
}

function Visualiser() {
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

    function displayCurrentKey(key) {
        g.fillStyle = "white";
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

    function visualise(leftOut, bassOut, rightOut, key) {
        g.clearRect(0,0,w,h);

        visualisePart(leftOut, "magenta",0);
        visualisePart(bassOut, "yellow",w/3);
        visualisePart(rightOut, "cyan",2 * w/3);

        displayCurrentKey(key);
    }

    return {visualise, randomRectangles, refreshFrame: () => crt.paintCanvasToScreen()}
}

export {Visualiser}