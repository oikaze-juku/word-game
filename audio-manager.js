// ========================================
// オーディオマネージャー
// ========================================

class AudioManager {
    constructor() {
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.menuBGM = null;
        this.gameBGM = null;
        this.currentBGM = null;

        this.init();
    }

    init() {
        // BGMの作成（Web Audio APIを使用）
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 効果音の作成
        this.createSoundEffects();
    }

    // メニューBGM（明るく楽しい雰囲気）
    playMenuBGM() {
        this.stopBGM();
        if (this.bgmVolume === 0) return;

        this.currentBGM = this.createMelody([
            { freq: 523.25, duration: 0.3 }, // C5
            { freq: 587.33, duration: 0.3 }, // D5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 783.99, duration: 0.3 }, // G5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 587.33, duration: 0.3 }, // D5
            { freq: 523.25, duration: 0.6 }, // C5
        ], true, this.bgmVolume);
    }

    // ゲームBGM（集中できる落ち着いた雰囲気）
    playGameBGM() {
        this.stopBGM();
        if (this.bgmVolume === 0) return;

        this.currentBGM = this.createMelody([
            { freq: 440.00, duration: 0.4 }, // A4
            { freq: 493.88, duration: 0.4 }, // B4
            { freq: 523.25, duration: 0.4 }, // C5
            { freq: 493.88, duration: 0.4 }, // B4
            { freq: 440.00, duration: 0.4 }, // A4
            { freq: 392.00, duration: 0.4 }, // G4
            { freq: 440.00, duration: 0.8 }, // A4
        ], true, this.bgmVolume * 0.7);
    }

    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM = null;
        }
    }

    // メロディ作成ヘルパー
    createMelody(notes, loop = false, volume = 0.3) {
        let noteIndex = 0;
        let isPlaying = true;

        const playNote = () => {
            if (!isPlaying) return;

            const note = notes[noteIndex];
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(note.freq, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + note.duration);

            noteIndex = (noteIndex + 1) % notes.length;

            if (loop || noteIndex > 0) {
                setTimeout(playNote, note.duration * 1000);
            }
        };

        playNote();

        return {
            stop: () => {
                isPlaying = false;
            }
        };
    }

    createSoundEffects() {
        // 効果音は都度生成するため、ここでは何もしない
    }

    // 正解音（ビシッ）
    playCorrectSound() {
        if (this.sfxVolume === 0) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1600, this.audioContext.currentTime + 0.05);

        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // 不正解音（ブー）
    playWrongSound() {
        if (this.sfxVolume === 0) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // 音量設定
    setBGMVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    getBGMVolume() {
        return this.bgmVolume;
    }

    getSFXVolume() {
        return this.sfxVolume;
    }
}

// グローバルインスタンス
const audioManager = new AudioManager();
