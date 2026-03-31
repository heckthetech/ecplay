/**
 * Video Enhancements Addon for Chrona Player
 * Requires addon.js.
 */
(function () {
    if (!window.ChronaAddonAPI) {
        console.error("[Video Enhancements Addon] ChronaAddonAPI not found.");
        return;
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const svgFilter = document.createElementNS(svgNS, "svg");
    svgFilter.style.display = "none";
    svgFilter.innerHTML = `
      <filter id="video-sharpen-filter">
        <feConvolveMatrix id="sharpen-matrix" order="3 3" preserveAlpha="true" kernelMatrix="0 0 0 0 1 0 0 0 0"/>
      </filter>
    `;
    document.body.appendChild(svgFilter);

    const videoSubmenuContent = window.ChronaAddonAPI.addSubmenu("Video Enhancements");
    if (!videoSubmenuContent) return;

    const eyeEaseSubmenuContent = window.ChronaAddonAPI.addSubmenu("Comfort Fade (EyeEase)", videoSubmenuContent);
    eyeEaseSubmenuContent.innerHTML = `
        <div class="addon-submenu-row" id="eyeease-fade-row">
            <div style="display: flex; flex-direction: column;">
                <span>Enable Comfort Fade</span>
                <span style="font-size: 0.75rem; color: #888; margin-top: 4px;">Continuously softens sudden white flashes</span>
            </div>
            <input type="checkbox" class="m3-switch" id="eyeease-fade-toggle">
        </div>
        <div class="addon-submenu-row" id="eyeease-balance-row">
            <div style="display: flex; flex-direction: column;">
                <span>Bright Scene Balancer</span>
                <span style="font-size: 0.75rem; color: #888; margin-top: 4px;">Dims excessively bright scenes smoothly</span>
            </div>
            <input type="checkbox" class="m3-switch" id="eyeease-balance-toggle">
        </div>
    `;

    const slidersDiv = document.createElement('div');
    slidersDiv.innerHTML = `
        <div class="addon-submenu-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>Sharpness</span>
                <span id="sharp-label" style="color: #a8c7fa; font-family: monospace; font-weight: 600;">0%</span>
            </div>
            <input type="range" class="addon-slider" id="sharp-slider" min="0" max="2" step="0.1" value="0" style="width: 100%;">
        </div>
        <div class="addon-submenu-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>Brightness</span>
                <span id="bright-label" style="color: #a8c7fa; font-family: monospace; font-weight: 600;">100%</span>
            </div>
            <input type="range" class="addon-slider" id="bright-slider" min="0.2" max="2.5" step="0.1" value="1" style="width: 100%;">
        </div>
        <div class="addon-submenu-row" style="flex-direction: column; align-items: flex-start; gap: 8px; padding-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>Contrast</span>
                <span id="contrast-label" style="color: #a8c7fa; font-family: monospace; font-weight: 600;">100%</span>
            </div>
            <input type="range" class="addon-slider" id="contrast-slider" min="0.2" max="2.5" step="0.1" value="1" style="width: 100%;">
        </div>
    `;
    videoSubmenuContent.appendChild(slidersDiv);

    const videoElement = window.ChronaAddonAPI.getVideoElement();
    const playerBox = document.getElementById('player-box');

    const fadeOverlay = document.createElement('div');
    fadeOverlay.id = 'comfort-fade-overlay';
    fadeOverlay.style.position = 'absolute';
    fadeOverlay.style.inset = '0';
    fadeOverlay.style.backgroundColor = 'black';
    fadeOverlay.style.opacity = '0';
    fadeOverlay.style.pointerEvents = 'none';
    fadeOverlay.style.zIndex = '5';
    fadeOverlay.style.willChange = 'opacity';
    fadeOverlay.style.transform = 'translateZ(0)';

    const balancerOverlay = document.createElement('div');
    balancerOverlay.id = 'comfort-balance-overlay';
    balancerOverlay.style.position = 'absolute';
    balancerOverlay.style.inset = '0';
    balancerOverlay.style.backgroundColor = 'black';
    balancerOverlay.style.opacity = '0';
    balancerOverlay.style.pointerEvents = 'none';
    balancerOverlay.style.zIndex = '4';
    balancerOverlay.style.transition = 'opacity 0.6s linear';
    balancerOverlay.style.willChange = 'opacity';
    balancerOverlay.style.transform = 'translateZ(0)';

    if (playerBox) {
        playerBox.appendChild(balancerOverlay);
        playerBox.appendChild(fadeOverlay);
    }

    const fadeToggle = eyeEaseSubmenuContent.querySelector('#eyeease-fade-toggle');
    const fadeRow = eyeEaseSubmenuContent.querySelector('#eyeease-fade-row');
    const balanceToggle = eyeEaseSubmenuContent.querySelector('#eyeease-balance-toggle');
    const balanceRow = eyeEaseSubmenuContent.querySelector('#eyeease-balance-row');

    const sharpSlider = slidersDiv.querySelector('#sharp-slider');
    const brightSlider = slidersDiv.querySelector('#bright-slider');
    const contrastSlider = slidersDiv.querySelector('#contrast-slider');

    function getVideoId() {
        if (!videoElement) return null;
        if (videoElement.src && !videoElement.src.startsWith('blob:')) return videoElement.src;
        const titleEl = document.getElementById('video-title');
        if (titleEl && titleEl.textContent) return titleEl.textContent;
        return videoElement.src || "default_video";
    }

    function loadSettings() {
        const id = getVideoId();
        const defaultSet = { comfortFade: false, comfortBalance: false, sharp: 0, bright: 1.0, contrast: 1.0 };
        if (!id) return defaultSet;
        const saved = localStorage.getItem('video-addon-' + id);
        if (saved) {
            try { return { ...defaultSet, ...JSON.parse(saved) }; } catch (e) {}
        }
        return defaultSet;
    }

    function saveSettings() {
        const id = getVideoId();
        if (!id) return;
        const settings = {
            comfortFade: fadeToggle.checked,
            comfortBalance: balanceToggle.checked,
            sharp: parseFloat(sharpSlider.value),
            bright: parseFloat(brightSlider.value),
            contrast: parseFloat(contrastSlider.value)
        };
        localStorage.setItem('video-addon-' + id, JSON.stringify(settings));
    }

    function applyVideoFilters() {
        if (!videoElement) return;

        const sharp = parseFloat(sharpSlider.value);
        const bright = parseFloat(brightSlider.value);
        const contrast = parseFloat(contrastSlider.value);

        const matrixEl = document.getElementById('sharpen-matrix');
        if (matrixEl) {
            const c = (4 * sharp) + 1;
            matrixEl.setAttribute('kernelMatrix', `0 ${-sharp} 0 ${-sharp} ${c} ${-sharp} 0 ${-sharp} 0`);
        }

        let filterStr = `brightness(${bright}) contrast(${contrast})`;
        if (sharp > 0) filterStr += ` url(#video-sharpen-filter)`;
        videoElement.style.filter = filterStr;
    }

    const comfortCanvas = document.createElement('canvas');
    const comfortCtx = comfortCanvas.getContext('2d', { willReadFrequently: true });
    comfortCanvas.width = 8;
    comfortCanvas.height = 8;

    let comfortLoopId = null;
    let lastLuma = -1;
    let comfortHoldTimer = null;
    let lastFlashAt = 0;

    const lumaThreshold = 42;
    const minRetriggerGapMs = 90;
    const preArmOpacity = 0.72;
    const preArmHoldMs = 160;
    const flashFadeMs = 1150;

    function clearComfortTimer() {
        if (comfortHoldTimer) {
            clearTimeout(comfortHoldTimer);
            comfortHoldTimer = null;
        }
    }

    function setFadeOverlayInstant(opacity) {
        fadeOverlay.style.transition = 'none';
        fadeOverlay.style.opacity = String(opacity);
        void fadeOverlay.offsetWidth;
    }

    function fadeOutOverlay(durationMs) {
        requestAnimationFrame(() => {
            fadeOverlay.style.transition = `opacity ${durationMs}ms linear`;
            fadeOverlay.style.opacity = '0';
        });
    }

    function triggerComfortFade(opacity, holdMs, fadeMs) {
        if (!fadeToggle.checked) return;

        const now = performance.now();
        if (now - lastFlashAt < minRetriggerGapMs) return;
        lastFlashAt = now;

        clearComfortTimer();
        setFadeOverlayInstant(opacity);

        comfortHoldTimer = setTimeout(() => {
            fadeOutOverlay(fadeMs);
            comfortHoldTimer = null;
        }, holdMs);
    }

    function softStartComfort() {
        if (!fadeToggle.checked) return;
        triggerComfortFade(preArmOpacity, preArmHoldMs, 260);
    }

    function analyzeFrame() {
        if (!fadeToggle.checked && !balanceToggle.checked) {
            comfortLoopId = null;
            return;
        }

        if (videoElement.requestVideoFrameCallback) {
            comfortLoopId = videoElement.requestVideoFrameCallback(analyzeFrame);
        } else {
            comfortLoopId = requestAnimationFrame(analyzeFrame);
        }

        if (!videoElement || videoElement.paused || videoElement.ended) return;

        try {
            comfortCtx.drawImage(videoElement, 0, 0, 8, 8);
            const imgData = comfortCtx.getImageData(0, 0, 8, 8).data;
            let sum = 0;

            for (let i = 0; i < imgData.length; i += 4) {
                sum += (imgData[i] * 0.299 + imgData[i + 1] * 0.587 + imgData[i + 2] * 0.114);
            }
            const currentLuma = sum / 64;

            if (fadeToggle.checked && lastLuma !== -1) {
                const delta = currentLuma - lastLuma;
                if (delta > lumaThreshold) {
                    const intensity = Math.min((delta / 255) * 1.25, 0.9);
                    triggerComfortFade(Math.max(intensity, 0.45), 35, flashFadeMs);
                }
            }

            lastLuma = currentLuma;

            if (balanceToggle.checked) {
                if (currentLuma > 150) {
                    const dimOpacity = ((currentLuma - 150) / 105) * 0.65;
                    balancerOverlay.style.opacity = dimOpacity.toFixed(3);
                } else {
                    balancerOverlay.style.opacity = '0';
                }
            } else {
                balancerOverlay.style.opacity = '0';
            }
        } catch (e) {
            console.warn("[Video Enhancements] EyeEase disabled due to Cross-Origin Resource Policy.");
            fadeToggle.checked = false;
            balanceToggle.checked = false;
            saveSettings();
        }
    }

    function startComfortLoop() {
        if (comfortLoopId) return;
        lastLuma = -1;
        if (videoElement.requestVideoFrameCallback) {
            comfortLoopId = videoElement.requestVideoFrameCallback(analyzeFrame);
        } else {
            comfortLoopId = requestAnimationFrame(analyzeFrame);
        }
    }

    function stopComfortLoop() {
        if (comfortLoopId) {
            if (videoElement.cancelVideoFrameCallback) videoElement.cancelVideoFrameCallback(comfortLoopId);
            else cancelAnimationFrame(comfortLoopId);
            comfortLoopId = null;
        }
        clearComfortTimer();
        fadeOverlay.style.transition = 'none';
        fadeOverlay.style.opacity = '0';
        balancerOverlay.style.opacity = '0';
    }

    function onVideoChange() {
        const settings = loadSettings();

        fadeToggle.checked = settings.comfortFade;
        balanceToggle.checked = settings.comfortBalance;

        sharpSlider.value = settings.sharp;
        brightSlider.value = settings.bright;
        contrastSlider.value = settings.contrast;

        slidersDiv.querySelector('#sharp-label').textContent = Math.round((settings.sharp / 2) * 100) + '%';
        slidersDiv.querySelector('#bright-label').textContent = Math.round(settings.bright * 100) + '%';
        slidersDiv.querySelector('#contrast-label').textContent = Math.round(settings.contrast * 100) + '%';

        lastLuma = -1;
        lastFlashAt = 0;
        clearComfortTimer();
        fadeOverlay.style.transition = 'none';
        fadeOverlay.style.opacity = '0';
        balancerOverlay.style.opacity = '0';

        applyVideoFilters();

        if (fadeToggle.checked || balanceToggle.checked) startComfortLoop();
        else stopComfortLoop();
    }

    const handleToggle = (toggleElement, clickArea) => {
        toggleElement.addEventListener('change', () => {
            if (!fadeToggle.checked) {
                clearComfortTimer();
                fadeOverlay.style.transition = 'none';
                fadeOverlay.style.opacity = '0';
            } else {
                softStartComfort();
                startComfortLoop();
            }

            if (!balanceToggle.checked) balancerOverlay.style.opacity = '0';

            if (fadeToggle.checked || balanceToggle.checked) startComfortLoop();
            else stopComfortLoop();

            saveSettings();
        });

        clickArea.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target !== toggleElement) {
                toggleElement.checked = !toggleElement.checked;
                toggleElement.dispatchEvent(new Event('change'));
            }
        });

        toggleElement.addEventListener('click', (e) => e.stopPropagation());
    };

    handleToggle(fadeToggle, fadeRow);
    handleToggle(balanceToggle, balanceRow);

    const attachSlider = (slider, labelId, formatMultiplier) => {
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            slidersDiv.querySelector(`#${labelId}`).textContent = Math.round(val * formatMultiplier) + '%';
            applyVideoFilters();
            saveSettings();
        });
        slider.addEventListener('click', (e) => e.stopPropagation());
        slider.parentElement.addEventListener('click', (e) => e.stopPropagation());
    };

    attachSlider(sharpSlider, 'sharp-label', 50);
    attachSlider(brightSlider, 'bright-label', 100);
    attachSlider(contrastSlider, 'contrast-label', 100);

    if (videoElement) {
        videoElement.addEventListener('loadedmetadata', onVideoChange);

        videoElement.addEventListener('seeked', () => {
            lastLuma = -1;
            lastFlashAt = 0;
            clearComfortTimer();
            if (fadeToggle.checked) softStartComfort();
        });

        videoElement.addEventListener('play', () => {
            lastLuma = -1;
            lastFlashAt = 0;
            if (fadeToggle.checked) softStartComfort();
            if (fadeToggle.checked || balanceToggle.checked) startComfortLoop();
        });

        videoElement.addEventListener('playing', () => {
            if (fadeToggle.checked) softStartComfort();
            if (fadeToggle.checked || balanceToggle.checked) startComfortLoop();
        });

        videoElement.addEventListener('pause', () => {
            clearComfortTimer();
            fadeOverlay.style.transition = 'opacity 0.8s linear';
            fadeOverlay.style.opacity = '0';
            balancerOverlay.style.opacity = '0';
        });

        const srcObserver = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.attributeName === 'src') setTimeout(onVideoChange, 50);
            });
        });
        srcObserver.observe(videoElement, { attributes: true });
    }

    setTimeout(onVideoChange, 100);
})();