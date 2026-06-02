const playBtn = document.getElementById('play-btn');
const recordBtn = document.getElementById('record-btn');
const timeText = document.getElementById('time-text');
const bpmInput = document.getElementById('bpm-input');
const playhead = document.getElementById('playhead');
const projectKeySelect = document.getElementById('project-key');
const synthInstrumentSelect = document.getElementById('synth-instrument');
const fileMenu = document.getElementById('file-menu');
const fileImport = document.getElementById('file-import');
const micBtn = document.getElementById('mic-allow-btn');
const vocalPlayback = document.getElementById('vocal-playback');
if (vocalPlayback) {
    vocalPlayback.addEventListener('play', () => {
        initAudio();
        if (!vocalPlayback.connectedToWebAudio) {
            const src = audioCtx.createMediaElementSource(vocalPlayback);
            vocalPlayback.mediaSourceNode = src;
            vocalPlayback.connectedToWebAudio = true;
        }
        routeTrackSource(vocalPlayback.mediaSourceNode, '1');
    });
}
const splitBtn = document.getElementById('split-btn');
const saveBtn = document.getElementById('save-btn');
const projectTitle = document.getElementById('project-title');

const tracks = document.querySelectorAll('.track');
const panelTitle = document.getElementById('panel-title');
const viewAudio = document.getElementById('view-audio');
const viewKeys = document.getElementById('view-keys');
const viewDrums = document.getElementById('view-drums');
const tabInstrument = document.getElementById('tab-instrument');

const canvas = document.querySelector('.waveform-canvas');
const ctx = canvas.getContext('2d');
const tlTrack2 = document.getElementById('timeline-track-2');
const tlTrack3 = document.getElementById('timeline-track-3');

// Transport: undo/redo history
let undoStack = [], redoStack = [];
function pushUndo() { undoStack.push(JSON.parse(JSON.stringify(midiEvents))); redoStack = []; }
function applyUndo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.parse(JSON.stringify(midiEvents)));
    midiEvents = undoStack.pop();
    nextEventIdx = 0;
    renderPianoRoll();
}
function applyRedo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.parse(JSON.stringify(midiEvents)));
    midiEvents = redoStack.pop();
    nextEventIdx = 0;
    renderPianoRoll();
}
document.querySelector('.bx-undo').addEventListener('click', applyUndo);
document.querySelector('.bx-redo').addEventListener('click', applyRedo);
document.querySelector('.bx-skip-previous').addEventListener('click', () => {
    if (isPlaying) playBtn.click();
    startTime = performance.now();
    nextEventIdx = 0;
    currentX = 0;
    playhead.style.left = '10px';
    timeText.textContent = '00:00.0';
    document.querySelectorAll('audio').forEach(a => { a.currentTime = 0; });
});
document.querySelector('.bx-skip-next').addEventListener('click', () => {
    if (isPlaying) playBtn.click();
    let maxT = 0;
    midiEvents.forEach(ev => { if (ev.time > maxT) maxT = ev.time; });
    document.querySelectorAll('audio').forEach(a => { if (a.duration && !isNaN(a.duration)) maxT = Math.max(maxT, a.duration); });
    const bpm = parseFloat(bpmInput.value) || 90;
    currentX = maxT * (bpm / 60) * 100;
    startTime = performance.now() - maxT * 1000;
    playhead.style.left = `${10 + currentX}px`;
    timeText.textContent = formatTime(maxT * 1000);
});

let isPlaying = false;
let isRecording = false;
let isMetronomeOn = false;
let nextMetronomeBeatIdx = 0;
let startTime = 0;
let animationId;
let currentX = 0;
let activeTrackType = 'audio';
let activeTrackId = '1';

let midiEvents = [];
let nextEventIdx = 0;
let noteIdCounter = 0;

let audioCtx = null;
let tracksMuted = {};
let tracksSoloed = {};
let trackFxEnabled = {};
let mediaRecorder = null;
let audioChunks = [];
let micStream = null;
let analyser = null;
let dataArray = null;

let masterGain = null, masterFilter = null, masterPanner = null, masterReverb = null, wetNode = null, dryNode = null, dryMasterGain = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterFilter = audioCtx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 20000;
    masterPanner = audioCtx.createStereoPanner();
    masterReverb = audioCtx.createConvolver();
    
    const length = audioCtx.sampleRate * 2;
    const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (let i = 0; i < length; i++) {
        const n = Math.random() * 2 - 1;
        impulse.getChannelData(0)[i] = n * Math.pow(1 - i / length, 3);
        impulse.getChannelData(1)[i] = n * Math.pow(1 - i / length, 3);
    }
    masterReverb.buffer = impulse;
    
    dryNode = audioCtx.createGain();
    wetNode = audioCtx.createGain();
    dryNode.gain.value = 1;
    wetNode.gain.value = 0;
    
    masterGain.connect(masterFilter);
    masterFilter.connect(masterPanner);
    masterPanner.connect(dryNode);
    masterPanner.connect(masterReverb);
    masterReverb.connect(wetNode);
    dryNode.connect(audioCtx.destination);
    wetNode.connect(audioCtx.destination);
    
    dryMasterGain = audioCtx.createGain();
    dryMasterGain.gain.value = 1;
    dryMasterGain.connect(audioCtx.destination);
}

function routeTrackSource(src, trackId) {
    if (!src) return;
    try {
        src.disconnect();
    } catch(e) {}
    if (trackFxEnabled[trackId] === false) {
        if (dryMasterGain) src.connect(dryMasterGain);
        else src.connect(audioCtx.destination);
    } else {
        if (masterGain) src.connect(masterGain);
    }
}

const scales = [
    { name: 'C Major', root: 261.63, intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
    { name: 'D Minor', root: 293.66, intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
    { name: 'Eb Minor', root: 311.13, intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
    { name: 'G Major', root: 392.00, intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
    { name: 'A Minor', root: 220.00, intervals: [0, 2, 3, 5, 7, 8, 10, 12] }
];
let currentScaleIdx = 0;

function getFreq(root, semitones) {
    return root * Math.pow(2, semitones / 12);
}

function getInstrumentParams(name) {
    const defaults = { type: 'sine', attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5, filterFreq: 20000, detune: 0 };
    switch(name) {
        case 'basic-sine': return { ...defaults, type: 'sine' };
        case 'classic-saw': return { ...defaults, type: 'sawtooth', filterFreq: 5000, detune: 5 };
        case 'square-bass': return { ...defaults, type: 'square', attack: 0.05, filterFreq: 800, sustain: 0.8, release: 0.2 };
        case 'pluck-synth': return { ...defaults, type: 'sawtooth', attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.1, filterFreq: 3000 };
        case 'pad-synth': return { ...defaults, type: 'triangle', attack: 0.3, decay: 0.5, sustain: 0.8, release: 1.0, filterFreq: 1500 };
        case '8bit-lead': return { ...defaults, type: 'square', attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1, filterFreq: 20000 };
        case 'brass-synth': return { ...defaults, type: 'sawtooth', attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.4, filterFreq: 2500, detune: 10 };
        case 'crystal-bell': return { ...defaults, type: 'sine', attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.5, filterFreq: 6000 };
        default: return defaults;
    }
}

function playTone(freq, instrument = 'basic-sine', duration = 0.5, isPlayback = false, trackId = null) {
    initAudio();
    if (!isPlayback) {
        let id = null;
        if (isRecording) {
            id = `ev-${noteIdCounter++}`;
            midiEvents.push({ id, time: (performance.now() - startTime) / 1000, type: 'tone', trackId: activeTrackId, data: { freq, type: instrument, duration } });
            midiEvents.sort((a,b) => a.time - b.time);
            
            if (typeof viewMidiEditor !== 'undefined' && viewMidiEditor.style.display !== 'none') {
                renderPianoRoll();
            }
        }
        const targetTl = document.getElementById(`timeline-track-${activeTrackId}`) || tlTrack2;
        addMidiNote(targetTl, 'keys', id);
    }
    const p = getInstrumentParams(instrument);
    const now = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = p.type;
    osc.detune.value = p.detune || 0;
    osc.frequency.setValueAtTime(freq, now);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + p.attack);
    gain.gain.exponentialRampToValueAtTime(0.3 * p.sustain || 0.01, now + p.attack + p.decay);
    gain.gain.setValueAtTime(0.3 * p.sustain || 0.01, now + duration);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration + p.release);
    
    osc.connect(filter);
    filter.connect(gain);
    
    const targetTrackId = trackId || (isPlayback ? null : activeTrackId) || '2';
    if (trackFxEnabled[targetTrackId] === false) {
        gain.connect(dryMasterGain || audioCtx.destination);
    } else {
        gain.connect(masterGain);
    }
    
    osc.start(now);
    osc.stop(now + duration + p.release);
    
    if (instrument === 'classic-saw' || instrument === 'brass-synth') {
        const osc2 = audioCtx.createOscillator();
        osc2.type = p.type;
        osc2.detune.value = -p.detune;
        osc2.frequency.setValueAtTime(freq, now);
        osc2.connect(filter);
        osc2.start(now);
        osc2.stop(now + duration + p.release);
    }
}

function playDrum(type, isPlayback = false, trackId = null) {
    initAudio();
    if (!isPlayback) {
        let id = null;
        if (isRecording) {
            id = `ev-${noteIdCounter++}`;
            midiEvents.push({ id, time: (performance.now() - startTime) / 1000, type: 'drum', trackId: activeTrackId, data: { type } });
            midiEvents.sort((a,b) => a.time - b.time);
            
            if (typeof viewMidiEditor !== 'undefined' && viewMidiEditor.style.display !== 'none') {
                renderPianoRoll();
            }
        }
        const targetTl = document.getElementById(`timeline-track-${activeTrackId}`) || tlTrack3;
        addMidiNote(targetTl, 'drums', id);
    }
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    
    const targetTrackId = trackId || (isPlayback ? null : activeTrackId) || '3';
    if (trackFxEnabled[targetTrackId] === false) {
        gain.connect(dryMasterGain || audioCtx.destination);
    } else {
        gain.connect(masterGain);
    }

    if (type === 'kick') {
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.5);
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    } else if (type === 'snare') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, t);
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) output[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        noise.connect(noiseFilter);
        noiseFilter.connect(gain);
        noise.start(t);
    } else if (type === 'hihat') {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) output[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 7000;
        noise.connect(noiseFilter);
        noiseFilter.connect(gain);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        noise.start(t);
    }
}

