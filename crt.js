function createCRT(screenCanvas, filtersPath="filters.svg", alphaScale=1) {
    const canvas = screenCanvas ? screenCanvas : document.createElement("canvas");
    const w = canvas.width = 640;
    const h = canvas.height = 360;
    const g = canvas.getContext("2d");

    const screen = document.createElement("canvas");
    const sw = screen.width = 1920 / 2;
    const sh = screen.height = 1080 / 2;
    screen.style.width = "100%";
    screen.style.height = "100%";
    const gs = screen.getContext("2d");

    const scanlines = document.createElement("canvas");
    const slw = scanlines.width = w;
    const slh = scanlines.height = h;
    const sls = scanlines.getContext("2d");

    const stc = document.createElement("canvas");
    const stw = stc.width = w;
    const sth = stc.height = h;
    const sts = stc.getContext("2d");

    sls.lineWidth = 1;
    for (let y = 0; y < slh; y += 3) {
        sls.strokeStyle = "#000000";
        sls.beginPath();
        sls.moveTo(0, y + 0.5);
        sls.lineTo(slw, y + 0.5);
        sls.stroke();
    }

    function rnd(max) {
        return Math.floor(Math.random() * max);
    }
    let nI = 0;

    let slowFrames = 0;
    let performanceTrip = false;
    const performanceThreshold = 20;
    function recPerf(time) {
        if (time >10) { // if it takes longer than 10 ms
            slowFrames++;
            console.log("CRT canvas paint slow, will fall back in " + (performanceThreshold-slowFrames) + " slow frames")
        }
        if (slowFrames > performanceThreshold) {
            performanceTrip = true;
        }
    }

    function paintCanvasToScreen() {
        // fallback to no fx if we're slow
        if (performanceTrip) {
            gs.globalCompositeOperation = "source-over";
            gs.filter = "none";
            gs.globalAlpha = 1;
            gs.clearRect(0,0,sw,sh);
            gs.drawImage(canvas, 0, 0, w, h, 0, 0, sw, sh);
            return;
        }
        const t0 = performance.now();

        let filter = "url(" + filtersPath + "#horizontalBlur)";
        if (Math.random() < 0.1) {
            filter = filter + " url(" + filtersPath + "#hSync" + rnd(6) + ")";
        }

        let offsetX = rnd(4) - 2;
        let offsetY = rnd(4) - 2;

        //gs.imageSmoothingEnabled = false;
        gs.globalAlpha = 1 * alphaScale;
        gs.globalCompositeOperation = "source-over";
        gs.fillStyle = "black";
        gs.filter = "none";
        gs.fillRect(0, 0, sw, sh);
        gs.filter = filter;
        gs.drawImage(canvas, 0, 0, w, h, offsetX, offsetY, sw, sh);
        gs.globalAlpha = 1 * alphaScale;
        gs.globalCompositeOperation = "lighter";
        gs.drawImage(canvas, 0, 0, w, h, 0, 0, sw, sh);
        gs.globalCompositeOperation = "source-over";
        gs.filter = "none";
        gs.globalAlpha = 0.3 * alphaScale;
        gs.drawImage(scanlines, 0, 0, slw, slh, 0, 0, sw, sh);
        gs.globalAlpha = (0.4 + Math.random() * 0.2) * alphaScale;
        gs.filter = filter;
        gs.globalCompositeOperation = "lighter";
        gs.drawImage(canvas, 0, 0, w, h, offsetX, offsetY, sw, sh);

        sts.clearRect(0, 0, stw, sth);
        nI = (nI + 1) % 6;
        sts.filter = "url(" + filtersPath + "#noise" + nI + " )";
        sts.fillStyle = "rgba(255,255,255,1)";
        sts.fillRect(0, 0, stw, sth);
        gs.globalAlpha = 1 * alphaScale;
        gs.globalCompositeOperation = "source-over";
        gs.drawImage(stc, 0, 0, stw, sth, 0, 0, sw, sh);

        const t1 = performance.now();
        recPerf(t1-t0);
    }

    return {
        canvas: canvas,
        context: g,
        screen: screen,
        paintCanvasToScreen: paintCanvasToScreen
    }
}

export {createCRT}
