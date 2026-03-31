/**
 * Audio Enhancements Addon for Chrona Player
 * Requires addon.js.
 */
(function() {
    if (!window.ChronaAddonAPI) {
        console.error("[Audio Feature Addon] ChronaAddonAPI not found.");
        return;
    }

    const submenuContent = window.ChronaAddonAPI.addSubmenu("Audio Enhancements");
    if (!submenuContent) return;
    
    submenuContent.innerHTML = `
        <div class="addon-submenu-row" id="mono-audio-row">
            <span>Mono Audio</span>
            <input type="checkbox" class="m3-switch" id="mono-audio-toggle">
        </div>

        <div class="addon-submenu-row" id="balance-audio-row">
            <span>Balance Audio</span>
            <input type="checkbox" class="m3-switch" id="balance-audio-toggle">
        </div>

        <div class="addon-submenu-row" id="vol-boost-row" style="flex-direction: column; align-items: flex-start; gap: 12px; padding-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>Volume Boost</span>
                <span id="vol-boost-label" style="color: #a8c7fa; font-family: monospace; font-weight: 600;">100%</span>
            </div>
            <input type="range" class="addon-slider" id="vol-boost-slider" min="1" max="3" step="0.1" value="1" style="width: 100%;">
        </div>
    `;

    let audioCtx = null;
    let processingNode = null; 
    let compressorNode = null;
    let videoSource = null;
    let audioSource = null;

    const monoToggle = submenuContent.querySelector('#mono-audio-toggle');
    const monoRow = submenuContent.querySelector('#mono-audio-row');
    
    const balanceToggle = submenuContent.querySelector('#balance-audio-toggle');
    const balanceRow = submenuContent.querySelector('#balance-audio-row');

    const volSlider = submenuContent.querySelector('#vol-boost-slider');
    const volLabel = submenuContent.querySelector('#vol-boost-label');
    
    const videoElement = window.ChronaAddonAPI.getVideoElement();

    function getVideoId() {
        if (!videoElement) return null;
        if (videoElement.src && !videoElement.src.startsWith('blob:')) {
            return videoElement.src;
        }
        const titleEl = document.getElementById('video-title');
        if (titleEl && titleEl.textContent) {
            return titleEl.textContent;
        }
        return videoElement.src || "default_video";
    }

    function loadSettings() {
        const id = getVideoId();
        const defaultSet = { mono: false, balance: false, boost: 1.0 };
        if (!id) return defaultSet;
        const saved = localStorage.getItem('audio-addon-' + id);
        if (saved) {
            try { return { ...defaultSet, ...JSON.parse(saved) }; } catch (e) {}
        }
        return defaultSet;
    }

    function saveSettings() {
        const id = getVideoId();
        if (!id) return;
        const settings = {
            mono: monoToggle.checked,
            balance: balanceToggle.checked,
            boost: parseFloat(volSlider.value)
        };
        localStorage.setItem('audio-addon-' + id, JSON.stringify(settings));
    }

    function initAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            
            processingNode = audioCtx.createGain();
            
            compressorNode = audioCtx.createDynamicsCompressor();
            
            processingNode.connect(compressorNode);
            compressorNode.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        attachSources();
    }

    function attachSources() {
        const audio = window.ChronaAddonAPI.getAudioElement();
        if (videoElement && !videoSource) {
            try {
                videoSource = audioCtx.createMediaElementSource(videoElement);
                videoSource.connect(processingNode);
            } catch (e) { console.warn("Could not attach video stream", e); }
        }
        if (audio && !audioSource) {
            try {
                audioSource = audioCtx.createMediaElementSource(audio);
                audioSource.connect(processingNode);
            } catch (e) { console.warn("Could not attach audio stream", e); }
        }
    }

    function applyAudioSettings() {
        if (!processingNode || !compressorNode) return;
        
        const isMono = monoToggle.checked;
        const isBalance = balanceToggle.checked;
        const boostVal = parseFloat(volSlider.value);
        
        if (isMono) {
            processingNode.channelCount = 1;
            processingNode.channelCountMode = "explicit";
        } else {
            processingNode.channelCount = 2;
            processingNode.channelCountMode = "max";
        }

        const time = audioCtx.currentTime;
        if (isBalance) {
            compressorNode.threshold.setTargetAtTime(-45, time, 0.01); 
            compressorNode.knee.setTargetAtTime(30, time, 0.01);       
            compressorNode.ratio.setTargetAtTime(16, time, 0.01);      
            compressorNode.attack.setTargetAtTime(0.003, time, 0.01);  
            compressorNode.release.setTargetAtTime(0.25, time, 0.01);  
        } else {
            compressorNode.threshold.setTargetAtTime(0, time, 0.01);
            compressorNode.ratio.setTargetAtTime(1, time, 0.01);
        }
        
        processingNode.gain.value = boostVal;
        if (boostVal > 1.0 && videoElement && videoElement.volume !== 1.0) {
            videoElement.volume = 1.0;
        }
    }

    function onVideoChange() {
        const settings = loadSettings();
        
        monoToggle.checked = settings.mono;
        balanceToggle.checked = settings.balance;
        volSlider.value = settings.boost;
        volLabel.textContent = Math.round(settings.boost * 100) + '%';
        
        if (settings.mono || settings.balance || settings.boost !== 1.0) {
            initAudioContext();
            applyAudioSettings();
        } else if (audioCtx && processingNode) {
            applyAudioSettings();
        }
    }
    const handleToggle = (toggleElement, clickArea) => {
        toggleElement.addEventListener('change', () => {
            initAudioContext();
            applyAudioSettings();
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

    handleToggle(monoToggle, monoRow);
    handleToggle(balanceToggle, balanceRow);

    volSlider.addEventListener('input', (e) => {
        initAudioContext();
        
        const boostVal = parseFloat(e.target.value);
        volLabel.textContent = Math.round(boostVal * 100) + '%';
        
        applyAudioSettings();
        saveSettings();
    });

    volSlider.addEventListener('click', (e) => e.stopPropagation());
    submenuContent.querySelector('#vol-boost-row').addEventListener('click', (e) => e.stopPropagation());

    if (videoElement) {
        videoElement.addEventListener('loadedmetadata', onVideoChange);
        
        videoElement.addEventListener('play', () => {
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
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