function generateChordPads() {
    const scale = scales[currentScaleIdx];
    projectKeySelect.value = currentScaleIdx;
    const container = document.getElementById('chord-pads');
    container.innerHTML = '';
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    
    for (let i = 0; i < 8; i++) {
        const pad = document.createElement('div');
        pad.className = 'chord-pad';
        pad.textContent = numerals[i];
        pad.addEventListener('mousedown', () => {
            if (activeTrackType !== 'midi-keys') return;
            const root = getFreq(scale.root, scale.intervals[i]);
            const third = getFreq(scale.root, scale.intervals[(i + 2) % 7] + (i + 2 >= 7 ? 12 : 0));
            const fifth = getFreq(scale.root, scale.intervals[(i + 4) % 7] + (i + 4 >= 7 ? 12 : 0));
            const inst = synthInstrumentSelect.value;
            playTone(root, inst);
            playTone(third, inst);
            playTone(fifth, inst);
            pad.classList.add('active');
            setTimeout(() => pad.classList.remove('active'), 200);
        });
        container.appendChild(pad);
    }
}


function generatePianoKeys() {
    const container = document.getElementById('piano-keys');
    container.innerHTML = '';

    // 2 full octaves: C3–B3, C4–B4, plus final C5
    const octaves = [
        { label: 'C3', freqC: 130.81 },
        { label: 'C4', freqC: 261.63 }
    ];

    // Pattern: W B W B W W B W B W B W
    const pattern = [
        { semis: 0,  type: 'white', noteName: 'C', maps: ['z','a'] },
        { semis: 1,  type: 'black', noteName: 'C#', maps: ['x','w'] },
        { semis: 2,  type: 'white', noteName: 'D', maps: ['c','s'] },
        { semis: 3,  type: 'black', noteName: 'D#', maps: ['v','e'] },
        { semis: 4,  type: 'white', noteName: 'E', maps: ['b','d'] },
        { semis: 5,  type: 'white', noteName: 'F', maps: ['n','f'] },
        { semis: 6,  type: 'black', noteName: 'F#', maps: ['m','t'] },
        { semis: 7,  type: 'white', noteName: 'G', maps: [',','g'] },
        { semis: 8,  type: 'black', noteName: 'G#', maps: ['.','y'] },
        { semis: 9,  type: 'white', noteName: 'A', maps: ['/','h'] },
        { semis: 10, type: 'black', noteName: 'A#', maps: ['','u'] },
        { semis: 11, type: 'white', noteName: 'B', maps: ['','j'] },
    ];

    octaves.forEach((oct, octIdx) => {
        pattern.forEach(k => {
            const freq = oct.freqC * Math.pow(2, k.semis / 12);
            const map  = k.maps[octIdx] || '';
            const div  = document.createElement('div');
            div.className = `piano-key ${k.type} piano-key-lg`;
            div.dataset.key  = map;
            div.dataset.freq = freq.toFixed(4);
            if (k.type === 'white') {
                div.innerHTML = `<span class="key-label">${k.noteName}</span>${map ? `<span class="key-shortcut">${map.toUpperCase()}</span>` : ''}`;
            }
            div.addEventListener('mousedown', () => {
                if (activeTrackType !== 'midi-keys') return;
                playTone(freq, synthInstrumentSelect.value);
                div.classList.add('active');
                setTimeout(() => div.classList.remove('active'), 200);
            });
            container.appendChild(div);
        });
    });

    // Final C5
    const divC5 = document.createElement('div');
    divC5.className = 'piano-key white piano-key-lg';
    divC5.innerHTML = '<span class="key-label">C5</span>';
    divC5.addEventListener('mousedown', () => {
        if (activeTrackType !== 'midi-keys') return;
        playTone(523.25, synthInstrumentSelect.value);
        divC5.classList.add('active');
        setTimeout(() => divC5.classList.remove('active'), 200);
    });
    container.appendChild(divC5);
}


function generateDrumPads() {
    const container = document.getElementById('drum-pads');
    container.innerHTML = '';
    const names = ['Kick', 'Snare', 'HiHat', 'OpenHat', 'Clap', 'Tom 1', 'Tom 2', 'Crash'];
    for (let i = 0; i < 8; i++) {
        const pad = document.createElement('div');
        pad.className = 'drum-pad';
        pad.innerHTML = `<span>${names[i]}</span><span>[${i+1}]</span>`;
        pad.addEventListener('mousedown', () => {
            if (activeTrackType !== 'midi-drums') return;
            if (i === 0) playDrum('kick');
            else if (i === 1 || i === 4) playDrum('snare');
            else playDrum('hihat');
            pad.classList.add('active');
            setTimeout(() => pad.classList.remove('active'), 100);
        });
        container.appendChild(pad);
    }
}

function addMidiNote(trackElem, clz, eventId) {
    if (!isRecording && !isPlaying && !eventId) return;
    let midiRegion = trackElem.querySelector('.midi-region');
    if (!midiRegion) {
        midiRegion = document.createElement('div');
        midiRegion.className = `midi-region ${clz}`;
        midiRegion.style.left = '0px';
        midiRegion.style.width = '100%';
        trackElem.appendChild(midiRegion);
    }
    const note = document.createElement('div');
    note.className = `midi-note ${clz}`;
    note.style.left = `${currentX}px`;
    note.style.top = `${Math.random() * 60 + 10}px`;
    note.style.width = '15px';
    if (eventId) {
        note.dataset.id = eventId;
        note.draggable = true;
        note.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', eventId);
            e.dataTransfer.effectAllowed = 'move';
        });
    }
    midiRegion.appendChild(note);
}

projectKeySelect.addEventListener('change', e => {
    currentScaleIdx = parseInt(e.target.value);
    generateChordPads();
});

