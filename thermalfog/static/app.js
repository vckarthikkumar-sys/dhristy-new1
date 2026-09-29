/**
 * THERMAL FOG VISION AI · COCKPIT HUD & INFRARED PERCEPTION ENGINE
 * Complete frontend logic preserving all Flask API connections, real-time
 * YOLOv8 inference, webcam streaming, synthetic simulation, telemetry, and animations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================
    let currentSample = null;
    let currentFile = null;
    let currentFileB64 = null;
    let systemClasses = {};
    let lastDetectionResult = null;
    let audioAlertsEnabled = true;
    let lastThreatState = "PATH CLEAR";

    // Streaming state
    let mediaStream = null;
    let streamInterval = null;
    let isProcessingFrame = false;
    let frameCount = 0;
    let lastFpsTime = Date.now();
    let simFrameIndex = 0;
    let currentStreamMode = 'none'; // 'none', 'webcam', 'sim'

    // Proximity + Temperature Sensor Telemetry State (Arduino Serial Monitor format)
    // Reference format: "Distance: 225.29 cm | MaxTemp: 31.25 C"
    const proximitySensorState = {
        mode: 'MOCK',
        distanceCm: 225.29,
        maxTempC: 31.25,
        unitDistance: 'cm',
        unitTemp: '°C',
        rawFrame: 'Distance: 225.29 cm | MaxTemp: 31.25 C',
        lastUpdated: Date.now()
    };

    // =========================================================================
    // DOM REFERENCES
    // =========================================================================
    // Navigation & Tabs
    const quickNavButtons = document.querySelectorAll('.quick-nav .nav-btn');
    const drawerNavItems = document.querySelectorAll('.drawer-nav .drawer-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const compatNavTabs = document.querySelectorAll('.nav-tab');

    // Menu Elements
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const menuBackdrop = document.getElementById('menuBackdrop');
    const menuDrawer = document.getElementById('menuDrawer');
    const menuCloseBtn = document.getElementById('menuCloseBtn');

    // Settings Modal
    const dockSettingsBtn = document.getElementById('dockSettingsBtn');
    const drawerSettingsBtn = document.getElementById('drawerSettingsBtn');
    const settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    const modalConfSlider = document.getElementById('modalConfSlider');
    const modalConfVal = document.getElementById('modalConfVal');
    const modalIouSlider = document.getElementById('modalIouSlider');
    const modalIouVal = document.getElementById('modalIouVal');
    const modalAudioToggle = document.getElementById('modalAudioToggle');
    const modalClaheToggle = document.getElementById('modalClaheToggle');
    const modalHeatmapToggle = document.getElementById('modalHeatmapToggle');

    // Audio Alert
    const audioAlertToggle = document.getElementById('audioAlertToggle');
    const audioIcon = document.getElementById('audioIcon');

    // Cockpit Header Elements
    const headerFeedMode = document.getElementById('headerFeedMode');
    const hazardPill = document.getElementById('hazardPill');
    const threatDot = document.getElementById('threatDot');
    const threatText = document.getElementById('threatText');
    const sysEngine = document.getElementById('sysEngine');
    const sysStatus = document.getElementById('sysStatus');
    const cockpitClock = document.getElementById('cockpitClock');

    // Stream & Camera Viewport Elements
    const streamContainer = document.getElementById('streamContainer');
    const webcamVideo = document.getElementById('webcamVideo');
    const streamFeed = document.getElementById('streamFeed');
    const hiddenCanvas = document.getElementById('hiddenCanvas');
    const streamPlaceholder = document.getElementById('streamPlaceholder');
    const streamStatusBadge = document.getElementById('streamStatusBadge');
    const streamFpsBadge = document.getElementById('streamFpsBadge');
    const streamIndicatorDot = document.getElementById('streamIndicatorDot');
    const hazardAlertBanner = document.getElementById('hazardAlertBanner');
    const hazardAlertMessage = document.getElementById('hazardAlertMessage');

    // HUD Data Badges
    const hudLatency = document.getElementById('hudLatency');
    const hudVisRange = document.getElementById('hudVisRange');
    const hudTau = document.getElementById('hudTau');
    const hudLaplacian = document.getElementById('hudLaplacian');
    const hudFogScore = document.getElementById('hudFogScore');
    const hudFogBarFill = document.getElementById('hudFogBarFill');
    const hudFogLevel = document.getElementById('hudFogLevel');
    const hudTargetCount = document.getElementById('hudTargetCount');
    const hudCntPed = document.getElementById('hudCntPed');
    const hudCntVeh = document.getElementById('hudCntVeh');
    const hudCntAnm = document.getElementById('hudCntAnm');
    const hudCntHeat = document.getElementById('hudCntHeat');

    // Proximity + Temperature Sensor HUD Elements
    const proximitySensorHud = document.getElementById('proximitySensorHud');
    const sensorStatusBadge = document.getElementById('sensorStatusBadge');
    const sensorDistanceVal = document.getElementById('sensorDistanceVal');
    const sensorMaxTempVal = document.getElementById('sensorMaxTempVal');

    // Floating Dock Buttons
    const btnToggleWebcam = document.getElementById('btnToggleWebcam');
    const btnToggleSim = document.getElementById('btnToggleSim');
    const btnStopStream = document.getElementById('btnStopStream');
    const btnQuickStartWebcam = document.getElementById('btnQuickStartWebcam');
    const btnQuickStartSim = document.getElementById('btnQuickStartSim');
    const quickEnhanceBtn = document.getElementById('quickEnhanceBtn');
    const quickFogMaskBtn = document.getElementById('quickFogMaskBtn');
    const btnFreezeFrame = document.getElementById('btnFreezeFrame');

    // Thermal Analysis View Elements
    const thermalAnalysisImg = document.getElementById('thermalAnalysisImg');
    const btnShowAnnotated = document.getElementById('btnShowAnnotated');
    const btnShowRaw = document.getElementById('btnShowRaw');
    const analysisFogScore = document.getElementById('analysisFogScore');
    const analysisFogLevel = document.getElementById('analysisFogLevel');
    const analysisFogTau = document.getElementById('analysisFogTau');
    const analysisFogVis = document.getElementById('analysisFogVis');
    const analysisFogLaplacian = document.getElementById('analysisFogLaplacian');
    const analysisContrast = document.getElementById('analysisContrast');
    const analysisMean = document.getElementById('analysisMean');

    // Detections View Elements
    const detectionsMainImage = document.getElementById('detectionsMainImage');
    const detLatencyMs = document.getElementById('detLatencyMs');
    const cntPedestrian = document.getElementById('cntPedestrian');
    const cntVehicle = document.getElementById('cntVehicle');
    const cntAnimal = document.getElementById('cntAnimal');
    const cntHeat = document.getElementById('cntHeat');
    const totalTargetsBadge = document.getElementById('totalTargetsBadge');
    const detectionsList = document.getElementById('detectionsList');
    const footerIou = document.getElementById('footerIou');
    const footerConf = document.getElementById('footerConf');

    // Telemetry View Elements
    const latencyMs = document.getElementById('latencyMs');
    const fogVisRange = document.getElementById('fogVisRange');
    const telemVisMeter = document.getElementById('telemVisMeter');
    const fogScore = document.getElementById('fogScore');
    const fogProgressBar = document.getElementById('fogProgressBar');
    const fogLevelText = document.getElementById('fogLevelText');
    const targetCount = document.getElementById('targetCount');
    const fogTau = document.getElementById('fogTau');
    const fogLaplacian = document.getElementById('fogLaplacian');
    const contrastVal = document.getElementById('contrastVal');
    const meanVal = document.getElementById('meanVal');
    const classBreakdown = document.getElementById('classBreakdown');

    // Workbench Elements
    const samplesContainer = document.getElementById('samplesContainer');
    const resultImage = document.getElementById('resultImage');
    const viewportPlaceholder = document.getElementById('viewportPlaceholder');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const datasetDropZone = document.getElementById('datasetDropZone');
    const datasetFileInput = document.getElementById('datasetFileInput');
    const confSlider = document.getElementById('confSlider');
    const confValue = document.getElementById('confValue');
    const iouSlider = document.getElementById('iouSlider');
    const iouValue = document.getElementById('iouValue');
    const enhanceToggle = document.getElementById('enhanceToggle');
    const fogMaskToggle = document.getElementById('fogMaskToggle');
    const btnRunDetection = document.getElementById('btnRunDetection');

    // =========================================================================
    // INITIALIZATION & CLOCK
    // =========================================================================
    initClock();
    initProximitySensor();
    fetchStatus();
    fetchSamples();

    // =========================================================================
    // PROXIMITY + TEMPERATURE SENSOR TELEMETRY (ARDUINO SERIAL FORMAT)
    // =========================================================================
    function initProximitySensor() {
        updateProximitySensorDisplay();
    }

    function updateProximitySensorDisplay(data = {}) {
        if (data.distanceCm !== undefined) proximitySensorState.distanceCm = Number(data.distanceCm);
        if (data.maxTempC !== undefined) proximitySensorState.maxTempC = Number(data.maxTempC);
        if (data.mode !== undefined) proximitySensorState.mode = String(data.mode);
        if (data.rawFrame !== undefined) proximitySensorState.rawFrame = String(data.rawFrame);
        proximitySensorState.lastUpdated = Date.now();

        if (sensorDistanceVal) {
            sensorDistanceVal.textContent = typeof proximitySensorState.distanceCm === 'number' 
                ? proximitySensorState.distanceCm.toFixed(2) 
                : proximitySensorState.distanceCm;
        }

        if (sensorMaxTempVal) {
            sensorMaxTempVal.textContent = typeof proximitySensorState.maxTempC === 'number' 
                ? proximitySensorState.maxTempC.toFixed(2) 
                : proximitySensorState.maxTempC;
        }

        if (sensorStatusBadge) {
            sensorStatusBadge.textContent = `SENSOR: ${proximitySensorState.mode}`;
            if (proximitySensorState.mode === 'LIVE' || proximitySensorState.mode === 'SERIAL') {
                sensorStatusBadge.classList.add('live');
                sensorStatusBadge.classList.add('badge-serial');
            } else {
                sensorStatusBadge.classList.remove('live');
                sensorStatusBadge.classList.remove('badge-serial');
            }
        }
    }

    // Expose a clean frontend API so Arduino serial data can be connected seamlessly later
    window.proximitySensor = {
        getState: () => ({ ...proximitySensorState }),
        update: (data) => updateProximitySensorDisplay(data),
        // Helper to parse Arduino serial string: "Distance: 225.29 cm | MaxTemp: 31.25 C"
        parseSerialLine: (line) => {
            if (!line || typeof line !== 'string') return null;
            const distMatch = line.match(/Distance:\s*([\d.]+)\s*cm/i);
            const tempMatch = line.match(/MaxTemp:\s*([\d.]+)\s*C/i);
            if (distMatch || tempMatch) {
                const updateObj = { rawFrame: line, mode: 'SERIAL' };
                if (distMatch) updateObj.distanceCm = parseFloat(distMatch[1]);
                if (tempMatch) updateObj.maxTempC = parseFloat(tempMatch[1]);
                updateProximitySensorDisplay(updateObj);
                return updateObj;
            }
            return null;
        }
    };

    function initClock() {
        function update() {
            const now = new Date();
            const hrs = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            const secs = String(now.getSeconds()).padStart(2, '0');
            if (cockpitClock) cockpitClock.textContent = `${hrs}:${mins}:${secs}`;
        }
        update();
        setInterval(update, 1000);
    }

    // =========================================================================
    // AUDIO SYNTHESIS ALERT (RADAR WARNING CHIME)
    // =========================================================================
    let audioCtx = null;
    function playHazardChime(isHighHazard = false) {
        if (!audioAlertsEnabled) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            const startTime = audioCtx.currentTime;
            
            if (isHighHazard) {
                osc.frequency.setValueAtTime(880, startTime);
                osc.frequency.setValueAtTime(1174, startTime + 0.1);
            } else {
                osc.frequency.setValueAtTime(659, startTime);
                osc.frequency.setValueAtTime(880, startTime + 0.1);
            }

            gain.gain.setValueAtTime(0.08, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        } catch (e) {
            // Audio context may require user interaction
        }
    }

    if (audioAlertToggle) {
        audioAlertToggle.addEventListener('click', () => {
            audioAlertsEnabled = !audioAlertsEnabled;
            if (audioAlertsEnabled) {
                audioAlertToggle.classList.add('active');
                audioIcon.className = 'fa-solid fa-volume-high';
                if (modalAudioToggle) modalAudioToggle.checked = true;
                playHazardChime(false);
            } else {
                audioAlertToggle.classList.remove('active');
                audioIcon.className = 'fa-solid fa-volume-xmark';
                if (modalAudioToggle) modalAudioToggle.checked = false;
            }
        });
    }

    // =========================================================================
    // CINEMATIC ANIMATED MENU LOGIC
    // =========================================================================
    function openMenu() {
        menuBackdrop.classList.add('open');
        menuToggleBtn.classList.add('open');
        document.body.classList.add('menu-open');
    }

    function closeMenu() {
        menuBackdrop.classList.remove('open');
        menuToggleBtn.classList.remove('open');
        document.body.classList.remove('menu-open');
    }

    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menuBackdrop.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    if (menuCloseBtn) {
        menuCloseBtn.addEventListener('click', closeMenu);
    }

    // Light-dismiss on backdrop click
    if (menuBackdrop) {
        menuBackdrop.addEventListener('click', (e) => {
            if (e.target === menuBackdrop) {
                closeMenu();
            }
        });
    }

    // Escape key closes menu and modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
            closeSettingsModal();
        }
    });

    // =========================================================================
    // VIEW & TAB NAVIGATION
    // =========================================================================
    function switchTab(targetTabId) {
        // Update Quick Nav
        quickNavButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === targetTabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update Drawer Nav
        drawerNavItems.forEach(item => {
            if (item.getAttribute('data-tab') === targetTabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Compat Nav Tabs
        compatNavTabs.forEach(t => {
            if (t.getAttribute('data-tab') === targetTabId) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Switch visible tab pane with smooth animation
        tabPanes.forEach(pane => {
            if (pane.id === targetTabId) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        // If switching to thermal or detections, ensure their image is synced
        if (lastDetectionResult) {
            syncDetectionResults(lastDetectionResult);
        }
    }

    quickNavButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            switchTab(target);
        });
    });

    drawerNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = item.getAttribute('data-tab');
            if (target) {
                e.preventDefault();
                switchTab(target);
                closeMenu();
            }
        });
    });

    compatNavTabs.forEach(t => {
        t.addEventListener('click', () => {
            switchTab(t.getAttribute('data-tab'));
        });
    });

    // =========================================================================
    // SETTINGS MODAL LOGIC
    // =========================================================================
    function openSettingsModal() {
        settingsModalBackdrop.classList.add('open');
    }

    function closeSettingsModal() {
        settingsModalBackdrop.classList.remove('open');
    }

    if (dockSettingsBtn) dockSettingsBtn.addEventListener('click', openSettingsModal);
    if (drawerSettingsBtn) {
        drawerSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeMenu();
            openSettingsModal();
        });
    }
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettingsModal);
    if (settingsModalBackdrop) {
        settingsModalBackdrop.addEventListener('click', (e) => {
            if (e.target === settingsModalBackdrop) closeSettingsModal();
        });
    }

    // Sync modal and main controls
    if (modalConfSlider && confSlider) {
        modalConfSlider.addEventListener('input', (e) => {
            confSlider.value = e.target.value;
            confValue.textContent = parseFloat(e.target.value).toFixed(2);
            modalConfVal.textContent = parseFloat(e.target.value).toFixed(2);
            if (footerConf) footerConf.textContent = parseFloat(e.target.value).toFixed(2);
        });
        confSlider.addEventListener('input', (e) => {
            modalConfSlider.value = e.target.value;
            confValue.textContent = parseFloat(e.target.value).toFixed(2);
            modalConfVal.textContent = parseFloat(e.target.value).toFixed(2);
            if (footerConf) footerConf.textContent = parseFloat(e.target.value).toFixed(2);
        });
    }

    if (modalIouSlider && iouSlider) {
        modalIouSlider.addEventListener('input', (e) => {
            iouSlider.value = e.target.value;
            iouValue.textContent = parseFloat(e.target.value).toFixed(2);
            modalIouVal.textContent = parseFloat(e.target.value).toFixed(2);
            if (footerIou) footerIou.textContent = parseFloat(e.target.value).toFixed(2);
        });
        iouSlider.addEventListener('input', (e) => {
            modalIouSlider.value = e.target.value;
            iouValue.textContent = parseFloat(e.target.value).toFixed(2);
            modalIouVal.textContent = parseFloat(e.target.value).toFixed(2);
            if (footerIou) footerIou.textContent = parseFloat(e.target.value).toFixed(2);
        });
    }

    if (modalClaheToggle && enhanceToggle) {
        modalClaheToggle.addEventListener('change', (e) => {
            enhanceToggle.checked = e.target.checked;
            if (quickEnhanceBtn) quickEnhanceBtn.classList.toggle('active', e.target.checked);
        });
        enhanceToggle.addEventListener('change', (e) => {
            modalClaheToggle.checked = e.target.checked;
            if (quickEnhanceBtn) quickEnhanceBtn.classList.toggle('active', e.target.checked);
        });
    }

    if (modalHeatmapToggle && fogMaskToggle) {
        modalHeatmapToggle.addEventListener('change', (e) => {
            fogMaskToggle.checked = e.target.checked;
            if (quickFogMaskBtn) quickFogMaskBtn.classList.toggle('active', e.target.checked);
        });
        fogMaskToggle.addEventListener('change', (e) => {
            modalHeatmapToggle.checked = e.target.checked;
            if (quickFogMaskBtn) quickFogMaskBtn.classList.toggle('active', e.target.checked);
        });
    }

    // Quick dock toggles
    if (quickEnhanceBtn && enhanceToggle) {
        quickEnhanceBtn.addEventListener('click', () => {
            enhanceToggle.checked = !enhanceToggle.checked;
            quickEnhanceBtn.classList.toggle('active', enhanceToggle.checked);
            if (modalClaheToggle) modalClaheToggle.checked = enhanceToggle.checked;
        });
    }

    if (quickFogMaskBtn && fogMaskToggle) {
        quickFogMaskBtn.addEventListener('click', () => {
            fogMaskToggle.checked = !fogMaskToggle.checked;
            quickFogMaskBtn.classList.toggle('active', fogMaskToggle.checked);
            if (modalHeatmapToggle) modalHeatmapToggle.checked = fogMaskToggle.checked;
        });
    }

    // =========================================================================
    // API: SYSTEM STATUS & SAMPLES FETCHING
    // =========================================================================
    function fetchStatus() {
        fetch('/api/status')
            .then(res => res.json())
            .then(data => {
                if (sysEngine) sysEngine.textContent = data.engine || 'PyTorch YOLOv8';
                if (sysStatus) sysStatus.textContent = data.status === 'online' ? 'ONLINE' : 'OFFLINE';
                systemClasses = data.classes || {};
                renderClassBreakdown();
            })
            .catch(err => console.error("System status API error:", err));
    }

    function fetchSamples() {
        fetch('/api/samples')
            .then(res => res.json())
            .then(samples => {
                if (!samplesContainer) return;
                samplesContainer.innerHTML = '';
                samples.forEach((sample, idx) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'sample-wrapper';

                    const img = document.createElement('img');
                    img.src = sample.url;
                    img.alt = sample.title;
                    img.className = 'sample-thumb';
                    img.title = `${sample.title} (${sample.dataset || 'Thermal Benchmark'}) - ${sample.desc}`;

                    if (idx === 0) {
                        img.classList.add('selected');
                        currentSample = sample.filename;
                    }

                    img.addEventListener('click', () => {
                        document.querySelectorAll('.sample-thumb').forEach(t => t.classList.remove('selected'));
                        img.classList.add('selected');
                        currentSample = sample.filename;
                        currentFile = null;
                        currentFileB64 = null;
                        runDetection();
                    });

                    wrapper.appendChild(img);
                    samplesContainer.appendChild(wrapper);
                });

                if (samples.length > 0) {
                    runDetection();
                }
            })
            .catch(err => console.error("Samples API error:", err));
    }

    function renderClassBreakdown() {
        if (!classBreakdown) return;
        classBreakdown.innerHTML = '';
        Object.entries(systemClasses).forEach(([id, name]) => {
            const row = document.createElement('div');
            row.className = 'info-row';
            row.innerHTML = `<span>Class ID ${id}:</span> <strong>${name}</strong>`;
            classBreakdown.appendChild(row);
        });
    }

    // =========================================================================
    // FILE UPLOAD & DATASET IMPORT
    // =========================================================================
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent-cyan)';
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--border-medium)';
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border-medium)';
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    function handleFileSelect(file) {
        currentFile = file;
        currentSample = null;
        document.querySelectorAll('.sample-thumb').forEach(t => t.classList.remove('selected'));
        
        const dropText = dropZone.querySelector('.drop-text');
        if (dropText) {
            dropText.innerHTML = `Selected: <span>${file.name}</span>`;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentFileB64 = e.target.result;
            runDetection();
        };
        reader.readAsDataURL(file);
    }

    if (datasetDropZone && datasetFileInput) {
        datasetDropZone.addEventListener('click', () => datasetFileInput.click());
        datasetDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            datasetDropZone.style.borderColor = 'var(--accent-amber)';
        });
        datasetDropZone.addEventListener('dragleave', () => {
            datasetDropZone.style.borderColor = 'rgba(245, 158, 11, 0.25)';
        });
        datasetDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            datasetDropZone.style.borderColor = 'rgba(245, 158, 11, 0.25)';
            if (e.dataTransfer.files.length > 0) {
                handleDatasetImport(e.dataTransfer.files);
            }
        });

        datasetFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleDatasetImport(e.target.files);
            }
        });
    }

    function handleDatasetImport(files) {
        const formData = new FormData();
        const dropText = datasetDropZone.querySelector('.drop-text');
        if (dropText) dropText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing dataset...';

        if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
            formData.append('dataset_zip', files[0]);
        } else {
            Array.from(files).forEach(f => formData.append('images', f));
        }

        fetch('/api/upload_dataset', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (dropText) dropText.innerHTML = `Imported <span>${data.files ? data.files.length : 0} dataset samples</span>`;
            fetchSamples();
        })
        .catch(err => {
            console.error("Dataset import error:", err);
            if (dropText) dropText.innerHTML = 'Upload <span>.ZIP Archive</span> or multi-images';
        });
    }

    // =========================================================================
    // INFERENCE ENGINE & DETECTION WORKFLOW
    // =========================================================================
    if (btnRunDetection) btnRunDetection.addEventListener('click', runDetection);

    function runDetection() {
        if (btnRunDetection) {
            btnRunDetection.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ANALYZING...';
            btnRunDetection.disabled = true;
        }

        let payload = {
            conf_threshold: parseFloat(confSlider ? confSlider.value : 0.25),
            iou_threshold: parseFloat(iouSlider ? iouSlider.value : 0.45),
            enhance_fog: enhanceToggle ? enhanceToggle.checked : true,
            show_fog_mask: fogMaskToggle ? fogMaskToggle.checked : true
        };

        if (currentFileB64) {
            payload.image_b64 = currentFileB64;
        } else if (currentSample) {
            payload.sample_path = currentSample;
        } else {
            if (btnRunDetection) {
                btnRunDetection.disabled = false;
                btnRunDetection.innerHTML = '<i class="fa-solid fa-bolt"></i> RUN THERMAL DETECTION';
            }
            return;
        }

        fetch('/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (btnRunDetection) {
                btnRunDetection.disabled = false;
                btnRunDetection.innerHTML = '<i class="fa-solid fa-bolt"></i> RUN THERMAL DETECTION';
            }

            if (data.error) {
                console.error("Detection error:", data.error);
                return;
            }

            lastDetectionResult = data;
            syncDetectionResults(data);
        })
        .catch(err => {
            console.error("Detection request failed:", err);
            if (btnRunDetection) {
                btnRunDetection.disabled = false;
                btnRunDetection.innerHTML = '<i class="fa-solid fa-bolt"></i> RUN THERMAL DETECTION';
            }
        });
    }

    // Synchronize all HUDs and view panes with inference data
    function syncDetectionResults(data) {
        if (!data) return;

        // 1. Update Images
        if (viewportPlaceholder) viewportPlaceholder.classList.add('hidden');
        if (resultImage) {
            resultImage.src = data.annotated_image;
            resultImage.classList.remove('hidden');
        }
        if (thermalAnalysisImg) {
            thermalAnalysisImg.src = data.annotated_image;
        }
        if (detectionsMainImage) {
            detectionsMainImage.src = data.annotated_image;
        }

        // If stream is stopped, we can also display the result on the main camera screen
        if (currentStreamMode === 'none') {
            if (streamPlaceholder) streamPlaceholder.classList.add('hidden');
            if (streamFeed) {
                streamFeed.src = data.annotated_image;
                streamFeed.classList.remove('hidden');
            }
            if (streamStatusBadge) {
                streamStatusBadge.textContent = 'IMAGE WORKBENCH · ACTIVE';
            }
            if (headerFeedMode) {
                headerFeedMode.textContent = 'IMAGE';
            }
        }

        // 2. Latency & Target Counts
        const latText = `${data.inference_time_ms} ms`;
        if (latencyMs) latencyMs.textContent = latText;
        if (hudLatency) hudLatency.textContent = latText;
        if (detLatencyMs) detLatencyMs.textContent = latText;

        const countText = data.target_count || 0;
        if (targetCount) targetCount.textContent = countText;
        if (hudTargetCount) hudTargetCount.textContent = countText;
        if (totalTargetsBadge) totalTargetsBadge.textContent = `${countText} TARGETS`;

        // 3. Category Breakdown
        const counts = data.category_counts || {};
        const peds = counts['PEDESTRIAN'] || 0;
        const vehs = counts['VEHICLE'] || 0;
        const anms = counts['ANIMAL'] || 0;
        const heat = counts['HEAT SIGNATURE'] || 0;

        if (cntPedestrian) cntPedestrian.textContent = peds;
        if (hudCntPed) hudCntPed.textContent = peds;
        if (cntVehicle) cntVehicle.textContent = vehs;
        if (hudCntVeh) hudCntVeh.textContent = vehs;
        if (cntAnimal) cntAnimal.textContent = anms;
        if (hudCntAnm) hudCntAnm.textContent = anms;
        if (cntHeat) cntHeat.textContent = heat;
        if (hudCntHeat) hudCntHeat.textContent = heat;

        // 4. Fog Physics Telemetry
        if (data.fog_info) {
            const fog = data.fog_info;
            const scoreStr = `${fog.score}%`;

            // Fog score
            if (fogScore) fogScore.textContent = scoreStr;
            if (hudFogScore) hudFogScore.textContent = scoreStr;
            if (analysisFogScore) analysisFogScore.textContent = scoreStr;

            // Fog level text & colors
            if (fogLevelText) {
                fogLevelText.textContent = fog.level;
                fogLevelText.style.color = fog.color;
            }
            if (hudFogLevel) {
                hudFogLevel.textContent = fog.level;
                hudFogLevel.style.color = fog.color;
            }
            if (analysisFogLevel) {
                analysisFogLevel.textContent = fog.level;
                analysisFogLevel.style.color = fog.color;
                analysisFogLevel.style.borderColor = fog.color + '44';
            }

            // Fog Progress Bars
            if (fogProgressBar) {
                fogProgressBar.style.width = scoreStr;
                fogProgressBar.style.backgroundColor = fog.color;
            }
            if (hudFogBarFill) {
                hudFogBarFill.style.width = scoreStr;
                hudFogBarFill.style.backgroundColor = fog.color;
            }

            // Visibility
            const visText = `${fog.visibility_meters}`;
            if (fogVisRange) fogVisRange.textContent = `${visText} m`;
            if (hudVisRange) hudVisRange.textContent = visText;
            if (analysisFogVis) analysisFogVis.textContent = visText;
            if (telemVisMeter) {
                const visPct = Math.min(100, Math.max(5, (fog.visibility_meters / 150) * 100));
                telemVisMeter.style.width = `${visPct}%`;
            }

            // Transmittance
            if (fogTau) fogTau.textContent = fog.transmittance_tau;
            if (hudTau) hudTau.textContent = fog.transmittance_tau;
            if (analysisFogTau) analysisFogTau.textContent = fog.transmittance_tau;

            // Blur & Contrast
            if (fogLaplacian) fogLaplacian.textContent = fog.laplacian_blur;
            if (hudLaplacian) hudLaplacian.textContent = fog.laplacian_blur;
            if (analysisFogLaplacian) analysisFogLaplacian.textContent = fog.laplacian_blur;
            if (contrastVal) contrastVal.textContent = fog.contrast_std;
            if (analysisContrast) analysisContrast.textContent = fog.contrast_std;
            if (meanVal) meanVal.textContent = fog.luminance_mean;
            if (analysisMean) analysisMean.textContent = fog.luminance_mean;
        }

        // 5. Threat Assessment & Sound Alert
        if (data.threat_level) {
            if (threatText) threatText.textContent = data.threat_level;
            
            // Check threat change
            if (data.threat_level !== lastThreatState) {
                if (data.threat_level.includes('HAZARD') || data.threat_level.includes('ALERT')) {
                    playHazardChime(true);
                } else if (data.threat_level.includes('CAUTION')) {
                    playHazardChime(false);
                }
                lastThreatState = data.threat_level;
            }

            // Header Pill styling
            if (hazardPill) {
                hazardPill.className = 'status-pill status-threat';
                if (data.threat_level.includes('HAZARD') || data.threat_level.includes('ALERT')) {
                    hazardPill.classList.add('threat-danger');
                } else if (data.threat_level.includes('CAUTION')) {
                    hazardPill.classList.add('threat-caution');
                }
            }

            // HUD Banner styling
            if (hazardAlertBanner) {
                hazardAlertBanner.className = 'hud-hazard-banner';
                if (data.threat_level.includes('HAZARD') || data.threat_level.includes('ALERT')) {
                    hazardAlertBanner.classList.add('visible', 'hazard-danger');
                    if (hazardAlertMessage) {
                        hazardAlertMessage.textContent = 'HIGH HAZARD ALERT · OBSTACLE IDENTIFIED IN LOW VISIBILITY';
                    }
                } else if (data.threat_level.includes('CAUTION')) {
                    hazardAlertBanner.classList.add('visible', 'hazard-caution');
                    if (hazardAlertMessage) {
                        hazardAlertMessage.textContent = 'CAUTION · THERMAL ATTENUATION OR TARGETS AHEAD';
                    }
                } else {
                    hazardAlertBanner.classList.remove('visible');
                }
            }
        }

        // 6. Detections List
        renderDetections(data.detections);
    }

    function renderDetections(detections) {
        if (!detectionsList) return;
        if (!detections || detections.length === 0) {
            detectionsList.innerHTML = `
                <div class="empty-list">
                    <i class="fa-solid fa-crosshairs radar-spin-slow"></i>
                    <p>No targets currently identified in sensor view.</p>
                </div>`;
            return;
        }

        detectionsList.innerHTML = '';
        detections.forEach((det, idx) => {
            const card = document.createElement('div');
            card.className = 'det-card';
            card.style.borderLeftColor = det.color || 'var(--accent-cyan)';
            card.style.animationDelay = `${idx * 40}ms`;

            card.innerHTML = `
                <div class="det-header">
                    <span style="color: ${det.color || '#00e5ff'}">
                        <i class="fa-solid ${det.icon || 'fa-crosshairs'}"></i> [${det.category}] ${det.class_name}
                    </span>
                    <span class="det-conf font-mono">${Math.round(det.confidence * 100)}%</span>
                </div>
                <div class="det-bbox font-mono">BBox: [${det.bbox.join(', ')}]</div>
            `;
            detectionsList.appendChild(card);
        });
    }

    // Toggle raw thermal image vs AI annotated in Thermal Analysis view
    if (btnShowAnnotated && btnShowRaw) {
        btnShowAnnotated.addEventListener('click', () => {
            btnShowAnnotated.classList.add('active');
            btnShowRaw.classList.remove('active');
            if (lastDetectionResult && thermalAnalysisImg) {
                thermalAnalysisImg.src = lastDetectionResult.annotated_image;
            }
        });
        btnShowRaw.addEventListener('click', () => {
            btnShowRaw.classList.add('active');
            btnShowAnnotated.classList.remove('active');
            if (lastDetectionResult && thermalAnalysisImg) {
                thermalAnalysisImg.src = lastDetectionResult.raw_image || lastDetectionResult.annotated_image;
            }
        });
    }

    // Freeze Frame & Inspect in Thermal Analysis
    if (btnFreezeFrame) {
        btnFreezeFrame.addEventListener('click', () => {
            if (lastDetectionResult) {
                switchTab('tab-thermal');
            } else {
                runDetection();
                switchTab('tab-thermal');
            }
        });
    }

    // =========================================================================
    // WEBCAM & SYNTHETIC THERMAL STREAMING ENGINE
    // =========================================================================
    if (btnToggleWebcam) btnToggleWebcam.addEventListener('click', toggleWebcam);
    if (btnQuickStartWebcam) btnQuickStartWebcam.addEventListener('click', toggleWebcam);
    if (btnToggleSim) btnToggleSim.addEventListener('click', toggleSim);
    if (btnQuickStartSim) btnQuickStartSim.addEventListener('click', toggleSim);
    if (btnStopStream) btnStopStream.addEventListener('click', stopStream);

    function toggleWebcam() {
        if (currentStreamMode === 'webcam') {
            stopStream();
        } else {
            startWebcamStream();
        }
    }

    function toggleSim() {
        if (currentStreamMode === 'sim') {
            stopStream();
        } else {
            startSimulatedStream();
        }
    }

    function updateStreamUI(mode, statusText, statusColor) {
        currentStreamMode = mode;
        if (btnToggleWebcam) btnToggleWebcam.classList.toggle('active', mode === 'webcam');
        if (btnToggleSim) btnToggleSim.classList.toggle('active', mode === 'sim');

        if (streamStatusBadge) {
            streamStatusBadge.textContent = statusText;
        }

        if (headerFeedMode) {
            headerFeedMode.textContent = mode === 'webcam' ? 'LIVE CAM' : (mode === 'sim' ? 'SIMULATOR' : 'READY');
        }

        if (streamIndicatorDot) {
            streamIndicatorDot.className = mode !== 'none' ? 'hud-dot dot-live' : 'hud-dot';
            if (statusColor) streamIndicatorDot.style.backgroundColor = statusColor;
        }
    }

    function stopStream() {
        if (streamInterval) {
            clearInterval(streamInterval);
            streamInterval = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        if (webcamVideo) {
            webcamVideo.pause();
            webcamVideo.srcObject = null;
            webcamVideo.classList.add('hidden');
        }

        if (streamFeed) {
            streamFeed.classList.add('hidden');
        }

        if (streamPlaceholder) {
            streamPlaceholder.classList.remove('hidden');
        }

        isProcessingFrame = false;
        updateStreamUI('none', 'CAMERA 01 · STANDBY', '#8c95a6');

        if (streamFpsBadge) streamFpsBadge.textContent = '-- FPS';
    }

    async function startWebcamStream() {
        stopStream();
        updateStreamUI('webcam', 'REQUESTING CAMERA...', '#f59e0b');

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            webcamVideo.srcObject = mediaStream;
            await webcamVideo.play();

            streamPlaceholder.classList.add('hidden');
            streamFeed.classList.remove('hidden');

            updateStreamUI('webcam', 'CAMERA 01 · LIVE STREAM', '#10b981');

            // Send frames for detection every 120ms (~8-10 FPS real inference)
            streamInterval = setInterval(() => processCameraFrame('webcam'), 120);

        } catch (err) {
            console.error("Camera access error:", err);
            alert("Camera access denied or device unavailable: " + err.message);
            stopStream();
        }
    }

    function startSimulatedStream() {
        stopStream();
        updateStreamUI('sim', 'SYNTHETIC THERMAL SIMULATOR', '#00e5ff');

        streamPlaceholder.classList.add('hidden');
        streamFeed.classList.remove('hidden');

        streamInterval = setInterval(() => processCameraFrame('sim'), 140);
    }

    function processCameraFrame(mode) {
        if (isProcessingFrame) return;
        isProcessingFrame = true;

        const ctx = hiddenCanvas.getContext('2d');
        hiddenCanvas.width = 640;
        hiddenCanvas.height = 480;

        if (mode === 'webcam') {
            if (webcamVideo.readyState < 2) {
                isProcessingFrame = false;
                return;
            }
            ctx.drawImage(webcamVideo, 0, 0, 640, 480);
        } else {
            // Generate high-fidelity synthetic LWIR frame
            simFrameIndex++;
            ctx.fillStyle = '#0a0512';
            ctx.fillRect(0, 0, 640, 480);

            // Cold asphalt roadway
            ctx.fillStyle = '#180a26';
            ctx.fillRect(0, 200, 640, 280);

            // Horizon gradient
            const grad = ctx.createLinearGradient(0, 160, 0, 240);
            grad.addColorStop(0, 'rgba(45, 10, 60, 0.4)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 160, 640, 80);

            // Moving pedestrian heat signature (crossing left to right)
            const posX = Math.sin(simFrameIndex * 0.07) * 180 + 320;
            ctx.fillStyle = '#ff2d55';
            ctx.beginPath();
            ctx.arc(posX, 240, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(posX - 14, 255, 28, 75);
            ctx.fillRect(posX - 10, 330, 8, 60);
            ctx.fillRect(posX + 2, 330, 8, 60);

            // Moving vehicle thermal signature
            const carX = (simFrameIndex * 6) % 840 - 120;
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(carX, 350, 120, 50);
            ctx.beginPath();
            ctx.arc(carX + 32, 400, 14, 0, Math.PI * 2);
            ctx.arc(carX + 88, 400, 14, 0, Math.PI * 2);
            ctx.fill();

            // Distant wildlife heat dot
            const animalX = 140 + Math.sin(simFrameIndex * 0.03) * 30;
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.arc(animalX, 220, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        const b64Image = hiddenCanvas.toDataURL('image/jpeg', 0.85);

        const payload = {
            image_b64: b64Image,
            conf_threshold: parseFloat(confSlider ? confSlider.value : 0.25),
            iou_threshold: parseFloat(iouSlider ? iouSlider.value : 0.45),
            enhance_fog: enhanceToggle ? enhanceToggle.checked : true,
            show_fog_mask: fogMaskToggle ? fogMaskToggle.checked : true
        };

        fetch('/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            isProcessingFrame = false;
            if (data.annotated_image && streamFeed) {
                streamFeed.src = data.annotated_image;
            }

            // Calculate FPS
            frameCount++;
            const now = Date.now();
            if (now - lastFpsTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
                if (streamFpsBadge) streamFpsBadge.textContent = `${fps} FPS`;
                frameCount = 0;
                lastFpsTime = now;
            }

            // Sync all HUD readouts
            lastDetectionResult = data;
            syncDetectionResults(data);
        })
        .catch(err => {
            console.error("Stream frame error:", err);
            isProcessingFrame = false;
        });
    }
});
