function openbrowse(){
  document.getElementById('dropzone').style.display = "none";
  document.getElementById('browseropen').style.display = "none";
  const ds = document.getElementById('daily-stats');
  if(ds) ds.style.display = 'block';
 }
(() => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const playerContainer = document.getElementById('player-container');
  const playerBox = document.getElementById('player-box');
  const video = document.getElementById('video');
  const timePassedEl = document.getElementById('time-passed');
  const timeLeftTextEl = document.getElementById('time-left-text');
  const finishTimeEl = document.getElementById('finish-time');
  const seekBar = document.getElementById('seek-bar');
  const snapPopup = document.getElementById('snap-popup');
  const seekPopup = document.getElementById('seek-popup');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const titlePopup = document.getElementById('title-popup');
  const folderSpeedRange = document.getElementById('folderSpeedRange');
  const folderSpeedDisplay = document.getElementById('folderSpeedDisplay');
  const folderTotalTime = document.getElementById('folderTotalTime');
  const dailyStatsEl = document.getElementById('daily-stats');
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const viewProgressBtn = document.getElementById('viewProgressBtn');
  const deleteProgressBtn = document.getElementById('deleteProgressBtn');
  const progressModal = document.getElementById('progressModal');
  const closeModal = document.querySelector('.close-modal');
  const progressChart = document.getElementById('progressChart');
  const chartPrevBtn = document.getElementById('chartPrevBtn');
  const chartNextBtn = document.getElementById('chartNextBtn');
  const chartRangeLabel = document.getElementById('chartRangeLabel');
  
  let playbackRate = 1;
  let snapTimeout = null;
  let currentFileName = null;
  let currentFileSize = null;
  let currentFileLastModified = null;
  let seeking = false;
  let seekPopupTimeout = null;
  let controlsHideTimer = null;
  let lastSaveTime = -1;
  
  let currentViewFiles = [];   let thumbnailQueue = [];   let isProcessingQueue = false;
  let dailyAccumulator = 0;
  function getTodayKey() {
    const now = new Date();
    if (now.getHours() < 4) {
      now.setDate(now.getDate() - 1);
    }
    return now.toDateString();
  }
  
  function updateDailyStatsDisplay() {
    if(!dailyStatsEl) return;
    const todayKey = getTodayKey();
    const stored = JSON.parse(localStorage.getItem('todayspent') || '{}');
    const count = stored[todayKey] || 0;
    const totalSeconds = count * 15;
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    dailyStatsEl.textContent = `Today: ${h}h ${m < 10 ? '0'+m : m}m ${s < 10 ? '0'+s : s}s`;
  }
  
  function incrementDailyStats() {
    const todayKey = getTodayKey();
    const stored = JSON.parse(localStorage.getItem('todayspent') || '{}');
    if (!stored[todayKey]) stored[todayKey] = 0;
    stored[todayKey]++;
    localStorage.setItem('todayspent', JSON.stringify(stored));
    updateDailyStatsDisplay();
  }
  setInterval(() => {
    if (video && !video.paused && !video.ended && video.readyState > 2) {
      dailyAccumulator++;
      if (dailyAccumulator >= 15) {
        incrementDailyStats();
        dailyAccumulator = 0;
      }
    }
  }, 1000);
  updateDailyStatsDisplay();
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  };

  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });

  let chartOffset = 0;
  
  function getChartDateKey(date) {
    return date.toDateString();
  }
  
  function renderChart() {
    if (!progressChart) return;
    const ctx = progressChart.getContext('2d');
    const dpr = 2; 
    const rect = progressChart.getBoundingClientRect();
    progressChart.width = rect.width * dpr;
    progressChart.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0,0,width, height);
    
    const stored = JSON.parse(localStorage.getItem('todayspent') || '{}');
    const daysToShow = 15;
    const today = new Date();
    if (today.getHours() < 4) today.setDate(today.getDate() - 1);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - (chartOffset * daysToShow));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (daysToShow - 1));
    const options = { month: 'short', day: 'numeric' };
    chartRangeLabel.textContent = `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
    const dataPoints = [];
    let maxSeconds = 0;
    
    for (let i = 0; i < daysToShow; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = getChartDateKey(d);
        const count = stored[key] || 0;
        const seconds = count * 15;
        if (seconds > maxSeconds) maxSeconds = seconds;
        dataPoints.push({ date: d, seconds: seconds });
    }
    if (maxSeconds === 0) maxSeconds = 3600;
    const yMax = Math.ceil(maxSeconds * 1.1);
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    const barWidth = (graphWidth / daysToShow) * 0.6;
    const spacing = (graphWidth / daysToShow);
    
    dataPoints.forEach((pt, index) => {
        const x = padding + (index * spacing) + (spacing - barWidth) / 2;
        const barHeight = (pt.seconds / yMax) * graphHeight;
        const y = height - padding - barHeight;
        const gradient = ctx.createLinearGradient(x, y, x, height - padding);
        gradient.addColorStop(0, '#2196f3');
        gradient.addColorStop(1, '#0d47a1');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        const dateStr = pt.date.getDate();
        ctx.fillText(dateStr, x + barWidth/2, height - padding + 15);
        if(pt.seconds > 0) {
            ctx.fillStyle = '#fff';
            let label = '';
            if (pt.seconds >= 3600) label = (pt.seconds / 3600).toFixed(1) + 'h';
            else label = Math.round(pt.seconds / 60) + 'm';
            ctx.fillText(label, x + barWidth/2, y - 5);
        }
    });
  }

  viewProgressBtn.onclick = () => {
      progressModal.style.display = 'block';
      chartOffset = 0;
      renderChart();
      dropdownMenu.classList.remove('show');
  };
  
  closeModal.onclick = () => {
      progressModal.style.display = 'none';
  };
  
  window.onclick = (e) => {
      if (e.target == progressModal) {
          progressModal.style.display = 'none';
      }
  };
  
  chartPrevBtn.onclick = () => {
      chartOffset++;
      renderChart();
  };
  
  chartNextBtn.onclick = () => {
      if (chartOffset > 0) {
          chartOffset--;
          renderChart();
      }
  };
  
  window.addEventListener('resize', renderChart);

  function formatTime(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return h + ':' + (m < 10 ? '0'+m : m) + ':' + (s < 10 ? '0'+s : s);
    return m + ':' + (s < 10 ? '0' + s : s);
  }
  
  function formatHoursMinutes(sec) {
     const h = Math.floor(sec / 3600);
     const m = Math.floor((sec % 3600) / 60);
     const s = Math.floor(sec % 60);
     if(h===0 && m===0) return `0m left`;
     if(h===0) return `${m}m left`;
     return `${h}h ${m}m left`;
  }

  function formatAMPM(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return hours + ':' + (minutes < 10 ? '0'+minutes : minutes) + ' ' + ampm;
  }

  function showSnapPopup(text) {
    snapPopup.textContent = text;
    snapPopup.style.top = '50%';
    snapPopup.style.left = '50%';
    snapPopup.style.transform = 'translate(-50%, -50%)';
    snapPopup.classList.add('show');
    if (snapTimeout) clearTimeout(snapTimeout);
    snapTimeout = setTimeout(() => {
      snapPopup.classList.remove('show');
    }, 1000);
  }

  function showSeekPopup(text, direction) {
    seekPopup.textContent = text;
    if (direction === 'left') {
      seekPopup.classList.add('show-left');
      seekPopup.classList.remove('show-right');
    } else if (direction === 'right') {
      seekPopup.classList.add('show-right');
      seekPopup.classList.remove('show-left');
    }
    if (seekPopupTimeout) clearTimeout(seekPopupTimeout);
    seekPopupTimeout = setTimeout(() => {
      seekPopup.classList.remove('show-left');
      seekPopup.classList.remove('show-right');
    }, 1000);
  }

  function updateTime() {
    if (!video.duration) return;
    const current = video.currentTime;
    const duration = video.duration;
    const left = (duration - current) / playbackRate;

    timePassedEl.textContent = formatTime(current);
    timeLeftTextEl.textContent = '-' + formatTime(left);

    const now = new Date();
    const finishDate = new Date(now.getTime() + left * 1000);
    finishTimeEl.textContent = 'Finishes at ' + formatAMPM(finishDate);

      const percent = (current / duration) * 100;
      seekBar.style.setProperty('--seek-percent', percent + '%');

  }

  function saveProgress() {
    if (!currentFileName) return;
    const data = {
      time: video.currentTime,
      duration: video.duration || 0,
      playbackRate,
      lastModified: currentFileLastModified,
      size: currentFileSize,
      timestamp: Date.now() 
    };
    localStorage.setItem('video-progress-' + currentFileName, JSON.stringify(data));
  }
  
  function saveDuration(file, duration) {
      if(!file) return;
      const key = 'video-progress-' + file.name;
      const existing = localStorage.getItem(key);
      if(existing) {
          try {
             const data = JSON.parse(existing);
             if (!data.duration && duration > 0) {
                 data.duration = duration;
                 localStorage.setItem(key, JSON.stringify(data));
             }
          } catch(e) {}
      } else {
          const data = {
              time: 0,
              duration: duration,
              playbackRate: 1,
              lastModified: file.lastModified,
              size: file.size,
              timestamp: 0 
          };
          localStorage.setItem(key, JSON.stringify(data));
      }
  }

  function loadProgress(fileInfo) {
    if (!fileInfo.name) return null;
    const saved = localStorage.getItem('video-progress-' + fileInfo.name);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved);
      if (data.size === fileInfo.size && data.lastModified === fileInfo.lastModified) {
        return data;
      }
    } catch {
      return null;
    }
    return null;
  }
function handleFile(file) {
  if (!file.type.startsWith('video/') && !file.name.match(/\.(mkv|mp4|webm)$/i)) {
  }
  
  openbrowse();
  if(dailyStatsEl) dailyStatsEl.style.display = 'block';
  
  currentFileName = file.name;
  currentFileSize = file.size;
  currentFileLastModified = file.lastModified;

  const fileURL = URL.createObjectURL(file);
  video.src = fileURL;
  video.playbackRate = playbackRate = 1;
  video.load();

  dropzone.style.display = 'none';
  playerContainer.style.display = 'flex';

  video.focus();

  const progress = loadProgress({
    name: currentFileName,
    size: currentFileSize,
    lastModified: currentFileLastModified
  });

  
  video.addEventListener('loadedmetadata', function onMetadata() {
    video.removeEventListener('loadedmetadata', onMetadata);

    if (progress && progress.time >= 1 && progress.time < video.duration * 0.94) {
      video.currentTime = progress.time;
      playbackRate = progress.playbackRate || 1;
      video.playbackRate = playbackRate;
      if(playbackRate == 1){showSnapPopup(`Resumed from ${formatTime(progress.time)}`);}
      else{showSnapPopup(`Resumed from ${formatTime(progress.time)} @${playbackRate.toFixed(1)}x`);}
    }
    video.play();
  });
}

  video.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      showSnapPopup('⏸');
    } else {
      video.pause();
      showSnapPopup('▶');
    }
  });

  video.addEventListener('timeupdate', () => {
    updateTime();
    const currentSec = Math.floor(video.currentTime);
    if (currentSec !== lastSaveTime) {
      saveProgress();
      lastSaveTime = currentSec;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (playerContainer.style.display === 'none') return;
    if (e.target === seekBar || e.target === fileInput) return;

    const step = 10;
    switch (e.key) {
      case 'ArrowRight':
        video.currentTime = Math.min(video.currentTime + step, video.duration);
        showSeekPopup(`${step}s >`, 'right');
        updateTime();
        break;
      case 'ArrowLeft':
        video.currentTime = Math.max(video.currentTime - step, 0);
        showSeekPopup(`< ${step}s`, 'left');
        updateTime();
        break;
      case 'ArrowUp':
        video.volume = Math.min(video.volume + 0.05, 1);
        showSnapPopup(`Volume: ${Math.round(video.volume * 100)}%`);
        break;
      case 'ArrowDown':
        video.volume = Math.max(video.volume - 0.05, 0);
        showSnapPopup(`Volume: ${Math.round(video.volume * 100)}%`);
        break;
      case ']':
      case '=':
        playbackRate = Math.min(playbackRate + 0.1, 8);
        video.playbackRate = playbackRate;
        showSnapPopup(`Speed: ${playbackRate.toFixed(1)}x`);
        updateTime();
        break;
      case '[':
      case '-':
        playbackRate = Math.max(playbackRate - 0.1, 0.1);
        video.playbackRate = playbackRate;
        showSnapPopup(`Speed: ${playbackRate.toFixed(1)}x`);
        updateTime();
        break;
      case ' ':
        e.preventDefault();
        if (video.paused) {
          video.play();
          showSnapPopup('⏸');
        } else {
          video.pause();
          showSnapPopup('▶');
        }
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
    }
  });

  seekBar.addEventListener('input', (e) => {
    seeking = true;
    const val = e.target.value;
    const newTime = (val / 100) * video.duration;
    video.currentTime = newTime;
    updateTime();
  });
  seekBar.addEventListener('change', () => {
    seeking = false;
    saveProgress();
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (playerContainer.requestFullscreen) playerContainer.requestFullscreen();
      else if (playerContainer.webkitRequestFullscreen) playerContainer.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      playerContainer.classList.add('fullscreen');
      if(dailyStatsEl) dailyStatsEl.style.display = 'none';
      startControlsHideTimer();
      document.addEventListener('mousemove', resetControlsHideTimer);
      document.addEventListener('keydown', resetControlsHideTimer);
    } else {
      playerContainer.classList.remove('fullscreen');
      if(dailyStatsEl) dailyStatsEl.style.display = 'block';
      showControls();
      document.removeEventListener('mousemove', resetControlsHideTimer);
      document.removeEventListener('keydown', resetControlsHideTimer);
      clearTimeout(controlsHideTimer);
    }
  });

  function hideControls() {
    document.getElementById('controls').classList.add('hide');
    video.style.cursor = "none";
  }
  function showControls() {
    document.getElementById('controls').classList.remove('hide');
        video.style.cursor = "";

  }
  function startControlsHideTimer() {
    clearTimeout(controlsHideTimer);
    controlsHideTimer = setTimeout(hideControls, 2000);
  }
  function resetControlsHideTimer() {
    showControls();
    startControlsHideTimer();
  }

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

if(localStorage.getItem('browseornot') == 1){openbrowse();}

  fileInput.addEventListener('change', (e) => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });
  const pickBtn = document.getElementById('pickBtn');
  const backBtn = document.getElementById('backBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const homeBtn = document.getElementById('homeBtn');
  const fileGrid = document.getElementById('fileGrid');
  const breadcrumb = document.getElementById('breadcrumb');
  const toggle = document.getElementById('browseToggle');
  const browseornot = localStorage.getItem('browseornot');

if(!browseornot){localStorage.setItem('browseornot',0);}
  toggle.checked = browseornot === null ? true : browseornot === '1';
  toggle.addEventListener('change', () => {
    localStorage.setItem('browseornot', toggle.checked ? '1' : '0');
  });

  let rootHandle = null;
  let currentHandle = null;
  let pathStack = [];    
  let forwardStack = []; 
  
  function openThumbDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('thumbDB', 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore('thumbs');
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function saveThumb(key, dataURL) {
    const db = await openThumbDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('thumbs', 'readwrite');
      tx.objectStore('thumbs').put(dataURL, key);
      tx.oncomplete = () => res();
      tx.onerror = e => rej(e.target.error);
    });
  }
  
  async function deleteThumb(key) {
    const db = await openThumbDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('thumbs', 'readwrite');
      tx.objectStore('thumbs').delete(key);
      tx.oncomplete = () => res();
      tx.onerror = e => rej(e.target.error);
    });
  }

  async function getThumb(key) {
    const db = await openThumbDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('thumbs', 'readonly');
      const req = tx.objectStore('thumbs').get(key);
      req.onsuccess = () => res(req.result);
      req.onerror = e => rej(e.target.error);
    });
  }

  async function getVideoDurationOnly(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(video.src);
        resolve(duration);
      };
      
      video.onerror = (e) => {
        URL.revokeObjectURL(video.src);
        reject(e);
      };
    });
  }

  async function generateVideoThumbnail(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = URL.createObjectURL(file);
      video.crossOrigin = 'anonymous';

      video.addEventListener('loadeddata', () => {
        video.currentTime = Math.min(video.duration * 0.1, 5);
      });

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const duration = video.duration;
        
        URL.revokeObjectURL(video.src);
        canvas.toBlob(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ dataURL: reader.result, duration: duration });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, 'image/webp', 0.8);
      });

      video.onerror = e => {
        URL.revokeObjectURL(video.src);
        reject(e);
      };
    });
  }
  
  async function enqueueThumbnail(file, imgElement, imgWrapper) {
      thumbnailQueue.push({ file, imgElement, imgWrapper });
      processThumbnailQueue();
  }

  async function processThumbnailQueue() {
      if (isProcessingQueue || thumbnailQueue.length === 0) return;
      isProcessingQueue = true;

      while (thumbnailQueue.length > 0) {
          const item = thumbnailQueue.shift();
          if(!document.body.contains(item.imgElement)) continue;

          const { file, imgElement, imgWrapper } = item;
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          const prog = loadProgress({name: file.name, size: file.size, lastModified: file.lastModified});
          const hasDuration = prog && prog.duration > 0;
          
          let cached = await getThumb(key);
          
          if (cached && hasDuration) {
               imgElement.src = cached;
          } else {
              if (!cached) {
                  try {
                      const { dataURL, duration } = await generateVideoThumbnail(file);
                      await saveThumb(key, dataURL);
                      saveDuration(file, duration);
                      imgElement.src = dataURL;
                      updateSpeedCalc();
                  } catch (e) {
                      const icon = createFileIcon();
                      imgWrapper.innerHTML = '';
                      imgWrapper.appendChild(icon);
                      imgElement.style.display = 'none';
                  }
              } else {
                  imgElement.src = cached;
                  try {
                      const duration = await getVideoDurationOnly(file);
                      saveDuration(file, duration);
                      updateSpeedCalc();
                  } catch(e) {}
              }
          }
          await new Promise(r => requestAnimationFrame(r));
      }
      isProcessingQueue = false;
  }


  async function verifyPermission(handle) {
    if (!handle) return false;
    const opts = { mode: 'read' };
    if (await handle.queryPermission(opts) === 'granted') return true;
    if (await handle.requestPermission(opts) === 'granted') return true;
    return false;
  }

  function getDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('folderDB', 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore('handles');
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  function saveHandle(handle) {
    return getDB().then(db => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, 'videosFolder');
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
      });
    });
  }

  function getHandle() {
    return getDB().then(db => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readonly');
        const req = tx.objectStore('handles').get('videosFolder');
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject(e.target.error);
      });
    });
  }

  function isVideoFile(name) {
    return /\.(mp4|webm|mkv)$/i.test(name);
  }

  function createPlayIcon() {
    const wrapper = document.createElement('div');
    wrapper.className = 'play-icon';
    wrapper.innerHTML = `
      <svg viewBox="0 0 24 24" fill="white" aria-hidden="true" focusable="false">
        <path d="M8 5v14l11-7z"></path>
      </svg>`;
    return wrapper;
  }

  function createFolderIconOverlay() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "folder-icon-overlay");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z");
    svg.appendChild(path);
    return svg;
  }

  async function getFolderThumbs(folderHandle) {
    let thumbs = [];
    try {
      for await (const entry of folderHandle.values()) {
        if (entry.kind === 'file' && isVideoFile(entry.name)) {
          try {
            const file = await entry.getFile();
            const key = `${file.name}-${file.size}-${file.lastModified}`;
            const cached = await getThumb(key);
            if (cached) {
              thumbs.push(cached);
              if (thumbs.length >= 4) break;
            }
          } catch {}
        }
      }
    } catch {}
    return thumbs;
  }

  function createFolderThumbCollage(thumbs) {
    if (thumbs.length === 0) {
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "plain-folder-icon");
      svg.setAttribute("viewBox", "0 0 24 24");
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z");
      svg.appendChild(path);
      return svg;
    }

    const container = document.createElement("div");
    container.className = "folder-thumb";
    thumbs.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      container.appendChild(img);
    });
    for (let i = thumbs.length; i < 4; i++) {
      const filler = document.createElement("div");
      filler.style.background = "#00000000";
      filler.style.borderRadius = "4px";
      container.appendChild(filler);
    }

    const folderIcon = createFolderIconOverlay();
    folderIcon.style.position = 'absolute';
    folderIcon.style.bottom = '-6px';
    folderIcon.style.right = '-2.5px';
    folderIcon.style.width = '60px';
    folderIcon.style.height = '60px';
    folderIcon.style.zIndex = '10';
    container.appendChild(folderIcon);

    return container;
  }

  function showTitlePopup(text, rect) {
    titlePopup.textContent = text;
    titlePopup.style.display = 'block';
    const top = rect.bottom + 5;
    let left = rect.left + (rect.width / 2) - 150; 
    
    if (left < 10) left = 10;
    if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
    
    titlePopup.style.top = `${top}px`;
    titlePopup.style.left = `${left}px`;
  }
  
  function hideTitlePopup() {
    titlePopup.style.display = 'none';
  }
  
  function updateSpeedCalc() {
      const speed = parseFloat(folderSpeedRange.value);
      folderSpeedDisplay.textContent = speed.toFixed(1) + 'x';
      
      let totalRemaining = 0;
      
      currentViewFiles.forEach(item => {
         const prog = loadProgress({ name: item.entry.name, size: item.file?.size, lastModified: item.file?.lastModified });
         
         if (prog) {
             const dur = prog.duration || 0;
             const time = prog.time || 0;
             const left = Math.max(0, dur - time);
             totalRemaining += left;
         } else {
         }
      });
      
      const realSeconds = totalRemaining / speed;
      folderTotalTime.textContent = formatHoursMinutes(realSeconds);
  }
  
  const savedFolderSpeed = localStorage.getItem('folderSpeed');
  if (savedFolderSpeed) {
      folderSpeedRange.value = savedFolderSpeed;
  }
  
  folderSpeedRange.addEventListener('input', () => {
      localStorage.setItem('folderSpeed', folderSpeedRange.value);
      updateSpeedCalc();
  });
  
  deleteProgressBtn.onclick = async () => {
      dropdownMenu.classList.remove('show');
      if(!currentViewFiles || currentViewFiles.length === 0) return;
      if(confirm(`Are you sure you want to reset play history and delete cached thumbnails for the ${currentViewFiles.length} videos in this folder?`)) {
          for(const item of currentViewFiles) {
              if(item.file) {
                 const key = `video-progress-${item.file.name}`;
                 localStorage.removeItem(key);
                 
                 const thumbKey = `${item.file.name}-${item.file.size}-${item.file.lastModified}`;
                 await deleteThumb(thumbKey);
              }
          }
          listFiles(currentHandle);
      }
  };
  
  function updateURL(fileName = null) {
      if(!currentHandle) return;
      const pathNames = pathStack.map(h => h.name);
      if(currentHandle !== rootHandle) pathNames.push(currentHandle.name);
      if(fileName) pathNames.push(fileName);
      
      const fullPath = "/" + pathNames.join("/");
      const url = new URL(window.location);
      url.searchParams.set('path', fullPath);
      window.history.pushState({path: fullPath}, '', url);
  }
  
  window.addEventListener('popstate', (event) => {
      restorePathFromHash();
  });

  async function listFiles(handle) {
    fileGrid.innerHTML = '';
    currentViewFiles = []; 
    thumbnailQueue = []; 
    
    try {
      const folders = [];
      const files = [];

      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && isVideoFile(entry.name)) {
           try {
             const file = await entry.getFile();
             const progress = loadProgress({name: file.name, size: file.size, lastModified: file.lastModified});
             files.push({ entry, file, progress });
           } catch {
             files.push({ entry, file: null, progress: null });
           }
        } else if (entry.kind === 'directory') {
          folders.push(entry);
        }
      }

      currentViewFiles = files;
      updateSpeedCalc(); 

      if (files.length === 0 && folders.length === 0) {
        fileGrid.innerHTML = `<div class=\"no-data\">No videos or folders found.</div>`;
        return;
      }
      
      let lastPlayedIndex = -1;
      let maxTimestamp = 0;
      
      files.forEach((item, index) => {
        if (item.progress && item.progress.timestamp > maxTimestamp) {
          maxTimestamp = item.progress.timestamp;
          lastPlayedIndex = index;
        }
      });
      
      const lastPlayedItem = lastPlayedIndex > -1 ? files[lastPlayedIndex] : null;
      const otherFiles = files.filter((_, idx) => idx !== lastPlayedIndex);
      
      const inProgress = []; 
      const unplayed = [];   
      const finished = [];   
      
      otherFiles.forEach(item => {
        if (!item.progress || item.progress.time === 0) {
          unplayed.push(item);
        } else {
          const duration = item.progress.duration || 0;
          let percent = 0;
          if (duration > 0) percent = (item.progress.time / duration) * 100;
          
          if (percent >= 95) finished.push(item);
          else inProgress.push(item);
        }
      });
      
      const sortByName = (a, b) => a.entry.name.localeCompare(b.entry.name, undefined, {numeric: true, sensitivity: 'base'});
      inProgress.sort(sortByName);
      unplayed.sort(sortByName);
      finished.sort(sortByName);
      
      const sortedFiles = [];
      if (lastPlayedItem) sortedFiles.push({...lastPlayedItem, isLastPlayed: true});
      sortedFiles.push(...inProgress);
      sortedFiles.push(...unplayed);
      sortedFiles.push(...finished);
      
      folders.sort((a,b) => a.name.localeCompare(b.name));
      
      for (const entry of folders) {
          const card = document.createElement('div');
          card.className = 'card clickable';
          
          const thumbContainer = document.createElement('div');
          thumbContainer.className = 'folder-thumb';
          thumbContainer.innerHTML = '<div style="background:#333;width:100%;height:100%;border-radius:4px;"></div>'; 
          getFolderThumbs(entry).then(thumbs => {
             const newThumb = createFolderThumbCollage(thumbs);
             thumbContainer.replaceWith(newThumb);
          });
          
          card.appendChild(thumbContainer);
          
          const nameSpan = document.createElement('span');
          nameSpan.className = 'name';
          nameSpan.textContent = entry.name;
          card.appendChild(nameSpan);

          card.onclick = () => {
            forwardStack = []; 
            pathStack.push(currentHandle);
            currentHandle = entry;
            updateBreadcrumb();
            updateNavButtons();
            updateURL();
            listFiles(currentHandle);
          };
          fileGrid.appendChild(card);
      }
      
      for (const item of sortedFiles) {
        const { entry, file, progress, isLastPlayed } = item;
        const card = document.createElement('div');
        card.className = 'card clickable';
        if (isLastPlayed) card.classList.add('last-played');
        
        card.addEventListener('mouseenter', (e) => showTitlePopup(entry.name, card.getBoundingClientRect()));
        card.addEventListener('mouseleave', () => hideTitlePopup());
        
        if (progress) {
          const duration = progress.duration || 0;
          let percent = 0;
          if (duration > 0) percent = (progress.time / duration) * 100;
          if (percent > 100) percent = 100;
          
          card.style.background = `linear-gradient(to right, #3a3a3a ${percent}%, #252525 ${percent}%)`;
        }
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'thumb-img-wrapper';
        
        const img = document.createElement('img');
        img.className = 'thumb-img';
        img.src = 'data:image/webp;base64,UklGRrwBAABXRUJQVlA4WAoAAAAUAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAaAAAAMAEAnQEqAQABAADAEiWkAANwAP7+7qoAAABYTVAgcQEAADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+DQo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIj48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjViZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPjx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+PC9yZGY6RGVzY3JpcHRpb24+PC9yZGY6UkRGPjwveDp4bXBtZXRhPg0KPD94cGFja2V0IGVuZD0ndyc/PgA=';
        imgWrapper.appendChild(img);

        imgWrapper.appendChild(createPlayIcon());
        card.appendChild(imgWrapper);
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = entry.name;
        card.appendChild(nameSpan);
        
        card.onclick = async () => {
              try {
                updateURL(entry.name);
                const f = file || await entry.getFile();
                handleFile(f);
              } catch (e) {
                alert('Failed to get file: ' + e.message);
              }
        };
        
        fileGrid.appendChild(card);
        
        if (file) {
           const key = `${file.name}-${file.size}-${file.lastModified}`;
           getThumb(key).then(thumb => {
               if(thumb) {
                   const prog = loadProgress({name: file.name, size: file.size, lastModified: file.lastModified});
                   if(!prog || !prog.duration) {
                        enqueueThumbnail(file, img, imgWrapper);
                   }
                   img.src = thumb;
               } else {
                   enqueueThumbnail(file, img, imgWrapper);
               }
           });
        }
      }

    } catch (e) {
      console.error(e);
      fileGrid.innerHTML = `<div class=\"no-data\">Unable to read folder contents.</div>`;
    }
  }

  function createFileIcon() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "file-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.position = 'absolute';
    svg.style.bottom = '-6px';
    svg.style.right = '-2.5px';
    svg.style.width = '60px';
    svg.style.height = '60px';
    svg.style.zIndex = '10';
    svg.style.background = 'transparent';

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 3v5h5");
    path.setAttribute("fill", "#6c6c6c");
    svg.appendChild(path);

    return svg;
  }

  function updateBreadcrumb() {
    breadcrumb.innerHTML = '';

    const rootSpan = document.createElement('span');
    rootSpan.textContent = 'Videos Folder';
    rootSpan.style.userSelect = 'none';
    rootSpan.style.cursor = 'pointer';
    rootSpan.onclick = () => {
      if (currentHandle !== rootHandle) {
        forwardStack = [];
        pathStack = [];
        currentHandle = rootHandle;
        updateBreadcrumb();
        updateNavButtons();
        updateURL();
        listFiles(currentHandle);
      }
    };
    breadcrumb.appendChild(rootSpan);

    pathStack.forEach((handle, i) => {
      const sep = document.createTextNode(' / ');
      breadcrumb.appendChild(sep);
      const span = document.createElement('span');
      span.textContent = handle.name || `Folder ${i + 1}`;
      span.style.cursor = 'pointer';
      span.style.userSelect = 'none';
      span.onclick = () => {
        if (currentHandle !== handle) {
          forwardStack = [];
          pathStack = pathStack.slice(0, i);
          currentHandle = handle;
          updateBreadcrumb();
          updateNavButtons();
          updateURL();
          listFiles(currentHandle);
        }
      };
      breadcrumb.appendChild(span);
    });
  }

  function updateNavButtons() {
    backBtn.disabled = pathStack.length === 0;
    forwardBtn.disabled = forwardStack.length === 0;
    homeBtn.disabled = (currentHandle === rootHandle || !rootHandle);
  }

  backBtn.onclick = () => {
    if (pathStack.length > 0) {
      forwardStack.push(currentHandle);
      currentHandle = pathStack.pop();
      updateBreadcrumb();
      updateNavButtons();
      updateURL();
      listFiles(currentHandle);
    }
  };

  forwardBtn.onclick = () => {
    if (forwardStack.length > 0) {
      pathStack.push(currentHandle);
      currentHandle = forwardStack.pop();
      updateBreadcrumb();
      updateNavButtons();
      updateURL();
      listFiles(currentHandle);
    }
  };

  homeBtn.onclick = () => {
    if (rootHandle && currentHandle !== rootHandle) {
      forwardStack = [];
      pathStack = [];
      currentHandle = rootHandle;
      updateBreadcrumb();
      updateNavButtons();
      updateURL();
      listFiles(currentHandle);
    }
  };
  
  async function restorePathFromHash() {
      const params = new URLSearchParams(window.location.search);
      const pathStr = params.get('path');
      if (pathStr) {
          video.pause();
          playerContainer.style.display = 'none';
          document.getElementById('dropzone').style.display = 'none';
          document.getElementById('browseropen').style.display = 'none';
          if(dailyStatsEl) dailyStatsEl.style.display = 'block';
      }

      if(!pathStr || !rootHandle) return;
      
      const parts = pathStr.split('/').filter(p => p && p !== 'Videos Folder'); 
      let target = rootHandle;
      const stack = [];
      let targetFile = null;
      
      try {
          for(let i = 0; i < parts.length; i++) {
             const part = parts[i];
             if (i === 0 && part === rootHandle.name) continue;
             if (i === parts.length - 1 && isVideoFile(part)) {
                 targetFile = part;
                 break; 
             }

             const nextHandle = await target.getDirectoryHandle(part);
             stack.push(target);
             target = nextHandle;
          }
          pathStack = stack;
          currentHandle = target;
          updateBreadcrumb();
          updateNavButtons();
          await listFiles(currentHandle);

          if (targetFile) {
              try {
                  const fileHandle = await currentHandle.getFileHandle(targetFile);
                  const file = await fileHandle.getFile();
                  handleFile(file);
              } catch (err) {
                  console.log("File in path not found: " + targetFile);
              }
          }
      } catch(e) {
          console.log("Invalid path, resetting to root", e);
          const url = new URL(window.location);
          url.searchParams.delete('path');
          window.history.replaceState({}, '', url);
          
          currentHandle = rootHandle;
          pathStack = [];
          updateBreadcrumb();
          updateNavButtons();
          listFiles(currentHandle);
      }
  }

  async function init() {
    try {
      const handle = await getHandle();
      if (handle && await verifyPermission(handle)) {
        rootHandle = handle;
        currentHandle = handle;
        pathStack = [];
        forwardStack = [];
        
        await restorePathFromHash(); 
        
        if (currentHandle === rootHandle && !window.location.search.includes('path=')) {
           updateBreadcrumb();
           updateNavButtons();
           await listFiles(currentHandle);
        }
        return;
      }
    } catch {}
    fileGrid.innerHTML = `<div class=\"no-data\">No folder selected or permission denied.</div>`;
  }

  pickBtn.addEventListener('click', async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      if (await verifyPermission(dirHandle)) {
        await saveHandle(dirHandle);
        rootHandle = dirHandle;
        currentHandle = dirHandle;
        pathStack = [];
        forwardStack = [];
        updateBreadcrumb();
        updateNavButtons();
        updateURL();
        await listFiles(currentHandle);
      } else {
        alert('Permission denied for this folder.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') alert('Error: ' + e.message);
    }
  });

  init();
})();