fileMenu.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 70%, 50%)`;
    
    const tId = `audio-${Date.now()}`;
    const newTrack = document.createElement('div');
    newTrack.className = 'track';
    newTrack.dataset.type = 'audio';
    newTrack.dataset.trackId = tId;
    newTrack.style.borderLeft = `4px solid ${color}`;
    newTrack.innerHTML = `<div class="track-controls"><button class="btn-m">M</button><button class="btn-s">S</button></div><div class="track-info"><i class='bx bx-file'></i> <span>${file.name}</span></div>`;
    
    newTrack.addEventListener('click', () => {
        document.querySelectorAll('.track').forEach(t => t.classList.remove('active'));
        newTrack.classList.add('active');
        activeTrackType = 'audio';
        viewAudio.style.display = 'block';
        viewKeys.style.display = 'none';
        viewDrums.style.display = 'none';
        document.getElementById('view-fx').style.display = 'none';
        if (typeof viewMidiEditor !== 'undefined') viewMidiEditor.style.display = 'none';
        panelTitle.innerHTML = "<i class='bx bx-file'></i> Imported Audio";
        document.querySelectorAll('.panel-tabs span').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-instrument').classList.add('active');
    });

    document.getElementById('track-list').appendChild(newTrack);
    
    const newTl = document.createElement('div');
    newTl.className = 'timeline-track';
    newTl.id = `timeline-track-${tId}`;
    newTl.style.background = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.1)`;
    newTl.innerHTML = `<audio class="imported-audio" src="${url}" style="display:none;" crossorigin="anonymous"></audio><canvas width="800" height="60" style="width:100%; height:60px; position:absolute; top:10px; pointer-events:none;"></canvas>`;
    document.getElementById('timeline-tracks').appendChild(newTl);
    
    initAudio();
    file.arrayBuffer().then(buf => audioCtx.decodeAudioData(buf)).then(audioBuf => {
        const c = newTl.querySelector('canvas');
        const cctx = c.getContext('2d');
        const data = audioBuf.getChannelData(0);
        const step = Math.ceil(data.length / c.width);
        cctx.fillStyle = color;
        for (let i = 0; i < c.width; i++) {
            let min = 1.0, max = -1.0;
            for (let j = 0; j < step; j++) {
                const val = data[(i * step) + j];
                if (val < min) min = val;
                if (val > max) max = val;
            }
            cctx.fillRect(i, (1 + min) * 30, 1, Math.max(1, (max - min) * 30));
        }
    }).catch(e => console.error('Waveform render error:', e));
    
    const audioEl = newTl.querySelector('audio');
    audioEl.addEventListener('play', () => {
        initAudio();
        if (!audioEl.connectedToWebAudio) {
            const src = audioCtx.createMediaElementSource(audioEl);
            audioEl.mediaSourceNode = src;
            audioEl.connectedToWebAudio = true;
        }
        const trackId = audioEl.closest('.timeline-track')?.id.replace('timeline-track-', '') || '1';
        routeTrackSource(audioEl.mediaSourceNode, trackId);
    });
    
    e.target.value = '';
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        playBtn.click();
        return;
    }
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isPlaying) {
            startTime -= 15000;
            document.querySelectorAll('audio').forEach(a => { if (!a.paused) a.currentTime += 15; });
        }
        return;
    }
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isPlaying) {
            startTime += 15000;
            if (startTime > performance.now()) startTime = performance.now();
            document.querySelectorAll('audio').forEach(a => { if (!a.paused) a.currentTime = Math.max(0, a.currentTime - 15); });
        }
        return;
    }
    
    if (activeTrackType === 'midi-keys') {
        // Build key→freq map from rendered piano keys
        const keyEl = document.querySelector(`.piano-key[data-key="${e.key.toLowerCase()}"]`);
        if (keyEl && !e.repeat) {
            keyEl.classList.add('active');
            // Find the freq from the octave/pattern data by matching dataset
            // Dispatch a real mousedown-equivalent by calling playTone directly
            // We stored freq in dataset when generating keys
            const freq = parseFloat(keyEl.dataset.freq);
            if (freq) {
                initAudio();
                playTone(freq, synthInstrumentSelect.value);
                if (isRecording) {
                    const elapsed = (performance.now() - startTime) / 1000;
                    const id = `ev-${noteIdCounter++}`;
                    midiEvents.push({ id, time: elapsed, type: 'tone', data: { freq, type: synthInstrumentSelect.value, duration: 0.5 } });
                    const tl = document.getElementById('timeline-track-2');
                    if (tl) addMidiNote(tl, 'keys', id);
                }
            }
        }
        return;
    }
    
    if (activeTrackType === 'midi-drums') {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 8) {
            const pads = document.querySelectorAll('.drum-pad');
            if (pads[num-1]) {
                pads[num-1].classList.add('active');
                setTimeout(() => pads[num-1].classList.remove('active'), 100);
                const types = ['kick','snare','hihat','openhat','clap','kick','snare','hihat'];
                initAudio();
                playDrum(types[num-1]);
                if (isRecording) {
                    const elapsed = (performance.now() - startTime) / 1000;
                    const id = `ev-${noteIdCounter++}`;
                    midiEvents.push({ id, time: elapsed, type: 'drum', data: { type: types[num-1] } });
                    const tl = document.getElementById('timeline-track-3');
                    if (tl) addMidiNote(tl, 'drums', id);
                }
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
    const keyEl = document.querySelector(`.piano-key[data-key="${e.key.toLowerCase()}"]`);
    if (keyEl) keyEl.classList.remove('active');
});

const viewFx = document.getElementById('view-fx');

document.querySelectorAll('.panel-tabs span').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tabs span').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        viewAudio.style.display = 'none';
        viewKeys.style.display = 'none';
        viewDrums.style.display = 'none';
        viewFx.style.display = 'none';
        if (typeof viewMidiEditor !== 'undefined' && viewMidiEditor) viewMidiEditor.style.display = 'none';
        
        if (tab.textContent === 'Fx Effects') {
            viewFx.style.display = 'flex';
        } else if (tab.textContent === 'MIDI Editor') {
            if (viewMidiEditor) {
                viewMidiEditor.style.display = 'flex';
                renderPianoRoll();
            }
        } else {
            if (activeTrackType === 'audio') viewAudio.style.display = 'block';
            else if (activeTrackType === 'midi-keys') viewKeys.style.display = 'flex';
            else if (activeTrackType === 'midi-drums') viewDrums.style.display = 'flex';
        }
    });
});

document.getElementById('filter-type').addEventListener('change', e => { if (masterFilter) masterFilter.type = e.target.value; });

tracks.forEach(track => {
    track.addEventListener('click', () => {
        tracks.forEach(t => t.classList.remove('active'));
        track.classList.add('active');
        activeTrackType = track.dataset.type;
        activeTrackId = track.dataset.trackId;

        document.querySelectorAll('.panel-tabs span').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-instrument').classList.add('active');

        viewAudio.style.display = 'none';
        viewKeys.style.display = 'none';
        viewDrums.style.display = 'none';
        viewFx.style.display = 'none';
        if (typeof viewMidiEditor !== 'undefined' && viewMidiEditor) viewMidiEditor.style.display = 'none';

        if (activeTrackType === 'audio') {
            panelTitle.innerHTML = "<i class='bx bx-microphone'></i> Vocals";
            viewAudio.style.display = 'block';
            tabInstrument.textContent = 'Audio Editor';
        } else if (activeTrackType === 'midi-keys') {
            panelTitle.innerHTML = "<i class='bx bxs-piano'></i> Synthesizer";
            viewKeys.style.display = 'flex';
            tabInstrument.textContent = 'Instrument';
        } else if (activeTrackType === 'midi-drums') {
            panelTitle.innerHTML = "<i class='bx bx-disc'></i> Drum Machine";
            viewDrums.style.display = 'flex';
            tabInstrument.textContent = 'Drum Machine';
        }
    });
});

micBtn.addEventListener('click', async () => {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(micStream);
        micBtn.textContent = 'Mic Ready! Click Red Record Button in Top Bar';
        micBtn.style.background = 'var(--accent)';
        
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            vocalPlayback.src = audioUrl;
            
            const buf = await audioBlob.arrayBuffer();
            const audioBuf = await audioCtx.decodeAudioData(buf);
            
            const drawWaveform = (canvasEl, color) => {
                if (!canvasEl) return;
                const cctx = canvasEl.getContext('2d');
                cctx.clearRect(0,0,canvasEl.width,canvasEl.height);
                const data = audioBuf.getChannelData(0);
                const step = Math.ceil(data.length / canvasEl.width);
                cctx.fillStyle = color;
                for (let i = 0; i < canvasEl.width; i++) {
                    let min = 1.0, max = -1.0;
                    for (let j = 0; j < step; j++) {
                        const val = data[(i * step) + j];
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                    cctx.fillRect(i, (1 + min) * (canvasEl.height/2), 1, Math.max(1, (max - min) * (canvasEl.height/2)));
                }
            };
            
            const vocalCanvas = document.getElementById('vocal-waveform');
            if (vocalCanvas) drawWaveform(vocalCanvas, '#ff7b89');
            
            const tl1 = document.getElementById('timeline-track-1');
            if (tl1) {
                let c = tl1.querySelector('canvas');
                if (!c) {
                    c = document.createElement('canvas');
                    c.width = 800; c.height = 60;
                    c.style.width = '100%'; c.style.height = '60px'; c.style.position = 'absolute'; c.style.top = '10px'; c.style.pointerEvents = 'none';
                    tl1.appendChild(c);
                }
                drawWaveform(c, '#ff7b89');
            }
            
            audioChunks = [];
        };
    } catch (e) {
        console.error(e);
        micBtn.textContent = 'Mic Access Denied';
    }
});

