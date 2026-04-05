// ==========================================
// Global Smart Buffer & RAM Management 
// (Applies to BOTH online streams and offline local videos)
// ==========================================
(function setupSmartBuffer() {
    const initSmartBuffering = () => {
        const video = document.getElementById('video');
        if (!video || video.dataset.smartBufferInit) return;
        video.dataset.smartBufferInit = 'true';

        let bufferInterval = null;
        let isPurging = false;
        
        const PAST_BUFFER_MAX = 300; 
        const PURGE_THRESHOLD = PAST_BUFFER_MAX * 0.70; 
        
        const isLowRam = !navigator.deviceMemory || navigator.deviceMemory <= 4;

        function updateBufferGUI() {
            if (!video.duration || isNaN(video.duration)) return;
            const currentTime = video.currentTime;
            let bufferedEnd = currentTime;
            
            for (let i = 0; i < video.buffered.length; i++) {
                const start = video.buffered.start(i);
                const end = video.buffered.end(i);
                if (currentTime >= start - 1 && currentTime <= end) {
                    bufferedEnd = end;
                    break;
                }
            }
            
            const bufferPercent = Math.min((bufferedEnd / video.duration) * 100, 100);
            const seekBar = document.getElementById('seek-bar');
            if (seekBar) seekBar.style.setProperty('--buffer-percent', bufferPercent + '%');
        }

        video.addEventListener('progress', updateBufferGUI); 
        video.addEventListener('timeupdate', updateBufferGUI);

        function manageBuffer() {
            if (isPurging || !video.duration) return;

            let bufferedPast = 0;
            const currentTime = video.currentTime;

            for (let i = 0; i < video.buffered.length; i++) {
                const start = video.buffered.start(i);
                const end = video.buffered.end(i);
                if (currentTime >= start && currentTime <= end) {
                    bufferedPast = currentTime - start;
                    break;
                }
            }

            if (video.preload !== "auto") video.preload = "auto";

            if (isLowRam && bufferedPast >= PURGE_THRESHOLD) {
                isPurging = true;
                console.log(`SmartBuffer: Purging ${bufferedPast.toFixed(1)}s of past buffer to free RAM.`);
                
                const wasPlaying = !video.paused;
                const currentRate = video.playbackRate;
                const audio = document.getElementById('audio-stream');
                
                const spinner = document.getElementById('buffer-spinner');
                if(spinner) spinner.classList.add('show');

                const vSrc = video.src;
                
                video.src = '';
                video.load();
                video.src = vSrc;
                video.currentTime = currentTime;
                video.playbackRate = currentRate;
                if (wasPlaying) video.play().catch(()=>{});

                if (audio && audio.src) {
                    const aSrc = audio.src;
                    audio.src = '';
                    audio.load();
                    audio.src = aSrc;
                    audio.currentTime = currentTime;
                    audio.playbackRate = currentRate;
                    if (wasPlaying) audio.play().catch(()=>{});
                }

                setTimeout(() => {
                    if(spinner) spinner.classList.remove('show');
                    isPurging = false;
                }, 1000);
            }
        }

        video.addEventListener('playing', () => {
            if (!bufferInterval) bufferInterval = setInterval(manageBuffer, 2000);
        });
        
        video.addEventListener('ended', () => {
            if (bufferInterval) {
                clearInterval(bufferInterval);
                bufferInterval = null;
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSmartBuffering);
    } else {
        initSmartBuffering();
    }
    
    const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById('video')) {
            initSmartBuffering();
            obs.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

// ==========================================
// External Video Handler API
// ==========================================
window.externalVideoHandler = async function() {
    const searchStr = window.location.search;
    const paramIndex = searchStr.indexOf('playonline=');
    
    if (paramIndex === -1) return null;

    let rawParam = searchStr.substring(paramIndex + 11); 
    let decodedParam = rawParam;
    
    try {
        decodedParam = decodeURIComponent(rawParam);
    } catch(e) {
        decodedParam = rawParam.replace(/%7B/gi, '{')
                               .replace(/%7D/gi, '}')
                               .replace(/%22/gi, '"')
                               .replace(/%3A/gi, ':')
                               .replace(/%2C/gi, ',');
    }
    
    decodedParam = decodedParam.trim();
    let smartData = null;
    
    if (decodedParam.startsWith('{')) {
        try {
            smartData = JSON.parse(decodedParam);
        } catch(e) {
            smartData = {};
            const extract = (k) => {
                const regex = new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']+)["']`, 'i');
                const match = decodedParam.match(regex);
                return match ? match[1] : null;
            };
            smartData.url = extract('url');
            smartData.metaurl = extract('metaurl');
            smartData.title = extract('title');
            smartData.urlsplit_video = extract('urlsplit_video');
            smartData.urlsplit_audio = extract('urlsplit_audio');
            smartData.thumbnail = extract('thumnail') || extract('thumbnail');
        }
    } else {
        let directUrl = decodedParam;
        if (!directUrl.startsWith('https')) {
            directUrl = 'https://' + directUrl;
        }
        smartData = { url: directUrl, title: "Online Video" };
    }

    const video = document.getElementById('video');
    
    let audio = document.getElementById('audio-stream');
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'audio-stream';
        audio.style.display = 'none';
        document.body.appendChild(audio);
    }

    if (window._syncHandlers) {
        video.removeEventListener('play', window._syncHandlers.play);
        video.removeEventListener('pause', window._syncHandlers.pause);
        video.removeEventListener('seeked', window._syncHandlers.seeked);
        video.removeEventListener('seeking', window._syncHandlers.seeking);
        video.removeEventListener('timeupdate', window._syncHandlers.timeupdate);
        video.removeEventListener('ratechange', window._syncHandlers.rate);
        video.removeEventListener('volumechange', window._syncHandlers.volume);
        if (window._syncHandlers.v_waiting) video.removeEventListener('waiting', window._syncHandlers.v_waiting);
        if (window._syncHandlers.v_playing) video.removeEventListener('playing', window._syncHandlers.v_playing);
        if (window._syncHandlers.v_canplay) video.removeEventListener('canplay', window._syncHandlers.v_canplay);
        
        if (window._syncHandlers.a_waiting) audio.removeEventListener('waiting', window._syncHandlers.a_waiting);
        if (window._syncHandlers.a_playing) audio.removeEventListener('playing', window._syncHandlers.a_playing);
        if (window._syncHandlers.a_canplay) audio.removeEventListener('canplay', window._syncHandlers.a_canplay);
    }
    if (window._visChangeHandler) document.removeEventListener('visibilitychange', window._visChangeHandler);
    if (window._singleVideoHandlers) {
        video.removeEventListener('pause', window._singleVideoHandlers.pause);
        video.removeEventListener('play', window._singleVideoHandlers.play);
    }
    if (window._visChangeHandlerSingle) document.removeEventListener('visibilitychange', window._visChangeHandlerSingle);

    // ==========================================
    // Condition 1: Synchronized Dual Playback
    // ==========================================
    if (smartData.urlsplit_video && smartData.urlsplit_audio) {
        video.src = smartData.urlsplit_video;
        audio.src = smartData.urlsplit_audio;
        video.muted = true;

        try {
            await Promise.all([
                new Promise((res, rej) => {
                    video.addEventListener('loadedmetadata', res, {once: true});
                    video.addEventListener('error', rej, {once: true});
                }),
                new Promise((res, rej) => {
                    audio.addEventListener('loadedmetadata', res, {once: true});
                    audio.addEventListener('error', rej, {once: true});
                })
            ]);

            if (Math.abs(video.duration - audio.duration) > 10) {
                console.error('External Video Handler: Audio and Video duration mismatch.');
                return null;
            }

            let isBrowserBackgroundPause = false;
            let isVideoBuffering = false;
            let isAudioBuffering = false;
            let intendedPlayState = !video.paused;

            let hasUserInteracted = false;
            const interactionListener = () => { hasUserInteracted = true; };
            document.addEventListener('click', interactionListener, {once: true});
            document.addEventListener('keydown', interactionListener, {once: true});

            const checkResume = () => {
                if (video.readyState >= 3 && audio.readyState >= 3) {
                    isVideoBuffering = false;
                    isAudioBuffering = false;
                    const spinner = document.getElementById('buffer-spinner');
                    if (spinner) spinner.classList.remove('show');
                    
                    if (intendedPlayState) {
                        video.play().catch(()=>{});
                        audio.play().catch(()=>{});
                    }
                }
            };

            window._syncHandlers = {
                play: () => {
                    const isActive = (navigator.userActivation && navigator.userActivation.hasBeenActive) || hasUserInteracted;
                    
                    if (!isActive) {
                        video.pause();
                        intendedPlayState = false;
                        const snapPopup = document.getElementById('snap-popup');
                        if (snapPopup) {
                            snapPopup.textContent = 'Click to Play';
                            snapPopup.classList.add('show');
                            setTimeout(() => snapPopup.classList.remove('show'), 3000);
                        }
                        return;
                    }

                    intendedPlayState = true;
                    isBrowserBackgroundPause = false;
                    
                    if (video.readyState >= 3 && audio.readyState >= 3) {
                        const p = audio.play();
                        if (p !== undefined) {
                            p.catch(e => {
                                if (e.name === 'NotAllowedError') {
                                    video.pause();
                                    intendedPlayState = false;
                                    const snapPopup = document.getElementById('snap-popup');
                                    if(snapPopup) {
                                        snapPopup.textContent = 'Click to Play';
                                        snapPopup.classList.add('show');
                                        setTimeout(() => snapPopup.classList.remove('show'), 3000);
                                    }
                                }
                            });
                        }
                    } else {
                        checkResume();
                    }
                },
                pause: () => {
                    if (document.hidden) {
                        isBrowserBackgroundPause = true;
                        return; 
                    }
                    if (isVideoBuffering || isAudioBuffering) return; 
                    
                    intendedPlayState = false;
                    audio.pause();
                },
                seeking: () => {
                    if (!isBrowserBackgroundPause) audio.currentTime = video.currentTime;
                },
                seeked: () => {
                    if (!isBrowserBackgroundPause) audio.currentTime = video.currentTime;
                    checkResume(); 
                },
                timeupdate: () => {
                    if (isBrowserBackgroundPause || !intendedPlayState || isVideoBuffering || isAudioBuffering) return;
                    const drift = Math.abs(video.currentTime - audio.currentTime);
                    if (drift > 0.25) {
                        audio.currentTime = video.currentTime;
                    }
                },
                rate: () => { audio.playbackRate = video.playbackRate; },
                volume: () => { audio.volume = video.volume; },
                
                v_waiting: () => {
                    isVideoBuffering = true;
                    audio.pause();
                    const spinner = document.getElementById('buffer-spinner');
                    if (spinner) spinner.classList.add('show');
                },
                v_canplay: checkResume,
                a_waiting: () => {
                    isAudioBuffering = true;
                    video.pause();
                    const spinner = document.getElementById('buffer-spinner');
                    if (spinner) spinner.classList.add('show');
                },
                a_canplay: checkResume
            };

            video.addEventListener('play', window._syncHandlers.play);
            video.addEventListener('pause', window._syncHandlers.pause);
            video.addEventListener('seeking', window._syncHandlers.seeking);
            video.addEventListener('seeked', window._syncHandlers.seeked);
            video.addEventListener('timeupdate', window._syncHandlers.timeupdate);
            video.addEventListener('ratechange', window._syncHandlers.rate);
            video.addEventListener('volumechange', window._syncHandlers.volume);
            
            video.addEventListener('waiting', window._syncHandlers.v_waiting);
            video.addEventListener('canplay', window._syncHandlers.v_canplay);
            
            audio.addEventListener('waiting', window._syncHandlers.a_waiting);
            audio.addEventListener('canplay', window._syncHandlers.a_canplay);
            
            audio.volume = video.volume;

            window._visChangeHandler = () => {
                if (video.src.startsWith('blob:')) return; 
                if (!document.hidden && isBrowserBackgroundPause) {
                    isBrowserBackgroundPause = false;
                    video.currentTime = audio.currentTime;
                    video.play().catch(()=>{});
                }
            };
            document.addEventListener('visibilitychange', window._visChangeHandler);

            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('play', () => video.play());
                navigator.mediaSession.setActionHandler('pause', () => {
                    isBrowserBackgroundPause = false; 
                    video.pause();
                    audio.pause();
                });
            }

        } catch(e) {
            console.error("External Video Handler: Error establishing external streams.", e);
            return null;
        }
    } 
    // ==========================================
    // Condition 2: Regular External Streaming Media 
    // ==========================================
    else if (smartData.url) {
        video.src = smartData.url;
        video.muted = false;

        let pausedInBackground = false;
        window._singleVideoHandlers = {
            play: () => { pausedInBackground = false; },
            pause: () => {
                if (document.hidden) pausedInBackground = true;
            }
        };
        
        video.addEventListener('play', window._singleVideoHandlers.play);
        video.addEventListener('pause', window._singleVideoHandlers.pause);

        window._visChangeHandlerSingle = () => {
            if (video.src.startsWith('blob:')) return; 
            if (!document.hidden && pausedInBackground) {
                pausedInBackground = false;
                video.play().catch(()=>{});
            }
        };
        document.addEventListener('visibilitychange', window._visChangeHandlerSingle);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => video.play());
            navigator.mediaSession.setActionHandler('pause', () => {
                pausedInBackground = false;
                video.pause();
            });
        }
    } else {
        return null;
    }

    return smartData;
};