(function() {
    const loader = document.getElementById('loader-overlay');
    if (!loader) return;
    const stage = loader.querySelector('.l-stage');
    const todayKey = new Date().toDateString(); 
    const lastOpened = localStorage.getItem('lastopened');
    const dismissLoader = () => {
        loader.classList.add('dismissing');
        loader.addEventListener('animationend', (e) => {
            if (e.animationName === 'fadeOutBg') {
                loader.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    };
    
    if (lastOpened === todayKey) {
        loader.classList.add('fast-mode');
        setTimeout(() => {
            if (document.readyState === 'complete') {
                 dismissLoader();
            } else {
                loader.classList.add('bouncing');
                const checkInterval = setInterval(() => {
                    if (document.readyState === 'complete') {
                        clearInterval(checkInterval);
                        loader.classList.remove('bouncing');
                        dismissLoader();
                    }
                }, 100);
            }
        }, 500);
        
    } else {
        localStorage.setItem('lastopened', todayKey);
        let isPageLoaded = document.readyState === 'complete';
        if (!isPageLoaded) {
            window.addEventListener('load', () => {
                isPageLoaded = true;
            });
        }
        setTimeout(() => {
            if (isPageLoaded) {
                dismissLoader(); 
            } else {
                loader.classList.add('bouncing');
                const checkInterval = setInterval(() => {
                    if (document.readyState === 'complete') {
                       clearInterval(checkInterval);
                       loader.classList.remove('bouncing');
                       dismissLoader();
                    }
                }, 100);
            }
        }, 1400);
    }
})();
(function() {
    const loader = document.getElementById('loader-overlay');
    if (!loader) return;

    const wastedWarn = document.getElementById('wastedtimewarn');
    const wastedSpan = document.getElementById('wastedtimespan');

    if (!wastedWarn || !wastedSpan) return;

    let wastedTimer = null;
    let wastedStart = 0;
    let warned = false;
    let stopped = false;
    const applyStyles = () => {
        Object.assign(wastedWarn.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(40, 40, 40, 0.6)', 
            backdropFilter: 'blur(10px)',           
            webkitBackdropFilter: 'blur(10px)',     
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'sans-serif',
            zIndex: '99999',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)'
        });
    };

    const showWarn = () => {
        applyStyles();
        wastedWarn.style.display = 'block'; 
        wastedWarn.removeAttribute('hidden');
    };
    const hideWarn = () => {
        wastedWarn.style.display = 'none';
        wastedWarn.setAttribute('hidden', 'true');
    };

    const stopWastedTimer = (hide = true) => {
        if (wastedTimer) {
            clearInterval(wastedTimer);
            wastedTimer = null;
        }
        stopped = true;
        if (hide) hideWarn();
    };

    const startWastedTimer = () => {
        if (wastedTimer || stopped) return;
        wastedStart = Date.now();
        showWarn();
        warned = true;
        updateWastedSpan();
        wastedTimer = setInterval(() => {
            updateWastedSpan();
        }, 1000);
    };

    const updateWastedSpan = () => {
        const elapsedMs = Date.now() - wastedStart;
        const seconds = Math.floor(elapsedMs / 1000) + 1;
        wastedWarn.textContent = `Wasted ${seconds} seconds because of slow internet`;
        if (document.readyState === 'complete' && seconds < 59) {
            stopWastedTimer(true);
        }
        if (seconds >= 59 && document.readyState !== 'complete') {
            stopWastedTimer(false);
            try {
                setTimeout(() => location.reload(), 250);
            } catch (err) {
                hideWarn();
            }
        }
    };

    const onAnimationEnd = (e) => {
        if (loader.classList.contains('bouncing')) {
            if (!warned && !stopped) {
                startWastedTimer();
            }
        }
        if (e.animationName === 'fadeOutBg') {
            stopWastedTimer(true);
        }
    };
    loader.addEventListener('animationend', onAnimationEnd, { passive: true });

    const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.attributeName === 'class') {
                const isBouncing = loader.classList.contains('bouncing');
                
                if (isBouncing && !warned && !stopped) {
                    startWastedTimer();
                }

                if (!isBouncing && warned) {
                    if (document.readyState === 'complete') stopWastedTimer(true);
                }
            }
        }
    });
    mo.observe(loader, { attributes: true });
    window.addEventListener('load', () => {
        if (wastedTimer) stopWastedTimer(true);
    });
    if (loader.classList.contains('bouncing')) {
        setTimeout(() => {
            if (!warned && !stopped && document.readyState !== 'complete') startWastedTimer();
        }, 300);
    }
})();