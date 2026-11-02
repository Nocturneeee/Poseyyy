document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const placeholder = document.getElementById('cameraPlaceholder');
  const shutterBtn = document.getElementById('shutterBtn');
  const mirrorBtn = document.getElementById('mirrorBtn');
  const uploadInput = document.getElementById('uploadInput');
  const shotCountEl = document.getElementById('shotCount');
  const totalShotsEl = document.getElementById('totalShots');
  const downloadBtn = document.getElementById('downloadBtn');
  const cameraStatus = document.getElementById('cameraStatus');
  const activeFilterLabel = document.getElementById('activeFilterLabel');
  const thumbs = document.querySelectorAll('.thumb');
  const filterChoices = document.querySelectorAll('.filter-choice');
  const filterTabs = document.querySelectorAll('.filter');
  const container = document.getElementById('templateCategoriesContainer');

  let stream = null;
  let currentFilter = 'none';
  let isMirrored = true;
  let currentLayout = 4;
  let shots = [];

  // 3. Verify FRAME_DATABASE Keys & Paths
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

  // 2. Fix localStorage & State Synchronization
  let storedFrame = localStorage.getItem('selectedFrame');
  if (!storedFrame || !FRAME_DATABASE[storedFrame]) {
    storedFrame = 'halloween-red'; // default or fallback
    localStorage.setItem('selectedFrame', storedFrame);
  }
  let selectedFrameKey = storedFrame;
  console.log('Initial Loaded Selected Frame from localStorage:', selectedFrameKey);

  // 2. UI Frame Picker & Sectioning with Cache-Busting
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
    // 2. Explicitly save to localStorage
    localStorage.setItem('selectedFrame', key);

    const selectedFrame = FRAME_DATABASE[key];
    // 1. Console debugging
    console.log('Selected Frame Key:', selectedFrameKey);
    console.log('Loading Frame Image Path:', selectedFrame.frameImg);

    currentLayout = selectedFrame.slots.length;
    totalShotsEl.textContent = currentLayout;
    resetSession();
    updateThumbsContainer();

    // Highlight active card
    document.querySelectorAll('.template-card').forEach(card => {
      if (card.dataset.id === key) {
        card.classList.add('featured');
      } else {
        card.classList.remove('featured');
      }
    });

    if (scrollToStudio) {
      document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
    }
  }

  function updateThumbsContainer() {
    const thumbsWrap = document.getElementById('thumbs');
    thumbsWrap.className = `thumbs count-${currentLayout}`;
    thumbsWrap.innerHTML = '';
    for (let i = 0; i < currentLayout; i++) {
      const t = document.createElement('div');
      t.className = 'thumb empty';
      t.textContent = `0${i + 1}`;
      thumbsWrap.appendChild(t);
    }
  }

  // Filter tabs behavior
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.filter;
      initTemplates(cat);
    });
  });

  // Initialize camera
  async function initCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      video.srcObject = stream;
      placeholder.style.display = 'none';
      cameraStatus.textContent = 'Camera live';
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      cameraStatus.textContent = 'Camera off (Upload ready)';
    }
  }
  initCamera();

  // Mirror toggle
  mirrorBtn.addEventListener('click', () => {
    isMirrored = !isMirrored;
    video.classList.toggle('unmirrored', !isMirrored);
  });

  // Filter selection
  filterChoices.forEach(btn => {
    btn.addEventListener('click', () => {
      filterChoices.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.css;
      activeFilterLabel.textContent = btn.textContent.toUpperCase();
      applyFilterStyle();
    });
  });

  function applyFilterStyle() {
    video.style.filter = getFilterCSS(currentFilter);
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

  // Shutter action
  shutterBtn.addEventListener('click', () => {
    if (shots.length >= currentLayout) return;
    captureFrame();
  });

  // Upload handler
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

  function captureFrame() {
    if (!stream && video.readyState !== 4) {
      createMockShot();
      return;
    }
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    ctx.filter = getFilterCSS(currentFilter);
    if (isMirrored) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    
    const imgData = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      addShot(img);
    };
    img.src = imgData;
  }

  function createMockShot() {
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 600, 450);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Moment #${shots.length + 1}`, 300, 225);
    
    const img = new Image();
    img.onload = () => addShot(img);
    img.src = canvas.toDataURL('image/png');
  }

  function addShot(imgObj) {
    if (shots.length >= currentLayout) return;
    shots.push(imgObj);
    updateThumbs();
    shotCountEl.textContent = shots.length;

    if (shots.length >= currentLayout) {
      downloadBtn.disabled = false;
      cameraStatus.textContent = 'Ready to download!';
    } else {
      cameraStatus.textContent = `Pose for photo #${shots.length + 1}!`;
    }
  }

  function updateThumbs() {
    const thumbs = document.querySelectorAll('.thumb');
    thumbs.forEach((thumb, idx) => {
      thumb.innerHTML = '';
      if (shots[idx]) {
        const imgEl = document.createElement('img');
        imgEl.src = shots[idx].src;
        thumb.appendChild(imgEl);
        thumb.classList.remove('empty');
      } else {
        thumb.textContent = `0${idx + 1}`;
        thumb.classList.add('empty');
      }
    });
  }

  function resetSession() {
    shots = [];
    shotCountEl.textContent = '0';
    downloadBtn.disabled = true;
    cameraStatus.textContent = stream ? 'Camera live' : 'Camera off';
    updateThumbs();
  }

  // 3. Canvas Render Logic with Cache-Busting and Auto-Scale
  downloadBtn.addEventListener('click', () => {
    if (shots.length === 0 || !FRAME_DATABASE[selectedFrameKey]) return;

    const selectedFrame = FRAME_DATABASE[selectedFrameKey];
    console.log('Downloading with Selected Frame Key:', selectedFrameKey);
    console.log('Frame Image Path:', selectedFrame.frameImg);

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

    // 1. Cache-busting on frame download load
    frameImg.src = `${selectedFrame.frameImg}?t=${Date.now()}`;
  });

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
