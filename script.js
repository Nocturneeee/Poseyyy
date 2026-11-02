document.addEventListener('DOMContentLoaded', () => {
  const videoElem = document.getElementById('camera-video');
  const canvasElem = document.getElementById('preview-canvas');
  const placeholder = document.getElementById('cameraPlaceholder');
  const shutterBtn = document.getElementById('shutter-btn');
  const mirrorBtn = document.getElementById('mirrorBtn');
  const uploadInput = document.getElementById('uploadInput');
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
  let currentFilter = 'none';
  let isMirrored = true;
  let currentLayout = 4;
  let shots = [];
  let selectedTimer = 3;
  let isCountingDown = false;
  let viewMode = 'camera'; // 'camera' | 'preview'

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
    updateThumbsContainer();

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

  function updateThumbsContainer() {
    const thumbsWrap = document.getElementById('thumbs');
    if (!thumbsWrap) return;
    thumbsWrap.className = `thumbs count-${currentLayout}`;
    thumbsWrap.innerHTML = '';
    for (let i = 0; i < currentLayout; i++) {
      const t = document.createElement('div');
      t.className = 'thumb empty';
      t.textContent = `0${i + 1}`;
      thumbsWrap.appendChild(t);
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
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      if (videoElem) videoElem.srcObject = stream;
      if (placeholder) placeholder.style.display = 'none';
      if (cameraStatus) cameraStatus.textContent = 'Camera live';
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      if (cameraStatus) cameraStatus.textContent = 'Camera off (Upload ready)';
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
      selectedTimer = parseInt(btn.dataset.time, 10) || 3;
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
      if (isCountingDown || shots.length >= currentLayout || viewMode !== 'camera') return;
      startCountdownAndCapture();
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

  if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          addShot(img);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function captureFrame() {
    const videoElem = document.getElementById('camera-video');
    const shotCountElem = document.getElementById('shotCount');

    // 1. Off-screen canvas snapshot
    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = (videoElem && videoElem.videoWidth) || 1280;
    hiddenCanvas.height = (videoElem && videoElem.videoHeight) || 720;
    const ctx = hiddenCanvas.getContext('2d');
    
    ctx.filter = getFilterCSS(currentFilter);
    if (isMirrored && videoElem) {
      ctx.translate(hiddenCanvas.width, 0);
      ctx.scale(-1, 1);
    }

    if (videoElem && videoElem.readyState === videoElem.HAVE_ENOUGH_DATA) {
      ctx.drawImage(videoElem, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    } else {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    }
    
    // Flash effect simulation
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
    const img = new Image();
    img.onload = () => {
      // 2. Update Array & UI Safely
      shots.push(img);
      if (shotCountElem) {
        shotCountElem.textContent = `${shots.length}`;
      }
      
      const shotCounterElem = document.getElementById('shotCount');
      if (shotCounterElem) {
        // Updating parent text or span as requested
      }
      
      const shotCountDisplay = document.querySelector('.shot-count');
      if (shotCountDisplay) {
        shotCountDisplay.innerHTML = `SHOT <b id="shotCount">${shots.length}</b> / <span id="totalShots">${currentLayout}</span>`;
      }

      const thumbSlots = document.querySelectorAll('.thumb');
      const currentIndex = shots.length - 1;
      if (thumbSlots[currentIndex]) {
        thumbSlots[currentIndex].innerHTML = `<img src="${photoDataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
        thumbSlots[currentIndex].classList.remove('empty');
      }

      // 3. Auto-Trigger Preview on Shot 4 (or currentLayout)
      if (shots.length >= currentLayout) {
        viewMode = 'preview';
        if (videoElem) videoElem.style.display = 'none';
        const canvasElem = document.getElementById('preview-canvas');
        if (canvasElem) canvasElem.style.display = 'block';
        const placeholder = document.getElementById('cameraPlaceholder');
        if (placeholder) placeholder.style.display = 'none';
        const controlRow = document.getElementById('controlRow');
        if (controlRow) controlRow.style.display = 'none';
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) downloadBtn.disabled = false;
        if (cameraStatus) cameraStatus.textContent = 'All photos captured! Preview below.';
        
        renderFinalPreview();
      } else {
        if (cameraStatus) cameraStatus.textContent = `Camera ready (${shots.length}/${currentLayout})`;
      }
    };
    img.src = photoDataUrl;
  }

  function addShot(imgObj) {
    if (shots.length >= currentLayout) return;
    shots.push(imgObj);
    updateThumbs();
    if (shotCountEl) shotCountEl.textContent = shots.length;

    if (shots.length >= currentLayout) {
      // 1. Switch to preview mode with null guards
      viewMode = 'preview';
      const videoElem = document.getElementById('camera-video');
      const canvasElem = document.getElementById('preview-canvas');
      const placeholder = document.getElementById('cameraPlaceholder');
      const controlRow = document.getElementById('controlRow');
      const downloadBtn = document.getElementById('downloadBtn');

      if (videoElem) videoElem.style.display = 'none';
      if (canvasElem) canvasElem.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      if (controlRow) controlRow.style.display = 'none';
      if (downloadBtn) downloadBtn.disabled = false;
      if (cameraStatus) cameraStatus.textContent = 'All photos captured! Preview below.';
      
      renderFinalPreview();
    } else {
      if (cameraStatus) cameraStatus.textContent = `Camera ready (${shots.length}/${currentLayout})`;
    }
  }

  function resetSession() {
    shots = [];
    if (shotCountEl) shotCountEl.textContent = '0';
    if (downloadBtn) downloadBtn.disabled = true;
    if (cameraStatus) cameraStatus.textContent = stream ? 'Camera live' : 'Camera off';
    
    // 1. Reset Viewport & State with null guards
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

  // 3. Async Frame Preloading & Render Execution (renderFinalPreview)
  function renderFinalPreview() {
    const canvasElem = document.getElementById('preview-canvas');
    if (shots.length === 0 || !FRAME_DATABASE[selectedFrameKey] || !canvasElem) return;

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
        if (shots[index]) {
          const sX = slot.x * scale;
          const sY = slot.y * scale;
          const sW = slot.width * scale;
          const sH = slot.height * scale;
          drawImageCover(ctx, shots[index], sX, sY, sW, sH);
        }
      });

      ctx.drawImage(frameImg, 0, 0, canvasElem.width, canvasElem.height);
      console.log('Final Strip Preview Rendered Successfully on Canvas.');
    };

    frameImg.src = `${selectedFrame.frameImg}?t=${Date.now()}`;
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (shots.length === 0 || !FRAME_DATABASE[selectedFrameKey]) return;

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

        selectedFrame.slots.forEach((slot, index) => {
          if (shots[index]) {
            const sX = slot.x * scale;
            const sY = slot.y * scale;
            const sW = slot.width * scale;
            const sH = slot.height * scale;
            drawImageCover(ctx, shots[index], sX, sY, sW, sH);
          }
        });

        ctx.drawImage(frameImg, 0, 0, stripCanvas.width, stripCanvas.height);

        const link = document.createElement('a');
        link.download = `poseyyy-${selectedFrameKey}-${Date.now()}.png`;
        link.href = stripCanvas.toDataURL('image/png');
        link.click();
      };

      frameImg.src = `${selectedFrame.frameImg}?t=${Date.now()}`;
    });
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
