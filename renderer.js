
const { electronAPI } = window;

const closeBtn = document.getElementById('close-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const generateBtn = document.getElementById('generate-btn');
const textInput = document.getElementById('text-input');
const outputSection = document.getElementById('output-section');
const audioPlayer = document.getElementById('audio-player');
const loader = document.getElementById('loader');
const btnText = generateBtn.querySelector('.btn-text');

closeBtn.addEventListener('click', () => {
    electronAPI.closeWindow();
});

minimizeBtn.addEventListener('click', () => {
    electronAPI.minimizeWindow();
});

generateBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) return;

    // UI Feedback
    generateBtn.disabled = true;
    loader.style.display = 'block';
    btnText.textContent = 'Synthesizing...';
    outputSection.style.display = 'none';

    try {
     
        const audioPath = await electronAPI.generateTTS(text);
        // adding this to save audio
        audioPlayer.src = `file://${audioPath}`;
        outputSection.style.display = 'block';
        btnText.textContent = 'Generate Voice';
    } catch (error) {
        console.error('Synthesis failed:', error);
        alert('Failed to generate voice. Make sure UTAU engine is configured.');
        btnText.textContent = 'Generate Voice';
    } finally {
        generateBtn.disabled = false;
        loader.style.display = 'none';
    }
});