function formatTime(ms) {
    const ts = ms / 1000;
    const m = Math.floor(ts / 60);
    const s = Math.floor(ts % 60);
    const ms2 = Math.floor((ts % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms2}`;
}

function playMetronomeClick(beatIdx) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        const isDownbeat = (beatIdx % 4 === 0);
        osc.frequency.setValueAtTime(isDownbeat ? 1000 : 600, audioCtx.currentTime);
        osc.type = 'triangle';
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
        console.error('Metronome click error:', e);
    }
}

function updatePlayhead() {
    if (isPlaying || isRecording) {
        const elapsed = performance.now() - startTime;
        timeText.textContent = formatTime(elapsed);
        const bpm = parseFloat(bpmInput.value) || 90;
        currentX = (elapsed / 1000) * ((bpm / 60) * 100);
        playhead.style.left = `${10 + currentX}px`;

        if (isMetronomeOn) {
            const beatDuration = 60 / bpm;
            const currentSeconds = elapsed / 1000;
            const currentBeatTime = nextMetronomeBeatIdx * beatDuration;
            if (currentBeatTime <= currentSeconds) {
                playMetronomeClick(nextMetronomeBeatIdx);
                nextMetronomeBeatIdx++;
            }
        }

        if (isPlaying) {
            const currentSeconds = elapsed / 1000;
            while (nextEventIdx < midiEvents.length && midiEvents[nextEventIdx].time <= currentSeconds) {
                const ev = midiEvents[nextEventIdx];
                const tId = ev.trackId || (ev.type === 'tone' ? '2' : '3');
                const isAnySoloed = Object.values(tracksSoloed).some(v => v);
                const shouldMute = tracksMuted[tId] || (isAnySoloed && !tracksSoloed[tId]);
                if (!shouldMute) {
                    if (ev.type === 'tone') playTone(ev.data.freq, ev.data.type, ev.data.duration, true, tId);
                    else if (ev.type === 'drum') playDrum(ev.data.type, true, tId);
                }
                nextEventIdx++;
            }
        }

        if (isRecording && activeTrackType === 'audio') {
            if (currentX <= canvas.width) {
                let amp = Math.random() * 30 + 5;
                if (analyser && dataArray) {
                    analyser.getByteTimeDomainData(dataArray);
                    let maxVal = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        let v = Math.abs(dataArray[i] - 128);
                        if (v > maxVal) maxVal = v;
                    }
                    amp = (maxVal / 128) * (canvas.height / 2);
                    if (amp < 1) amp = 1;
                }
                ctx.strokeStyle = '#ff7b89';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(currentX, 40 - amp);
                ctx.lineTo(currentX, 40 + amp);
                ctx.stroke();
            }
        }
        animationId = requestAnimationFrame(updatePlayhead);
    }
}

playBtn.addEventListener('click', () => {
    const audios = document.querySelectorAll('audio');
    if (!isPlaying) {
        isPlaying = true;
        isRecording = false;
        startTime = performance.now();
        nextEventIdx = 0;
        nextMetronomeBeatIdx = 0;
        playBtn.className = 'bx bx-pause';
        playBtn.style.color = 'var(--accent)';
        audios.forEach(a => { a.currentTime = 0; a.play(); });
        updatePlayhead();
    } else {
        isPlaying = false;
        cancelAnimationFrame(animationId);
        playBtn.className = 'bx bx-play';
        playBtn.style.color = '';
        audios.forEach(a => a.pause());
    }
});

recordBtn.addEventListener('click', () => {
    if (!isRecording) {
        isRecording = true;
        isPlaying = false;
        startTime = performance.now();
        nextMetronomeBeatIdx = 0;
        midiEvents = [];
        document.querySelectorAll('.midi-region').forEach(e => e.innerHTML = '');
        if (activeTrackType === 'audio') ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (activeTrackType === 'audio' && mediaRecorder && mediaRecorder.state === 'inactive') {
            audioChunks = [];
            mediaRecorder.start();
        }

        recordBtn.style.color = 'red';
        recordBtn.classList.add('bx-burst');
        playBtn.className = 'bx bx-pause';
        updatePlayhead();
    } else {
        isRecording = false;
        cancelAnimationFrame(animationId);
        
        if (activeTrackType === 'audio' && mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }

        recordBtn.classList.remove('bx-burst');
        playBtn.className = 'bx bx-play';
    }
});

const metronomeBtn = document.getElementById('metronome-btn');
if (metronomeBtn) {
    metronomeBtn.addEventListener('click', () => {
        isMetronomeOn = !isMetronomeOn;
        if (isMetronomeOn) {
            metronomeBtn.style.color = 'var(--accent)';
            metronomeBtn.classList.add('bx-pulse');
        } else {
            metronomeBtn.style.color = '';
            metronomeBtn.classList.remove('bx-pulse');
        }
    });
}

bpmInput.addEventListener('change', e => {
    const width = (120 / e.target.value) * 100;
    document.querySelectorAll('.beat').forEach(b => b.style.width = `${width}px`);
});

splitBtn.addEventListener('click', () => {
    const trackElem = document.getElementById(`timeline-track-${activeTrackId}`);
    if (!trackElem) return;
    const notes = trackElem.querySelectorAll('.midi-note');
    notes.forEach(note => {
        const left = parseFloat(note.style.left);
        const width = parseFloat(note.style.width);
        const right = left + width;
        if (currentX > left && currentX < right) {
            const w1 = currentX - left;
            const w2 = right - currentX;
            note.style.width = `${w1}px`;
            
            const newNote = document.createElement('div');
            newNote.className = note.className;
            newNote.style.left = `${currentX}px`;
            newNote.style.top = note.style.top;
            newNote.style.width = `${w2}px`;
            note.parentElement.appendChild(newNote);
        }
    });
});

// Add Track modal
const addTrackModal = document.createElement('div');
addTrackModal.id = 'add-track-modal';
addTrackModal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;';
addTrackModal.innerHTML = `
  <div style="background:#1e1e2e; border:1px solid #444; border-radius:14px; padding:30px; min-width:340px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.8);">
    <h3 style="margin-bottom:6px; font-size:18px; color:#fff;">Add Track</h3>
    <p style="color:#888; font-size:13px; margin-bottom:24px;">Choose track type to add</p>
    <div style="display:flex; flex-direction:column; gap:12px;">
      <button id="add-synth-btn" class="btn" style="padding:14px; font-size:15px; background:linear-gradient(135deg,#6c5ce7,#a29bfe); border:none; border-radius:10px; color:white; cursor:pointer;"><i class='bx bxs-piano'></i>  Synth Track</button>
      <button id="add-drums-btn" class="btn" style="padding:14px; font-size:15px; background:linear-gradient(135deg,#e17055,#fd79a8); border:none; border-radius:10px; color:white; cursor:pointer;"><i class='bx bx-disc'></i>  Drum Track</button>
      <button id="add-library-btn" class="btn" style="padding:14px; font-size:15px; background:linear-gradient(135deg,#00b894,#00cec9); border:none; border-radius:10px; color:white; cursor:pointer;"><i class='bx bx-folder-open'></i>  From Library (Audio File)</button>
    </div>
    <button id="add-track-cancel" style="margin-top:18px; background:none; border:none; color:#888; cursor:pointer; font-size:13px;">Cancel</button>
  </div>
`;
document.body.appendChild(addTrackModal);

document.querySelector('.add-track').addEventListener('click', () => {
    addTrackModal.style.display = 'flex';
});
addTrackModal.addEventListener('click', e => {
    if (e.target === addTrackModal) addTrackModal.style.display = 'none';
});
document.getElementById('add-track-cancel').addEventListener('click', () => addTrackModal.style.display = 'none');
document.getElementById('add-library-btn').addEventListener('click', () => {
    addTrackModal.style.display = 'none';
    fileImport.click();
});

function addDynamicTrack(type) {
    addTrackModal.style.display = 'none';
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 70%, 55%)`;
    const tId = `${type}-${Date.now()}`;
    
    const newTrack = document.createElement('div');
    newTrack.className = 'track';
    newTrack.dataset.type = type === 'synth' ? 'midi-keys' : 'midi-drums';
    newTrack.dataset.trackId = tId;
    newTrack.style.borderLeft = `4px solid ${color}`;
    const icon = type === 'synth' ? 'bxs-piano' : 'bx-disc';
    const label = type === 'synth' ? 'Synth Track' : 'Drum Track';
    newTrack.innerHTML = `<div class="track-controls"><button class="btn-m">M</button><button class="btn-s">S</button></div><div class="track-info"><i class='bx ${icon}'></i> <span>${label}</span></div><div class="track-effects" style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted); background:var(--bg-dark); padding:4px 6px; border-radius:var(--radius-sm); margin-top:auto; cursor:pointer;"><span style="display:flex; align-items:center; gap:4px;"><i class='bx bx-slider-alt' style="color:var(--accent); font-size:12px;"></i> FX Effects</span><span style="font-size:9px; font-weight:700; color:var(--accent);">ON</span></div>`;
    
    newTrack.addEventListener('click', () => {
        document.querySelectorAll('.track').forEach(t => t.classList.remove('active'));
        newTrack.classList.add('active');
        activeTrackType = newTrack.dataset.type;
        activeTrackId = tId;
        
        document.querySelectorAll('.panel-tabs span').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-instrument').classList.add('active');
        viewAudio.style.display = 'none';
        viewKeys.style.display = 'none';
        viewDrums.style.display = 'none';
        viewFx.style.display = 'none';
        if (viewMidiEditor) viewMidiEditor.style.display = 'none';
        
        if (activeTrackType === 'midi-keys') {
            panelTitle.innerHTML = `<i class='bx bxs-piano'></i> Synthesizer`;
            viewKeys.style.display = 'flex';
            tabInstrument.textContent = 'Instrument';
        } else {
            panelTitle.innerHTML = `<i class='bx bx-disc'></i> Drum Machine`;
            viewDrums.style.display = 'flex';
            tabInstrument.textContent = 'Drum Machine';
        }
    });
    
    newTrack.addEventListener('dblclick', e => {
        if (e.target.tagName.toLowerCase() === 'span' && e.target.parentElement.classList.contains('track-info')) {
            e.target.contentEditable = true;
            e.target.focus();
            const range = document.createRange();
            range.selectNodeContents(e.target);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            const done = () => { e.target.contentEditable = false; };
            e.target.addEventListener('blur', done, { once: true });
            e.target.addEventListener('keydown', k => { if (k.key === 'Enter') { k.preventDefault(); done(); }}, { once: true });
            e.stopPropagation();
        }
    });
    
    document.getElementById('track-list').appendChild(newTrack);
    
    const newTl = document.createElement('div');
    newTl.className = 'timeline-track';
    newTl.id = `timeline-track-${tId}`;
    newTl.style.background = color + '22';
    document.getElementById('timeline-tracks').appendChild(newTl);
    makeTimelineTrackDroppable(newTl, tId, type === 'synth' ? 'keys' : 'drums');
    
    newTl.addEventListener('dblclick', () => {
        document.querySelectorAll('.panel-view').forEach(v => v.style.display = 'none');
        document.querySelectorAll('.panel-tabs span').forEach(t => t.classList.remove('active'));
        activeTrackId = tId;
        activeTrackType = newTrack.dataset.type;
        document.querySelectorAll('.track').forEach(t => t.classList.remove('active'));
        newTrack.classList.add('active');
        if (viewMidiEditor) viewMidiEditor.style.display = 'flex';
        renderPianoRoll();
    });
}
document.getElementById('add-synth-btn').addEventListener('click', () => addDynamicTrack('synth'));
document.getElementById('add-drums-btn').addEventListener('click', () => addDynamicTrack('drums'));

let isBouncing = false;
let bounceBuffersL = [];
let bounceBuffersR = [];
let bounceLength = 0;
let bounceProcessor = null;

saveBtn.addEventListener('click', () => {
    if (saveBtn.textContent.includes('Bouncing')) return;
    
    initAudio();
    if (!bounceProcessor) {
        bounceProcessor = audioCtx.createScriptProcessor(4096, 2, 2);
        dryNode.connect(bounceProcessor);
        wetNode.connect(bounceProcessor);
        bounceProcessor.connect(audioCtx.destination);
    }
    
    bounceBuffersL = [];
    bounceBuffersR = [];
    bounceLength = 0;
    isBouncing = true;
    
    bounceProcessor.onaudioprocess = e => {
        if (!isBouncing) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        bounceBuffersL.push(new Float32Array(left));
        bounceBuffersR.push(new Float32Array(right));
        bounceLength += left.length;
    };
    
    if (isPlaying) playBtn.click();
    
    saveBtn.innerHTML = "<i class='bx bx-loader bx-spin'></i> Bouncing...";
    
    playBtn.click(); // start playback
    
    let maxTime = 0;
    midiEvents.forEach(ev => { if (ev.time > maxTime) maxTime = ev.time; });
    document.querySelectorAll('audio').forEach(a => { if (a.duration && !isNaN(a.duration) && a.duration > maxTime) maxTime = a.duration; });
    if (maxTime === 0) maxTime = 5;
    
    setTimeout(() => {
        if (isPlaying) playBtn.click(); // stop playback
        isBouncing = false;
        bounceProcessor.onaudioprocess = null;
        
        const interleaved = new Float32Array(bounceLength * 2);
        let offset = 0;
        for (let i = 0; i < bounceBuffersL.length; i++) {
            const left = bounceBuffersL[i];
            const right = bounceBuffersR[i];
            for (let j = 0; j < left.length; j++) {
                interleaved[offset++] = left[j];
                interleaved[offset++] = right[j];
            }
        }
        
        const buffer = new ArrayBuffer(44 + interleaved.length * 2);
        const view = new DataView(buffer);
        const writeStr = (v, off, str) => { for (let i=0; i<str.length; i++) v.setUint8(off+i, str.charCodeAt(i)); };
        
        writeStr(view, 0, 'RIFF');
        view.setUint32(4, 36 + interleaved.length * 2, true);
        writeStr(view, 8, 'WAVE');
        writeStr(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 2, true);
        view.setUint32(24, audioCtx.sampleRate, true);
        view.setUint32(28, audioCtx.sampleRate * 4, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        writeStr(view, 36, 'data');
        view.setUint32(40, interleaved.length * 2, true);
        
        let outOffset = 44;
        for (let i = 0; i < interleaved.length; i++, outOffset += 2) {
            let s = Math.max(-1, Math.min(1, interleaved[i]));
            view.setInt16(outOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        
        const blob = new Blob([view], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mini-daw-mixdown.wav';
        a.click();
        
        saveBtn.innerHTML = "<i class='bx bx-save'></i> Save";
    }, (maxTime + 2) * 1000);
});

function makeTimelineTrackDroppable(tl, trackId, type) {
    tl.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    tl.addEventListener('drop', e => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData('text/plain');
        if (!eventId) return;
        const noteEl = document.querySelector(`.midi-note[data-id="${eventId}"]`);
        if (!noteEl) return;
        
        const targetType = type === 'keys' ? 'tone' : 'drum';
        let midiRegion = tl.querySelector('.midi-region');
        if (!midiRegion) {
            midiRegion = document.createElement('div');
            midiRegion.className = `midi-region ${targetType === 'tone' ? 'keys' : 'drums'}`;
            midiRegion.style.left = '0px';
            midiRegion.style.width = '100%';
            tl.appendChild(midiRegion);
        }
        
        const rect = tl.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        
        const bpm = parseFloat(bpmInput.value) || 90;
        const beatPx = (60 / bpm) * 100;
        
        const val = timeSigSelect ? timeSigSelect.value : '4/4';
        let snapUnit = 1.0;
        if (val === '1/4') snapUnit = 0.25;
        else if (val === '1/8') snapUnit = 0.125;
        const snapPx = beatPx * snapUnit;
        const snappedDropX = Math.round(dropX / snapPx) * snapPx;
        
        const ev = midiEvents.find(x => x.id === eventId);
        if (ev) {
            ev.trackId = trackId;
            if (ev.type !== targetType) {
                if (targetType === 'tone') {
                    ev.type = 'tone';
                    ev.data = { freq: 261.63, type: synthInstrumentSelect.value || 'basic-sine', duration: 0.5 };
                    noteEl.className = 'midi-note keys';
                } else if (targetType === 'drum') {
                    ev.type = 'drum';
                    ev.data = { type: 'kick' };
                    noteEl.className = 'midi-note drums';
                }
            }
            
            ev.time = Math.max(0, (snappedDropX / 100) / (bpm / 60));
            midiEvents.sort((a,b) => a.time - b.time);
            
            noteEl.style.left = `${snappedDropX}px`;
            noteEl.style.top = `${Math.random() * 60 + 10}px`;
        }
        midiRegion.appendChild(noteEl);
    });
}

if (typeof tlTrack2 !== 'undefined' && tlTrack2) makeTimelineTrackDroppable(tlTrack2, '2', 'keys');
if (typeof tlTrack3 !== 'undefined' && tlTrack3) makeTimelineTrackDroppable(tlTrack3, '3', 'drums');


const pitchVal = document.getElementById('pitch-val');

let activeKnob = null;

document.querySelectorAll('.knob').forEach(knob => {
    knob.addEventListener('mousedown', e => {
        activeKnob = knob;
        knob.dataset.startY = e.clientY;
        if (!knob.dataset.val && knob.id === 'pitch-knob') knob.dataset.val = 0;
        knob.dataset.startVal = knob.dataset.val;
    });
});

document.addEventListener('mousemove', e => {
    if (!activeKnob) return;
    const deltaY = activeKnob.dataset.startY - e.clientY;
    
    if (activeKnob.id === 'pitch-knob') {
        let newVal = parseFloat(activeKnob.dataset.startVal) + (deltaY / 5);
        if (newVal > 12) newVal = 12;
        if (newVal < -12) newVal = -12;
        activeKnob.dataset.val = newVal;
        const currentPitch = Math.round(newVal);
        
        const deg = (currentPitch / 12) * 135;
        activeKnob.querySelector('.knob-dot').style.transform = `rotate(${deg}deg)`;
        if (pitchVal) pitchVal.textContent = `${currentPitch} Semitones`;
        
        const rate = Math.pow(2, currentPitch / 12);
        const trackElem = document.getElementById(`timeline-track-${activeTrackId}`);
        if (trackElem) {
            const audioEl = trackElem.querySelector('audio');
            if (audioEl) {
                audioEl.preservesPitch = false;
                audioEl.playbackRate = rate;
            }
        }
    } else {
        const min = parseFloat(activeKnob.dataset.min);
        const max = parseFloat(activeKnob.dataset.max);
        const range = max - min;
        let newVal = parseFloat(activeKnob.dataset.startVal) + (deltaY / 100) * range;
        if (newVal > max) newVal = max;
        if (newVal < min) newVal = min;
        activeKnob.dataset.val = newVal;
        
        const pct = (newVal - min) / range;
        const deg = -135 + (pct * 270);
        activeKnob.querySelector('.knob-dot').style.transform = `rotate(${deg}deg)`;
        
        if (activeKnob.id === 'knob-filter-freq') {
            document.getElementById('val-filter-freq').textContent = `${Math.round(newVal)} Hz`;
            if (masterFilter) masterFilter.frequency.value = newVal;
        } else if (activeKnob.id === 'knob-pan-amt') {
            document.getElementById('val-pan-amt').textContent = `${newVal.toFixed(2)} C`;
            if (masterPanner) masterPanner.pan.value = newVal;
        } else if (activeKnob.id === 'knob-reverb-amt') {
            document.getElementById('val-reverb-amt').textContent = `${Math.round(newVal * 100)}%`;
            if (wetNode) {
                wetNode.gain.value = newVal;
                dryNode.gain.value = 1 - newVal;
            }
        }
    }
});

document.addEventListener('mouseup', () => activeKnob = null);

const timeSigSelect = document.getElementById('time-sig');
const viewMidiEditor = document.getElementById('view-midi-editor');
const prKeys = document.getElementById('pr-keys');
const prGrid = document.getElementById('pr-grid');

function updateGridVisuals() {
    if (!timeSigSelect) return;
    const val = timeSigSelect.value;
    const bpm = parseFloat(bpmInput.value) || 90;
    const beatPx = (60 / bpm) * 100;
    
    let snapUnit = 1.0;
    if (val === '1/4') snapUnit = 0.25;
    else if (val === '1/8') snapUnit = 0.125;
    
    const snapPx = beatPx * snapUnit;
    
    if (prGrid) {
        prGrid.style.backgroundImage = `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `;
        prGrid.style.backgroundSize = `100% 20px, ${snapPx}px 100%`;
    }
    
    document.querySelectorAll('.timeline-track').forEach(track => {
        track.style.backgroundImage = `linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`;
        track.style.backgroundSize = `${snapPx}px 100%`;
    });
}

if (timeSigSelect) {
    timeSigSelect.addEventListener('change', updateGridVisuals);
}
if (bpmInput) {
    bpmInput.addEventListener('input', updateGridVisuals);
}
updateGridVisuals();

function renderPianoRoll() {
    if (!prKeys || !prGrid) return;
    prKeys.innerHTML = '';
    prGrid.innerHTML = '';
    
    const notes = ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'];
    let html = '';
    for (let oct = 5; oct >= 3; oct--) {
        notes.forEach(n => {
            const isBlack = n.includes('#');
            html += `<div class="pr-key ${isBlack ? 'black' : 'white'}">${n}${oct}</div>`;
        });
    }
    prKeys.innerHTML = html;
    
    updateGridVisuals();
    
    const trackType = activeTrackId === '2' ? 'tone' : 'drum';
    midiEvents.filter(e => e.type === trackType).forEach(ev => {
        const div = document.createElement('div');
        div.className = 'pr-note';
        div.dataset.id = ev.id;
        div.style.left = `${ev.time * 100}px`;
        div.style.width = '30px';
        
        let y = 0;
        if (ev.type === 'tone') {
            const dist = Math.round(12 * Math.log2(ev.data.freq / 440));
            y = (3 - dist) * 20;
        } else {
            const drumnames = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom1', 'tom2', 'crash'];
            const idx = drumnames.indexOf(ev.data.type);
            y = (idx === -1 ? 0 : idx) * 20;
        }
        
        div.style.top = `${y}px`; 
        
        // Add custom drag/move logic for piano roll notes!
        div.addEventListener('mousedown', e => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const initialLeft = parseFloat(div.style.left) || 0;
            const initialTop = parseFloat(div.style.top) || 0;
            
            let moved = false;
            
            function onMouseMove(moveEv) {
                moved = true;
                const deltaX = moveEv.clientX - startX;
                const deltaY = moveEv.clientY - startY;
                
                const bpm = parseFloat(bpmInput.value) || 90;
                const beatPx = (60 / bpm) * 100;
                const val = timeSigSelect ? timeSigSelect.value : '4/4';
                let snapUnit = 1.0;
                if (val === '1/4') snapUnit = 0.25;
                else if (val === '1/8') snapUnit = 0.125;
                const snapPx = beatPx * snapUnit;
                
                const rawNewLeft = initialLeft + deltaX;
                const snappedLeft = Math.round(rawNewLeft / snapPx) * snapPx;
                div.style.left = `${Math.max(0, snappedLeft)}px`;
                
                const rawNewTop = initialTop + deltaY;
                const snappedTop = Math.round(rawNewTop / 20) * 20;
                div.style.top = `${Math.max(0, Math.min(700, snappedTop))}px`;
            }
            
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                if (moved) {
                    const finalLeft = parseFloat(div.style.left) || 0;
                    const finalTop = parseFloat(div.style.top) || 0;
                    const evId = div.dataset.id;
                    
                    const evObj = midiEvents.find(x => x.id === evId);
                    if (evObj) {
                        evObj.time = finalLeft / 100;
                        
                        const rowIdx = Math.round(finalTop / 20);
                        if (evObj.type === 'tone') {
                            evObj.data.freq = rowToFreq(rowIdx);
                        } else {
                            const drumnames = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom1', 'tom2', 'crash'];
                            evObj.data.type = drumnames[rowIdx % 8] || 'kick';
                        }
                        
                        midiEvents.sort((a,b) => a.time - b.time);
                        
                        // Update timeline note position!
                        const tlNote = document.querySelector(`.midi-note[data-id="${evId}"]`);
                        if (tlNote) {
                            const bpm = parseFloat(bpmInput.value) || 90;
                            const dropX = evObj.time * (bpm / 60) * 100;
                            tlNote.style.left = `${dropX}px`;
                        }
                    }
                    renderPianoRoll();
                }
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        prGrid.appendChild(div);
    });
}

const notesArr = ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'];
function rowToFreq(rowIdx) {
    const oct = 5 - Math.floor(rowIdx / 12);
    const noteName = notesArr[rowIdx % 12];
    const noteMap = { 'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2 };
    const distFromA4 = noteMap[noteName] + (oct - 4) * 12;
    return 440 * Math.pow(2, distFromA4 / 12);
}

function handleGridDblClick(clientX, clientY, target) {
    if (target.classList.contains('pr-note')) {
        const evId = target.dataset.id;
        const idx = midiEvents.findIndex(m => m.id === evId);
        if (idx !== -1) midiEvents.splice(idx, 1);
        renderPianoRoll();
        
        const tlnote = document.querySelector(`.midi-note[data-id="${evId}"]`);
        if (tlnote) tlnote.remove();
        return;
    }
    
    const rect = prGrid.getBoundingClientRect();
    const x = clientX - rect.left + prGrid.scrollLeft;
    const y = clientY - rect.top + prGrid.scrollTop;
    
    const bpm = parseFloat(bpmInput.value) || 90;
    const beatPx = (60 / bpm) * 100;
    
    const val = timeSigSelect ? timeSigSelect.value : '4/4';
    let snapUnit = 1.0;
    if (val === '1/4') snapUnit = 0.25;
    else if (val === '1/8') snapUnit = 0.125;
    
    const snapPx = beatPx * snapUnit;
    const snappedX = Math.round(x / snapPx) * snapPx;
    
    const time = snappedX / 100;
    const rowIdx = Math.floor(y / 20);
    
    const id = `ev-${noteIdCounter++}`;
    const trackType = activeTrackId === '2' ? 'tone' : 'drum';
    
    if (trackType === 'tone') {
        const freq = rowToFreq(rowIdx);
        midiEvents.push({ id, time, type: 'tone', trackId: activeTrackId, data: { freq, type: synthInstrumentSelect.value || 'basic-sine', duration: 0.5 } });
    } else {
        const drumnames = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom1', 'tom2', 'crash'];
        const dType = drumnames[rowIdx % 8] || 'kick';
        midiEvents.push({ id, time, type: 'drum', trackId: activeTrackId, data: { type: dType } });
    }
    
    midiEvents.sort((a,b) => a.time - b.time);
    
    const tl = document.getElementById(`timeline-track-${activeTrackId}`) || (trackType === 'tone' ? tlTrack2 : tlTrack3);
    addMidiNote(tl, trackType === 'tone' ? 'keys' : 'drums', id);
    
    const tlNote = tl.querySelector(`.midi-note[data-id="${id}"]`);
    if (tlNote) {
        const bpm = parseFloat(bpmInput.value) || 90;
        const dropX = time * (bpm / 60) * 100;
        tlNote.style.left = `${dropX}px`;
    }
    
    renderPianoRoll();
}

if (prGrid) {
    prGrid.addEventListener('dblclick', e => {
        handleGridDblClick(e.clientX, e.clientY, e.target);
    });
    
    let lastTap = 0;
    prGrid.addEventListener('touchstart', e => {
        const now = performance.now();
        if (now - lastTap < 300) {
            e.preventDefault();
            const touch = e.touches[0];
            handleGridDblClick(touch.clientX, touch.clientY, touch.target);
        }
        lastTap = now;
    });
}

[tlTrack2, tlTrack3].forEach(tl => {
    tl.addEventListener('dblclick', () => {
        document.querySelectorAll('.panel-view').forEach(v => v.style.display = 'none');
        document.querySelectorAll('.panel-tabs span').forEach(t => t.classList.remove('active'));
        
        activeTrackId = tl.id === 'timeline-track-2' ? '2' : '3';
        activeTrackType = tl.id === 'timeline-track-2' ? 'midi-keys' : 'midi-drums';
        document.querySelectorAll('.track').forEach(t => t.classList.remove('active'));
        const activeT = document.querySelector(`.track[data-track-id="${activeTrackId}"]`);
        if (activeT) activeT.classList.add('active');
        
        if (viewMidiEditor) viewMidiEditor.style.display = 'flex';
        renderPianoRoll();
    });
});

generateChordPads();
generatePianoKeys();
generateDrumPads();

const resizer = document.getElementById('resizer');
const bottomPanel = document.getElementById('bottom-panel');
let isResizing = false;

resizer.addEventListener('mousedown', () => {
    isResizing = true;
    resizer.classList.add('active');
});

document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    bottomPanel.style.height = `${window.innerHeight - e.clientY}px`;
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        resizer.classList.remove('active');
    }
});

document.querySelectorAll('.track').forEach(t => {
    t.addEventListener('dblclick', e => {
        if (e.target.tagName.toLowerCase() === 'span' && e.target.parentElement.classList.contains('track-info')) {
            e.target.contentEditable = true;
            e.target.focus();
            const range = document.createRange();
            range.selectNodeContents(e.target);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            
            const finishEdit = () => {
                e.target.contentEditable = false;
                e.target.removeEventListener('blur', finishEdit);
                e.target.removeEventListener('keydown', keydownHandler);
            };
            const keydownHandler = (k) => {
                if (k.key === 'Enter') {
                    k.preventDefault();
                    finishEdit();
                }
            };
            e.target.addEventListener('blur', finishEdit);
            e.target.addEventListener('keydown', keydownHandler);
            e.stopPropagation();
        }
    });
});

document.getElementById('track-list').addEventListener('dblclick', e => {
    if (e.target.tagName.toLowerCase() === 'span' && e.target.parentElement.classList.contains('track-info')) {
        e.target.contentEditable = true;
        e.target.focus();
        const range = document.createRange();
        range.selectNodeContents(e.target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        
        const finishEdit = () => {
            e.target.contentEditable = false;
            e.target.removeEventListener('blur', finishEdit);
            e.target.removeEventListener('keydown', keydownHandler);
        };
        const keydownHandler = (k) => {
            if (k.key === 'Enter') {
                k.preventDefault();
                finishEdit();
            }
        };
        e.target.addEventListener('blur', finishEdit);
        e.target.addEventListener('keydown', keydownHandler);
        e.stopPropagation();
    }
});

document.querySelectorAll('.fx-toggle').forEach(toggle => {
    toggle.addEventListener('click', e => {
        const target = e.target.dataset.target;
        const isActive = e.target.classList.contains('active');
        
        if (isActive) {
            e.target.classList.remove('active');
            e.target.style.background = '#555';
            
            if (target === 'filter' && masterFilter) {
                masterGain.disconnect(masterFilter);
                masterGain.connect(masterPanner);
            } else if (target === 'pan' && masterPanner) {
                masterFilter.disconnect(masterPanner);
                masterFilter.connect(masterReverb);
            } else if (target === 'reverb' && wetNode) {
                wetNode.gain.value = 0;
                dryNode.gain.value = 1;
            }
        } else {
            e.target.classList.add('active');
            e.target.style.background = '#f39c12';
            
            if (target === 'filter' && masterFilter) {
                masterGain.disconnect();
                masterGain.connect(masterFilter);
                masterFilter.connect(masterPanner);
            } else if (target === 'pan' && masterPanner) {
                masterFilter.disconnect();
                masterFilter.connect(masterPanner);
                masterPanner.connect(masterReverb);
            } else if (target === 'reverb' && wetNode) {
                const knob = document.getElementById('knob-reverb-amt');
                const val = parseFloat(knob.dataset.val) || 0;
                wetNode.gain.value = val;
                dryNode.gain.value = 1 - val;
            }
        }
    });
});

document.getElementById('track-list').addEventListener('click', e => {
    if (e.target.classList.contains('btn-m') || e.target.classList.contains('btn-s')) {
        const trackDiv = e.target.closest('.track');
        if (!trackDiv) return;
        const id = trackDiv.dataset.trackId || trackDiv.dataset.type;
        
        if (e.target.classList.contains('btn-m')) {
            tracksMuted[id] = !tracksMuted[id];
            e.target.style.background = tracksMuted[id] ? '#e74c3c' : 'var(--bg-dark)';
        } else {
            tracksSoloed[id] = !tracksSoloed[id];
            e.target.style.background = tracksSoloed[id] ? '#f1c40f' : 'var(--bg-dark)';
            e.target.style.color = tracksSoloed[id] ? 'black' : 'white';
        }
        
        const isAnySoloed = Object.values(tracksSoloed).some(v => v);
        document.querySelectorAll('.track').forEach(t => {
            const tId = t.dataset.trackId || t.dataset.type;
            const shouldMute = tracksMuted[tId] || (isAnySoloed && !tracksSoloed[tId]);
            const tlTrack = document.getElementById(`timeline-track-${tId}`);
            if (tlTrack) {
                tlTrack.querySelectorAll('audio').forEach(a => a.muted = shouldMute);
            }
            if (tId === '1') {
                const mainVoc = document.getElementById('vocal-playback');
                if (mainVoc) mainVoc.muted = shouldMute;
            }
        });
        e.stopPropagation();
    }
});

if (projectTitle) {
    projectTitle.addEventListener('dblclick', e => {
        e.target.contentEditable = true;
        e.target.focus();
        const range = document.createRange();
        range.selectNodeContents(e.target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        
        const finishEdit = () => {
            e.target.contentEditable = false;
            e.target.removeEventListener('blur', finishEdit);
            e.target.removeEventListener('keydown', keydownHandler);
        };
        const keydownHandler = (k) => {
            if (k.key === 'Enter') {
                k.preventDefault();
                finishEdit();
            }
        };
        e.target.addEventListener('blur', finishEdit);
        e.target.addEventListener('keydown', keydownHandler);
    });
}

// Open FX effects tab on track FX click (Single click) or Toggle effects ON/OFF (Triple click)
const trackListElem = document.getElementById('track-list');
if (trackListElem) {
    trackListElem.addEventListener('click', e => {
        const effectsBtn = e.target.closest('.track-effects');
        if (effectsBtn) {
            e.stopPropagation();
            const trackDiv = effectsBtn.closest('.track');
            if (!trackDiv) return;
            const tId = trackDiv.dataset.trackId || trackDiv.dataset.type;
            
            if (e.detail === 3) {
                // Triple click -> Toggle FX
                trackFxEnabled[tId] = !(trackFxEnabled[tId] !== false);
                const statusSpan = effectsBtn.querySelector('span:last-child');
                const icon = effectsBtn.querySelector('i');
                
                if (trackFxEnabled[tId]) {
                    if (statusSpan) {
                        statusSpan.textContent = 'ON';
                        statusSpan.style.color = 'var(--accent)';
                    }
                    if (icon) icon.style.color = 'var(--accent)';
                    effectsBtn.style.borderColor = 'var(--accent)';
                } else {
                    if (statusSpan) {
                        statusSpan.textContent = 'OFF';
                        statusSpan.style.color = '#e74c3c';
                    }
                    if (icon) icon.style.color = '#777';
                    effectsBtn.style.borderColor = '#444';
                }
                
                // Instantly update routing for playing audio elements on this track
                document.querySelectorAll('audio').forEach(audioEl => {
                    if (audioEl.mediaSourceNode) {
                        const audioTrackId = audioEl.closest('.timeline-track')?.id.replace('timeline-track-', '') || '1';
                        if (audioTrackId === tId) {
                            routeTrackSource(audioEl.mediaSourceNode, tId);
                        }
                    }
                });
            } else if (e.detail === 1) {
                // Single click -> Open FX panel
                const fxTab = Array.from(document.querySelectorAll('.panel-tabs span')).find(t => t.textContent.trim().includes('Fx Effects'));
                if (fxTab) {
                    fxTab.click();
                }
            }
        }
    });
}

// ── Premium Menu Modal Controllers ──
const menuModal = document.getElementById('menu-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function showModal(title, contentHtml) {
    if (!menuModal) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = contentHtml;
    menuModal.style.display = 'flex';
    setTimeout(() => menuModal.classList.add('active'), 10);
}

function hideModal() {
    if (!menuModal) return;
    menuModal.classList.remove('active');
    setTimeout(() => menuModal.style.display = 'none', 200);
}

if (modalClose) modalClose.addEventListener('click', hideModal);
if (menuModal) menuModal.addEventListener('click', e => { if (e.target === menuModal) hideModal(); });

// Edit Menu
const btnEdit = document.getElementById('menu-edit');
if (btnEdit) {
    btnEdit.addEventListener('click', () => {
        showModal('Edit Tools', `
            <div class="modal-item" onclick="hideModal(); document.getElementById('split-btn').click();">
                <div class="modal-item-info">
                    <span class="modal-item-title">Split Region</span>
                    <span class="modal-item-desc">Split active midi note at current playhead position</span>
                </div>
                <i class='bx bx-cut modal-item-action'></i>
            </div>
            <div class="modal-item" onclick="hideModal(); pushUndo(); midiEvents = []; renderPianoRoll();">
                <div class="modal-item-info">
                    <span class="modal-item-title">Clear Sequencer</span>
                    <span class="modal-item-desc">Clear all notes from piano roll and timeline</span>
                </div>
                <i class='bx bx-trash modal-item-action' style="color:#e74c3c;"></i>
            </div>
            <div class="modal-item" onclick="hideModal(); transposeNotes(1);">
                <div class="modal-item-info">
                    <span class="modal-item-title">Transpose +1 Semitone</span>
                    <span class="modal-item-desc">Shift all synth notes up by one half step</span>
                </div>
                <i class='bx bx-trending-up modal-item-action'></i>
            </div>
            <div class="modal-item" onclick="hideModal(); transposeNotes(-1);">
                <div class="modal-item-info">
                    <span class="modal-item-title">Transpose -1 Semitone</span>
                    <span class="modal-item-desc">Shift all synth notes down by one half step</span>
                </div>
                <i class='bx bx-trending-down modal-item-action'></i>
            </div>
        `);
    });
}

// Transpose function
window.transposeNotes = function(semitones) {
    pushUndo();
    midiEvents.forEach(ev => {
        if (ev.type === 'tone') {
            ev.data.freq = ev.data.freq * Math.pow(2, semitones / 12);
        }
    });
    renderPianoRoll();
};

// View Menu
const btnView = document.getElementById('menu-view');
if (btnView) {
    btnView.addEventListener('click', () => {
        showModal('View Configuration', `
            <div class="modal-item" onclick="hideModal(); toggleGridStyle();">
                <div class="modal-item-info">
                    <span class="modal-item-title">Toggle High Contrast Grid</span>
                    <span class="modal-item-desc">Make vertical grid subdivisions easier to see</span>
                </div>
                <i class='bx bx-grid-alt modal-item-action'></i>
            </div>
            <div class="modal-item" onclick="hideModal(); document.querySelectorAll('.waveform-canvas').forEach(c => c.style.opacity = c.style.opacity === '0.2' ? '1' : '0.2');">
                <div class="modal-item-info">
                    <span class="modal-item-title">Dim Waveform Display</span>
                    <span class="modal-item-desc">Reduce brightness of recorded vocal waveform</span>
                </div>
                <i class='bx bx-low-vision modal-item-action'></i>
            </div>
        `);
    });
}

window.toggleGridStyle = function() {
    const grid = document.getElementById('pr-grid');
    if (grid) {
        grid.classList.toggle('high-contrast-grid');
    }
};

// Settings Menu
const btnSettings = document.getElementById('menu-settings');
if (btnSettings) {
    btnSettings.addEventListener('click', () => {
        showModal('Project Settings', `
            <div class="modal-item" style="cursor:default;">
                <div class="modal-item-info">
                    <span class="modal-item-title">Sample Rate</span>
                    <span class="modal-item-desc">Dynamic output sample rate configured by web audio context</span>
                </div>
                <span style="font-weight:700; color:var(--accent); font-size:13px;">48000 Hz</span>
            </div>
            <div class="modal-item" style="cursor:default;">
                <div class="modal-item-info">
                    <span class="modal-item-title">Synthesizer Engine</span>
                    <span class="modal-item-desc">Polyphony, envelope triggers, and filter parameters</span>
                </div>
                <span style="font-weight:700; color:var(--accent); font-size:13px;">Active</span>
            </div>
            <div class="modal-item" style="cursor:default;">
                <div class="modal-item-info">
                    <span class="modal-item-title">Metronome Sound</span>
                    <span class="modal-item-desc">Click track during playback and recording</span>
                </div>
                <span style="font-weight:700; color:var(--accent); font-size:13px;">BEEP</span>
            </div>
        `);
    });
}

// Help Menu
const btnHelp = document.getElementById('menu-help');
if (btnHelp) {
    btnHelp.addEventListener('click', () => {
        showModal('Mini-DAW User Manual', `
            <div class="manual-section" style="font-size:13px; line-height:1.6; color:#ddd; display:flex; flex-direction:column; gap:12px;">
                <p>Welcome to <strong>Mini DAW Studio</strong>, a premium, low-latency web-based music production system!</p>
                
                <div>
                    <h4 style="color:#fff; margin-bottom:4px; font-weight:600;"><i class='bx bxs-keyboard' style="color:var(--accent);"></i> Physical Keyboards Play</h4>
                    <p style="color:#aaa; font-size:12px;">Use your physical keyboard to play notes in Octave 3 (keys <strong>Z X C V B N M , . /</strong>) and Octave 4 (keys <strong>A W S E D F T G Y H U J</strong>).</p>
                </div>
                
                <div>
                    <h4 style="color:#fff; margin-bottom:4px; font-weight:600;"><i class='bx bx-grid-alt' style="color:var(--accent);"></i> Grid Snapping</h4>
                    <p style="color:#aaa; font-size:12px;">Change snap resolution in the top bar (e.g. 1/4 Grid, 1/8 Grid). Double-click or double-tap inside the MIDI Editor grid to add notes snapped to these divisions.</p>
                </div>
                
                <div>
                    <h4 style="color:#fff; margin-bottom:4px; font-weight:600;"><i class='bx bx-slider-alt' style="color:var(--accent);"></i> FX Toggles</h4>
                    <p style="color:#aaa; font-size:12px;">Single click <strong>FX Effects</strong> button to focus FX. Triple click to toggle FX <strong>ON/OFF</strong> with real-time routing bypass!</p>
                </div>
                
                <div>
                    <h4 style="color:#fff; margin-bottom:4px; font-weight:600;"><i class='bx bx-move' style="color:var(--accent);"></i> Drag Notes</h4>
                    <p style="color:#aaa; font-size:12px;">Left click and drag notes inside the MIDI Editor or timeline tracks to easily reposition them with full grid snap precision.</p>
                </div>
            </div>
        `);
    });
}

