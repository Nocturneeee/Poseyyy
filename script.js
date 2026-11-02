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
  const templateGrid = document.getElementById('templateGrid');

  let stream = null;
  let currentFilter = 'none';
  let isMirrored = true;
  let currentLayout = 4;
  let shots = [];
  let selectedTemplate = null;

  // Templates configuration
  const templates = [
    {
      id: 'tebs-edition',
      name: 'TEBS Edition',
      category: 'strip',
      shots: 4,
      dimensions: '600 × 1800 (4-Cut)',
      imagePath: 'Photostrip/TEBS - EDITION.png',
      badge: 'Trending ✦',
      slots: [
        { x: 35, y: 110, width: 530, height: 375 },
        { x: 35, y: 525, width: 530, height: 375 },
        { x: 35, y: 940, width: 530, height: 375 },
        { x: 35, y: 1355, width: 530, height: 375 }
      ]
    }
  ];

  function initTemplates() {
    templateGrid.innerHTML = '';
    templates.forEach((tpl) => {
      const card = document.createElement('article');
      card.className = `template-card ${tpl.badge ? 'featured' : ''}`;
      card.dataset.type = tpl.category;
      card.dataset.id = tpl.id;

      card.innerHTML = `
        <div class="template-preview" style="background: url('${tpl.imagePath}') center/contain no-repeat #0b1329;">
          <div class="preview-badge">${tpl.badge || 'Frame'}</div>
        </div>
        <div class="template-info">
          <div>
            <h3>${tpl.name}</h3>
            <p>${tpl.dimensions} · ${tpl.shots} photos</p>
          </div>
          <button class="select-layout" data-id="${tpl.id}">Use layout <span>→</span></button>
        </div>
      `;

      card.querySelector('.select-layout').addEventListener('click', () => {
        selectTemplate(tpl);
      });

      templateGrid.appendChild(card);
    });

    if (templates.length > 0) {
      selectTemplate(templates[0]);
    }
  }

  function selectTemplate(tpl) {
    selectedTemplate = tpl;
    currentLayout = tpl.shots;
    totalShotsEl.textContent = currentLayout;
    resetSession();
    updateThumbsContainer();
    document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
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

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      document.querySelectorAll('.template-card').forEach(card => {
        const id = card.dataset.id;
        const tpl = templates.find(t => t.id === id);
        if (filter === 'all' || tpl.category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

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

  // Download photo strip with transparent frame on top
  downloadBtn.addEventListener('click', () => {
    if (shots.length === 0 || !selectedTemplate) return;

    const frameImg = new Image();
    frameImg.crossOrigin = 'anonymous';
    frameImg.onload = () => {
      const stripCanvas = document.createElement('canvas');
      const sCtx = stripCanvas.getContext('2d');

      stripCanvas.width = frameImg.width;
      stripCanvas.height = frameImg.height;

      // 1. Draw photos first (behind transparent frame windows)
      selectedTemplate.slots.forEach((slot, index) => {
        if (shots[index]) {
          drawCover(sCtx, shots[index], slot.x, slot.y, slot.width, slot.height);
        }
      });

      // 2. Draw transparent frame on top
      sCtx.drawImage(frameImg, 0, 0, stripCanvas.width, stripCanvas.height);

      // 3. Trigger download
      const link = document.createElement('a');
      link.download = `poseyyy-${selectedTemplate.id}-${Date.now()}.png`;
      link.href = stripCanvas.toDataURL('image/png');
      link.click();
    };
    frameImg.src = selectedTemplate.imagePath;
  });

  function drawCover(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const slotRatio = w / h;
    let renderW, renderH, offsetX, offsetY;

    if (imgRatio > slotRatio) {
      renderH = h;
      renderW = h * imgRatio;
      offsetX = x - (renderW - w) / 2;
      offsetY = y;
    } else {
      renderW = w;
      renderH = w / imgRatio;
      offsetX = x;
      offsetY = y - (renderH - h) / 2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
    ctx.restore();
  }

  initTemplates();
});
