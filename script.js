document.addEventListener('DOMContentLoaded', () => {
  const videoElem = document.getElementById('camera-video');
  const canvasElem = document.getElementById('preview-canvas');
  const placeholder = document.getElementById('cameraPlaceholder');
  const shutterBtn = document.getElementById('shutter-btn');
  const mirrorBtn = document.getElementById('mirrorBtn');
  const uploadInput = document.getElementById('local-file-input');
  const shotCountEl = document.getElementById('shotCount');
  const totalShotsEl = document.getElementById('totalShots');
  const downloadBtn = document.getElementById('downloadBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const cameraStatus = document.getElementById('cameraStatus');
  const activeFilterLabel = document.getElementById('activeFilterLabel');
  const filterChoices = document.querySelectorAll('.filter-choice');
  const timerChoices = document.querySelectorAll('.timer-choice');
  const filterTabs = document.querySelectorAll('.filter');
  const container = document.getElementById('templateCategoriesContainer');
  const controlRow = document.getElementById('controlRow');

  let stream = null;
  let isMirrored = true; // Default webcam mirror state
  let selectedTimer = 3; // Default timer (0, 3, 10, or 15)
  let currentFilter = 'none';
  let currentEffect = 'none';
  let capturedPhotos = [];
  let effectChoices = [];
  let faceLandmarker = null;
  let isMediaPipeReady = false;
  let isCapturing = false;
  let lastVideoTime = -1;
  let detectedFaceForehead = null; // { x, y }

  async function initMediaPipe() {
    try {
      if (typeof vision === 'undefined') {
        console.warn('MediaPipe Vision SDK not loaded. Falling back to vanilla canvas particle effects.');
        return;
      }
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
      });
      isMediaPipeReady = true;
      console.log("MediaPipe Face Landmarker Ready!");
    } catch (err) {
      console.error("MediaPipe Init Error (Fallback enabled):", err);
    }
  }
  setTimeout(initMediaPipe, 1000);

  // Create live effect overlay canvas over the video element
  const effectCanvas = document.createElement('canvas');
  effectCanvas.id = 'effect-canvas';
  effectCanvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; display: block;';
  const cameraWrap = document.querySelector('.camera-wrap');
  if (cameraWrap) {
    cameraWrap.appendChild(effectCanvas);
  }
  const effectCtx = effectCanvas.getContext('2d');

  // Particle systems state
  let particles = [];
  const maxParticles = 25;

  function initParticles(type) {
    particles = [];
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(type, true));
    }
  }

  function createParticle(type, randomY = false) {
    return {
      x: Math.random() * (effectCanvas.width || 640),
      y: randomY ? Math.random() * (effectCanvas.height || 480) : (effectCanvas.height || 480) + 20,
      size: type === 'hearts' ? Math.random() * 16 + 10 : (type === 'sparkles' ? Math.random() * 8 + 4 : Math.random() * 30 + 15),
      speedY: type === 'hearts' ? -(Math.random() * 1.5 + 0.8) : (type === 'sparkles' ? -(Math.random() * 2 + 1) : -(Math.random() * 0.8 + 0.4)),
      speedX: (Math.random() - 0.5) * 1.2,
      opacity: Math.random() * 0.7 + 0.3,
      pulse: Math.random() * Math.PI,
      pulseSpeed: Math.random() * 0.05 + 0.02,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03
    };
  }

  function drawHeart(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 24, size / 24);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff3366';
    ctx.shadowColor = '#ff6699';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(0, 3, -5, 0, -10, 0);
    ctx.bezierCurveTo(-16, 0, -20, 5, -20, 11);
    ctx.bezierCurveTo(-20, 18, -12, 24, 0, 31);
    ctx.bezierCurveTo(12, 24, 20, 18, 20, 11);
    ctx.bezierCurveTo(20, 5, 16, 0, 10, 0);
    ctx.bezierCurveTo(5, 0, 0, 3, 0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSparkle(ctx, x, y, size, alpha, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(0, -size);
      ctx.quadraticCurveTo(0, 0, size, 0);
      ctx.quadraticCurveTo(0, 0, 0, size);
      ctx.quadraticCurveTo(0, 0, -size, 0);
      ctx.rotate(Math.PI / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawVintageLight(ctx, width, height) {
    ctx.save();
    // Warm vignette & light leak effect
    const gradient = ctx.createRadialGradient(width * 0.8, height * 0.2, 10, width * 0.8, height * 0.2, width * 0.9);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.25)');
    gradient.addColorStop(0.5, 'rgba(255, 120, 50, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle light beam streak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.4, 0);
    ctx.lineTo(0, height * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function updateAndRenderParticles() {
    if (!effectCanvas || !effectCtx) return;
    
    // Match display size
    const displayWidth = effectCanvas.clientWidth || 640;
    const displayHeight = effectCanvas.clientHeight || 480;
    if (effectCanvas.width !== displayWidth || effectCanvas.height !== displayHeight) {
      effectCanvas.width = displayWidth;
      effectCanvas.height = displayHeight;
    }

    effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);

    if (currentEffect === 'none') {
      requestAnimationFrame(updateAndRenderParticles);
      return;
    }

    // MediaPipe face tracking detection loop for video
    if (faceLandmarker && videoElem && videoElem.readyState === videoElem.HAVE_ENOUGH_DATA && videoElem.currentTime !== lastVideoTime) {
      lastVideoTime = videoElem.currentTime;
      try {
        const results = faceLandmarker.detectForVideo(videoElem, performance.now());
        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          // Landmark #10: Forehead / Crown
          const forehead = landmarks[10];
          if (forehead) {
            // Note: video stream may be mirrored in CSS display (`transform: scaleX(-1)`), adjust X if needed
            let fx = (isMirrored ? (1 - forehead.x) : forehead.x) * effectCanvas.width;
            let fy = forehead.y * effectCanvas.height;
            detectedFaceForehead = { x: fx, y: fy };
          }
        } else {
          detectedFaceForehead = null;
        }
      } catch (e) {
        // Fallback on error
        detectedFaceForehead = null;
      }
    }

    if (currentEffect === 'vintage-light') {
      drawVintageLight(effectCtx, effectCanvas.width, effectCanvas.height);
    } else if (currentEffect === 'hearts' || currentEffect === 'sparkles') {
      if (particles.length === 0) {
        initParticles(currentEffect);
      }

      particles.forEach((p, index) => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.pulse) * 0.5;
        p.pulse += p.pulseSpeed;
        p.rotation += p.rotSpeed;

        const alpha = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

        // If face detected for "hearts", anchor particle cluster around head region
        let drawX = p.x;
        let drawY = p.y;

        if (currentEffect === 'hearts' && detectedFaceForehead) {
          // Calculate offset relative to particle index and pulse
          const angle = (index / particles.length) * Math.PI * 2 + p.pulse;
          const radiusX = 60 + Math.sin(p.pulse * 2) * 20;
          const radiusY = 35 + Math.cos(p.pulse * 2) * 15;
          drawX = detectedFaceForehead.x + Math.cos(angle) * radiusX;
          drawY = (detectedFaceForehead.y - 40) + Math.sin(angle) * radiusY - (p.pulse % 20);
        }

        if (currentEffect === 'hearts') {
          drawHeart(effectCtx, drawX, drawY, p.size, alpha);
        } else if (currentEffect === 'sparkles') {
          drawSparkle(effectCtx, drawX, drawY, p.size, alpha, p.rotation);
        }

        // Recycle particle when it goes off screen
        if (p.y < -30 || p.x < -30 || p.x > effectCanvas.width + 30) {
          particles[index] = createParticle(currentEffect, false);
          particles[index].y = effectCanvas.height + 20;
        }
      });
    }

    requestAnimationFrame(updateAndRenderParticles);
  }
  requestAnimationFrame(updateAndRenderParticles);

  effectChoices = document.querySelectorAll('.effect-choice, .effect-btn, [data-effect]');
  if (effectChoices.length > 0) {
    effectChoices.forEach(btn => {
      btn.addEventListener('click', () => {
        effectChoices.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentEffect = btn.dataset.effect || btn.textContent.toLowerCase().trim();
        initParticles(currentEffect);
      });
    });
  }

  const FRAME_DATABASE = {
    'tebs-edition': {
      displayName: 'TEBS Edition',
      category: 'Collab & Brands',
      previewImg: 'assets/frames/tebs-preview.png',
      frameImg: 'assets/frames/tebs.png',
      figmaWidth: 3079,
      slots: [
        { x: 82.25, y: 97.67,   width: 2914.69, height: 1716.95 },
        { x: 82.25, y: 1932.85, width: 2914.69, height: 1716.95 },
        { x: 82.25, y: 3768.03, width: 2914.69, height: 1716.95 },
        { x: 82.25, y: 5603.21, width: 2914.69, height: 1716.95 }
      ]
    },
    'halloween-red': {
      displayName: 'Halloween Edition',
      category: 'Seasonal / Special Events',
      previewImg: 'assets/frames/halloween-preview.png',
      frameImg: 'assets/frames/halloween-red.png',
      figmaWidth: 3079,
      slots: [
        { x: 181, y: 483,  width: 2712, height: 1954 },
        { x: 181, y: 2594, width: 2712, height: 1954 },
        { x: 181, y: 4705, width: 2712, height: 1954 },
        { x: 181, y: 6816, width: 2712, height: 1954 }
      ]
    }
  };

  let storedFrame = localStorage.getItem('selectedFrame');
  if (!storedFrame || !FRAME_DATABASE[storedFrame]) {
    storedFrame = 'halloween-red';
    localStorage.setItem('selectedFrame', storedFrame);
  }
  let selectedFrameKey = storedFrame;

  function initTemplates(filterCategory = 'all') {
    if (!container) return;
    container.innerHTML = '';
    const cacheBuster = Date.now();

    const categories = {};
    Object.keys(FRAME_DATABASE).forEach(key => {
      const frame = FRAME_DATABASE[key];
      if (filterCategory === 'all' || frame.category === filterCategory) {
        if (!categories[frame.category]) {
          categories[frame.category] = [];
        }
        categories[frame.category].push({ key, ...frame });
      }
    });

    Object.keys(categories).forEach(cat => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'category-group';

      const title = document.createElement('h3');
      title.className = 'category-title';
      title.textContent = cat;
      groupDiv.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'template-grid';

      categories[cat].forEach(tpl => {
        const card = document.createElement('article');
        card.className = `template-card ${selectedFrameKey === tpl.key ? 'featured' : ''}`;
        card.dataset.id = tpl.key;

        const previewWithCache = `${tpl.previewImg}?t=${cacheBuster}`;

        card.innerHTML = `
          <div class="template-preview" style="background: url('${previewWithCache}') center/contain no-repeat #0b1329;">
            <div class="preview-badge">${cat === 'Seasonal / Special Events' ? 'Halloween 🎃' : 'Trending ✦'}</div>
          </div>
          <div class="template-info">
            <div>
              <h3>${tpl.displayName}</h3>
              <p>${tpl.slots.length} Photos · Studio Quality</p>
            </div>
            <button class="select-layout" data-frame-key="${tpl.key}">Use layout <span>→</span></button>
          </div>
        `;

        card.querySelector('.select-layout').addEventListener('click', () => {
          selectFrame(tpl.key);
        });

        grid.appendChild(card);
      });

      groupDiv.appendChild(grid);
      container.appendChild(groupDiv);
    });

    if (FRAME_DATABASE[selectedFrameKey]) {
      selectFrame(selectedFrameKey, false);
    }
  }

  function selectFrame(key, scrollToStudio = true) {
    if (!FRAME_DATABASE[key]) return;
    selectedFrameKey = key;
    localStorage.setItem('selectedFrame', key);

    const selectedFrame = FRAME_DATABASE[key];
    currentLayout = selectedFrame.slots.length;
    if (totalShotsEl) totalShotsEl.textContent = currentLayout;
    resetSession();

    document.querySelectorAll('.template-card').forEach(card => {
      if (card.dataset.id === key) {
        card.classList.add('featured');
      } else {
        card.classList.remove('featured');
      }
    });

    if (scrollToStudio) {
      const studioSec = document.getElementById('studio');
      if (studioSec) studioSec.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 1. Centralized updateThumbs() Function with Null Guards
  function updateThumbs() {
    const photos = capturedPhotos || [];
    
    const shotCounter = document.querySelector('#shotCount') || document.querySelector('.shot-indicator');
    if (shotCounter) {
      shotCounter.textContent = `${photos.length}`;
    }

    const shotCountDisplay = document.querySelector('.shot-count');
    if (shotCountDisplay) {
      shotCountDisplay.innerHTML = `SHOT <b id="shotCount">${photos.length}</b> / <span id="totalShots">${currentLayout}</span>`;
    }

    const thumbSlots = document.querySelectorAll('.thumb, .thumb-box, .thumbnail-slot, [data-slot]');
    thumbSlots.forEach((slot, index) => {
      if (photos[index]) {
        slot.innerHTML = `<img src="${photos[index]}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
        slot.classList.remove('empty');
      } else {
        const slotNum = String(index + 1).padStart(2, '0');
        slot.innerHTML = `<span style="opacity:0.4;">${slotNum}</span>`;
        slot.classList.add('empty');
      }
    });

    if (photos.length >= currentLayout) {
      viewMode = 'preview';
      if (videoElem) videoElem.style.display = 'none';
      if (canvasElem) canvasElem.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      if (controlRow) controlRow.style.display = 'none';
      if (downloadBtn) downloadBtn.disabled = false;
      if (cameraStatus) cameraStatus.textContent = 'All photos captured! Preview below.';
      
      if (typeof renderFinalPreview === 'function') {
        renderFinalPreview();
      }
    }
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.filter;
      initTemplates(cat);
    });
  });

  async function initCamera() {
    const videoElement = document.querySelector('video') || document.querySelector('#camera-video');
    const placeholderElem = document.querySelector('#cameraPlaceholder') || document.querySelector('.camera-placeholder');
    const statusBadge = document.querySelector('#cameraStatus') || document.querySelector('.camera-status-badge');

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.setAttribute('playsinline', '');
        videoElement.setAttribute('muted', '');
        videoElement.muted = true;
        
        await videoElement.play();

        // EXPLICIT DOM SWAP
        videoElement.style.display = 'block';
        if (placeholderElem) placeholderElem.style.display = 'none';
        if (statusBadge) statusBadge.textContent = 'Camera ready';
      }

    } catch (err) {
      console.error('CAMERA INIT ERROR:', err);
      if (placeholderElem) placeholderElem.style.display = 'flex';
      if (videoElement) videoElement.style.display = 'none';
      if (statusBadge) statusBadge.textContent = 'Camera Error';
      alert('Camera access denied or unavailable. Please check browser permissions.');
    }
  }
  initCamera();

  if (mirrorBtn) {
    mirrorBtn.addEventListener('click', () => {
      isMirrored = !isMirrored;
      if (videoElem) videoElem.classList.toggle('unmirrored', !isMirrored);
    });
  }

  timerChoices.forEach(btn => {
    btn.addEventListener('click', () => {
      timerChoices.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTimer = parseInt(btn.dataset.time, 10);
      if (isNaN(selectedTimer)) selectedTimer = 3;
    });
  });

  filterChoices.forEach(btn => {
    if (btn.classList.contains('timer-choice')) return;
    btn.addEventListener('click', () => {
      filterChoices.forEach(b => {
        if (!b.classList.contains('timer-choice')) b.classList.remove('active');
      });
      btn.classList.add('active');
      currentFilter = btn.dataset.css;
      if (activeFilterLabel) activeFilterLabel.textContent = btn.textContent.toUpperCase();
      applyFilterStyle();

      if (viewMode === 'preview') {
        renderFinalPreview();
      }
    });
  });

  function applyFilterStyle() {
    if (videoElem) videoElem.style.filter = getFilterCSS(currentFilter);
  }

  function getFilterCSS(filter) {
    switch(filter) {
      case 'cool': return 'brightness(1.05) saturate(1.1) hue-rotate(185deg)';
      case 'mono': return 'grayscale(100%) contrast(1.2)';
      case 'warm': return 'sepia(0.3) saturate(1.2) brightness(1.05)';
      case 'vintage': return 'sepia(0.5) contrast(1.1) brightness(0.95) saturate(0.8)';
      default: return 'none';
    }
  }

  if (shutterBtn) {
    shutterBtn.addEventListener('click', () => {
      if (isCountingDown || isCapturing || capturedPhotos.length >= currentLayout || viewMode !== 'camera') return;
      
      if (selectedTimer === 0) {
        if (cameraStatus) cameraStatus.textContent = 'Say cheese! 📸';
        captureFrame();
      } else {
        startCountdownAndCapture();
      }
    });
  }

  function startCountdownAndCapture() {
    isCountingDown = true;
    let timeLeft = selectedTimer;
    if (shutterBtn) {
      shutterBtn.style.opacity = '0.6';
      shutterBtn.style.pointerEvents = 'none';
    }

    if (cameraStatus) cameraStatus.textContent = `Capturing in ${timeLeft}s...`;

    const timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        if (cameraStatus) cameraStatus.textContent = `Capturing in ${timeLeft}s...`;
      } else {
        clearInterval(timerInterval);
        if (cameraStatus) cameraStatus.textContent = 'Say cheese! 📸';
        captureFrame();
        isCountingDown = false;
        if (shutterBtn) {
          shutterBtn.style.opacity = '1';
          shutterBtn.style.pointerEvents = 'auto';
        }
      }
    }, 1000);
  }

  function captureFrame() {
    if (isCapturing) return;
    isCapturing = true;

    try {
      const w = (videoElem && videoElem.videoWidth) || 1280;
      const h = (videoElem && videoElem.videoHeight) || 720;
      const hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.width = w;
      hiddenCanvas.height = h;
      const ctx = hiddenCanvas.getContext('2d');
      
      ctx.filter = getFilterCSS(currentFilter);
      if (isMirrored && videoElem) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      if (videoElem && videoElem.readyState === videoElem.HAVE_ENOUGH_DATA) {
        ctx.drawImage(videoElem, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, w, h);
      }

      // Render active particle effects or vintage light onto captured snapshot
      if (currentEffect === 'vintage-light') {
        const gradient = ctx.createRadialGradient(w * 0.8, h * 0.2, 10, w * 0.8, h * 0.2, w * 0.9);
        gradient.addColorStop(0, 'rgba(255, 200, 100, 0.25)');
        gradient.addColorStop(0.5, 'rgba(255, 120, 50, 0.08)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 0.4, 0);
        ctx.lineTo(0, h * 0.7);
        ctx.closePath();
        ctx.fill();
      } else if (currentEffect === 'hearts' || currentEffect === 'sparkles') {
        const scaleFactor = w / 640;
        particles.forEach(p => {
          const snapX = p.x * scaleFactor;
          const snapY = p.y * (h / (effectCanvas.height || 480));
          const snapSize = p.size * scaleFactor;
          const alpha = p.opacity;

          if (currentEffect === 'hearts') {
            drawHeart(ctx, snapX, snapY, snapSize, alpha);
          } else if (currentEffect === 'sparkles') {
            drawSparkle(ctx, snapX, snapY, snapSize, alpha, p.rotation);
          }
        });
      }
      
      const flashDiv = document.createElement('div');
      flashDiv.style.position = 'absolute';
      flashDiv.style.top = '0';
      flashDiv.style.left = '0';
      flashDiv.style.width = '100%';
      flashDiv.style.height = '100%';
      flashDiv.style.background = '#ffffff';
      flashDiv.style.zIndex = '50';
      flashDiv.style.transition = 'opacity 0.3s ease';
      const cameraWrap = document.querySelector('.camera-wrap');
      if (cameraWrap) cameraWrap.appendChild(flashDiv);
      setTimeout(() => { flashDiv.style.opacity = '0'; }, 50);
      setTimeout(() => { flashDiv.remove(); }, 350);

      const photoDataUrl = hiddenCanvas.toDataURL('image/png');
      capturedPhotos.push(photoDataUrl);
      updateThumbs();

      if (cameraStatus && capturedPhotos.length < currentLayout) {
        cameraStatus.textContent = `Camera ready (${capturedPhotos.length}/${currentLayout})`;
      }
    } finally {
      isCapturing = false;
    }
  }

  function resetSession() {
    capturedPhotos = [];
    if (shotCountEl) shotCountEl.textContent = '0';
    if (downloadBtn) downloadBtn.disabled = true;
    if (cameraStatus) cameraStatus.textContent = stream ? 'Camera live' : 'Camera off';
    
    viewMode = 'camera';
    if (videoElem) videoElem.style.display = 'block';
    if (canvasElem) canvasElem.style.display = 'none';
    if (!stream && placeholder) placeholder.style.display = 'flex';
    if (controlRow) controlRow.style.display = 'flex';
    isCountingDown = false;
    if (shutterBtn) {
      shutterBtn.style.opacity = '1';
      shutterBtn.style.pointerEvents = 'auto';
    }
    updateThumbs();
  }

  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      resetSession();
      if (cameraStatus) cameraStatus.textContent = 'Session reset. Ready for new photos!';
    });
  }

  function renderFinalPreview() {
    if (capturedPhotos.length === 0 || !FRAME_DATABASE[selectedFrameKey] || !canvasElem) return;

    const selectedFrame = FRAME_DATABASE[selectedFrameKey];
    const frameImg = new Image();
    frameImg.crossOrigin = 'anonymous';

    frameImg.onload = () => {
      canvasElem.width = frameImg.naturalWidth;
      canvasElem.height = frameImg.naturalHeight;
      const ctx = canvasElem.getContext('2d');

      ctx.clearRect(0, 0, canvasElem.width, canvasElem.height);

      const scale = frameImg.naturalWidth / selectedFrame.figmaWidth;

      selectedFrame.slots.forEach((slot, index) => {
        if (capturedPhotos[index]) {
          const sX = slot.x * scale;
          const sY = slot.y * scale;
          const sW = slot.width * scale;
          const sH = slot.height * scale;
          
          const imgObj = new Image();
          imgObj.onload = () => {
            drawImageCover(ctx, imgObj, sX, sY, sW, sH);
            // Re-draw frame on top once all images are loaded
            ctx.drawImage(frameImg, 0, 0, canvasElem.width, canvasElem.height);
          };
          imgObj.src = capturedPhotos[index];
        }
      });

      // Initial draw frame in case images take a moment
      ctx.drawImage(frameImg, 0, 0, canvasElem.width, canvasElem.height);
    };

    frameImg.src = `${selectedFrame.frameImg}?t=${Date.now()}`;
  }

  async function handleDownload() {
    if (capturedPhotos.length === 0 || !FRAME_DATABASE[selectedFrameKey]) return;
    
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Downloading... ⏳';
    }

    // Give the UI thread time to render the button text before heavy processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Mobile vs Desktop Device Detection
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                           || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const selectedFrame = FRAME_DATABASE[selectedFrameKey];
    const frameImg = new Image();
    frameImg.crossOrigin = 'anonymous';

    frameImg.onload = () => {
      const stripCanvas = document.createElement('canvas');
      const ctx = stripCanvas.getContext('2d');

      stripCanvas.width = frameImg.naturalWidth;
      stripCanvas.height = frameImg.naturalHeight;

      ctx.clearRect(0, 0, stripCanvas.width, stripCanvas.height);

      const scale = frameImg.naturalWidth / selectedFrame.figmaWidth;
      let loadedCount = 0;
      const totalToLoad = capturedPhotos.length;

      const finishBlobProcess = () => {
        // Draw frame on top
        ctx.drawImage(frameImg, 0, 0, stripCanvas.width, stripCanvas.height);

        // 1. Create a downscaled copy for mobile memory safety (max 1500px)
        const exportCanvas = getMobileOptimizedCanvas(stripCanvas, 1500);

        exportCanvas.toBlob(async (blob) => {
          if (!blob) {
            alert('Failed to generate image.');
            resetDownloadBtn(downloadBtn);
            return;
          }

          const fileName = `poseyyy-${selectedFrameKey || 'strip'}-${Date.now()}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });

          // PATH A: MOBILE DEVICES (iOS / Android) -> Use Web Share API if available
          if (isMobileDevice && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'My Photo Strip',
                text: 'Check out my photobooth strip!'
              });
              resetDownloadBtn(downloadBtn);
              return;
            } catch (err) {
              if (err.name !== 'AbortError') {
                triggerDirectDownload(blob, fileName);
              }
              resetDownloadBtn(downloadBtn);
              return;
            }
          }

          // PATH B: DESKTOP / LAPTOP (Windows / Mac / Linux) -> Direct Browser Download
          triggerDirectDownload(blob, fileName);
          resetDownloadBtn(downloadBtn);

        }, 'image/png', 0.95);
      };

      selectedFrame.slots.forEach((slot, index) => {
        if (capturedPhotos[index]) {
          const sX = slot.x * scale;
          const sY = slot.y * scale;
          const sW = slot.width * scale;
          const sH = slot.height * scale;

          const imgObj = new Image();
          imgObj.onload = () => {
            drawImageCover(ctx, imgObj, sX, sY, sW, sH);
            loadedCount++;
            if (loadedCount >= totalToLoad) {
              finishBlobProcess();
            }
          };
          imgObj.onerror = () => {
            loadedCount++;
            if (loadedCount >= totalToLoad) {
              finishBlobProcess();
            }
          };
          imgObj.src = capturedPhotos[index];
        } else {
          loadedCount++;
          if (loadedCount >= totalToLoad) {
            finishBlobProcess();
          }
        }
      });
    };

    frameImg.onerror = () => {
      alert('Failed to load frame for download.');
      resetDownloadBtn(downloadBtn);
    };

    frameImg.src = `${selectedFrame.frameImg}?t=${Date.now()}`;
  }

  function triggerDirectDownload(blob, fileName) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }

  function resetDownloadBtn(btn) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Download your strip ↓';
    }
  }

  function getMobileOptimizedCanvas(sourceCanvas, maxWidth) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (!isMobile && sourceCanvas.width <= maxWidth) {
      return sourceCanvas;
    }

    const targetWidth = Math.min(sourceCanvas.width, maxWidth);
    const targetHeight = Math.round((sourceCanvas.height * targetWidth) / sourceCanvas.width);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  function showIOSDownloadModal(imgSrc, fileName = 'my-photo-strip.png') {
    const existingModal = document.getElementById('download-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'download-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.9); z-index: 9999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; box-sizing: border-box; backdrop-filter: blur(8px);
    `;

    modal.innerHTML = `
      <div class="modal-card" style="background: #1e293b; border-radius: 20px; padding: 24px; max-width: 360px; width: 100%; text-align: center; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <h3 style="color: #ffffff; font-size: 18px; margin-bottom: 16px; font-family: 'Plus Jakarta Sans', sans-serif;">Your Photo Strip is Ready! ✨</h3>
        
        <div class="preview-container" style="background: #0b1329; border-radius: 12px; overflow: hidden; max-height: 360px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 8px;">
          <img id="modal-preview-img" src="${imgSrc}" alt="Photo Strip Preview" style="max-width: 100%; max-height: 340px; object-fit: contain; border-radius: 8px; user-select: auto; -webkit-touch-callout: default; pointer-events: auto;" />
        </div>

        <div class="modal-actions" style="display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 16px;">
          <a id="modal-download-btn" class="btn-primary button" href="${imgSrc}" download="${fileName}" style="text-align: center; text-decoration: none; justify-content: center; width: 100%; background: var(--sky-500); color: white; padding: 12px 16px; border-radius: 9999px; font-weight: 600; font-size: 14px; box-sizing: border-box;">Download Photo ↓</a>
          <button id="modal-close-btn" class="btn-secondary" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 9999px; font-weight: 600; font-size: 14px; cursor: pointer; width: 100%;">Close & Continue</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#modal-close-btn');
    closeBtn.addEventListener('click', () => {
      modal.remove();
      setTimeout(() => URL.revokeObjectURL(imgSrc), 10000);
    });

    const downloadLink = modal.querySelector('#modal-download-btn');
    downloadLink.addEventListener('click', () => {
      // Optional extra handling if needed, standard anchor download will trigger
    });
  }

  function triggerFallbackDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up memory URL after 10 seconds
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function resetDownloadBtn(btn) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Download your strip ↓';
    }
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownload);
  }

  function drawImageCover(ctx, img, x, y, targetW, targetH) {
    const imgRatio = img.width / img.height;
    const targetRatio = targetW / targetH;
    let sx, sy, sW, sH;

    if (imgRatio > targetRatio) {
      sH = img.height;
      sW = img.height * targetRatio;
      sx = (img.width - sW) / 2;
      sy = 0;
    } else {
      sW = img.width;
      sH = img.width / targetRatio;
      sx = 0;
      sy = (img.height - sH) / 2;
    }
    ctx.drawImage(img, sx, sy, sW, sH, x, y, targetW, targetH);
  }

  initTemplates();
});
