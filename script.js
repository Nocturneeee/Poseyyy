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
  let currentFilter = 'none';
  let isMirrored = true;
  let currentLayout = 4;
  let capturedPhotos = []; // Using capturedPhotos as requested
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
      if (isCountingDown || capturedPhotos.length >= currentLayout || viewMode !== 'camera') return;
      
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

  // 2. Connect Local File Upload Reader to updateThumbs()
  function handleFileUpload(files) {
    const remaining = currentLayout - capturedPhotos.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        capturedPhotos.push(e.target.result);
        updateThumbs();
      };
      reader.readAsDataURL(file);
    });
  }

  if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
      handleFileUpload(e.target.files);
      uploadInput.value = '';
    });
  }

  function captureFrame() {
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
      downloadBtn.textContent = 'Processing... ⏳';
    }

    // Give the UI thread time to render the button text before heavy processing
    await new Promise(resolve => setTimeout(resolve, 50));

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
            alert('Export failed. Please try again.');
            resetDownloadBtn(downloadBtn);
            return;
          }

          const fileName = `poseyyy-${selectedFrameKey}-${Date.now()}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });

          // 2. Try Native Web Share API (Best for iOS)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'My Photo Strip',
                text: 'Check out my photo strip!'
              });
              resetDownloadBtn(downloadBtn);
              return;
            } catch (err) {
              // User cancelled share or share failed
              if (err.name === 'AbortError') {
                resetDownloadBtn(downloadBtn);
                return;
              }
            }
          }

          // 3. iOS Fallback: Open Image Modal for Manual "Tap & Hold -> Save to Photos"
          const imageUrl = URL.createObjectURL(blob);
          
          // Detect iOS / Mobile
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

          if (isIOS) {
            showIOSDownloadModal(imageUrl, fileName);
          } else {
            // Standard desktop anchor download trigger
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(imageUrl), 10000);
          }

          resetDownloadBtn(downloadBtn);
        }, 'image/png', 0.90);
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
