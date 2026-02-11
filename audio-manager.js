// ========================================
// オーディオマネージャー
// ========================================

class AudioManager {
    constructor() {
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentBGM = null;
        this.isBGMEnabled = true;

        this.init();
    }

    init() {
        // BGMの作成（Web Audio APIを使用）
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // BGM用のマスターゲインノード
        this.bgmGainNode = this.audioContext.createGain();
        this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.audioContext.currentTime);
        this.bgmGainNode.connect(this.audioContext.destination);
    }

    // BGMのON/OFF切り替え
    toggleBGM() {
        this.isBGMEnabled = !this.isBGMEnabled;
        if (!this.isBGMEnabled) {
            this.stopBGM();
        }
        return this.isBGMEnabled;
    }

    // メニューBGM（明るく楽しい雰囲気）
    playMenuBGM() {
        this.stopBGM();
        if (!this.isBGMEnabled) return;

        this.currentBGM = this.createMelody([
            { freq: 523.25, duration: 0.3 }, // C5
            { freq: 587.33, duration: 0.3 }, // D5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 783.99, duration: 0.3 }, // G5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 587.33, duration: 0.3 }, // D5
            { freq: 523.25, duration: 0.6 }, // C5
        ], true);
    }

    // ゲームBGM（集中できる落ち着いた雰囲気）
    playGameBGM() {
        this.stopBGM();
        if (!this.isBGMEnabled) return;

        this.currentBGM = this.createMelody([
            { freq: 440.00, duration: 0.4 }, // A4
            { freq: 493.88, duration: 0.4 }, // B4
            { freq: 523.25, duration: 0.4 }, // C5
            { freq: 493.88, duration: 0.4 }, // B4
            { freq: 440.00, duration: 0.4 }, // A4
            { freq: 392.00, duration: 0.4 }, // G4
            { freq: 440.00, duration: 0.8 }, // A4
        ], true);
    }

    // 焦るBGM（テンポアップ）
    playHurryBGM() {
        this.stopBGM();
        if (!this.isBGMEnabled) return;

        this.currentBGM = this.createMelody([
            { freq: 440.00 * 1.2, duration: 0.2 }, // A4
            { freq: 493.88 * 1.2, duration: 0.2 }, // B4
            { freq: 523.25 * 1.2, duration: 0.2 }, // C5
            { freq: 493.88 * 1.2, duration: 0.2 }, // B4
            { freq: 440.00 * 1.2, duration: 0.2 }, // A4
            { freq: 392.00 * 1.2, duration: 0.2 }, // G4
            { freq: 440.00 * 1.2, duration: 0.4 }, // A4
        ], true);
    }

    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM = null;
        }
    }

    // メロディ作成ヘルパー
    createMelody(notes, loop = false) {
        let noteIndex = 0;
        let isPlaying = true;
        let timeoutId = null;

        const playNote = () => {
            if (!isPlaying || this.audioContext.state === 'suspended') return;

            const note = notes[noteIndex];
            const oscillator = this.audioContext.createOscillator();
            const noteGain = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(note.freq, this.audioContext.currentTime);

            // ノートごとのフェードアウト。マスターゲイン(this.bgmGainNode)に繋ぐ
            noteGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
            noteGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration);

            oscillator.connect(noteGain);
            noteGain.connect(this.bgmGainNode);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + note.duration);

            noteIndex = (noteIndex + 1) % notes.length;

            if (loop || noteIndex > 0) {
                timeoutId = setTimeout(playNote, note.duration * 1000);
            }
        };

        // AudioContextの再開処理（ブラウザ制限対策）
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        playNote();

        return {
            stop: () => {
                isPlaying = false;
                if (timeoutId) clearTimeout(timeoutId);
            }
        };
    }

    // 正解音（ビシッ）- コンボ時はきらびやかに
    playCorrectSound(combo = 0) {
        if (this.sfxVolume === 0 || this.audioContext.state === 'suspended') return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        if (combo >= 5) {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime);
        } else {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1600, this.audioContext.currentTime + 0.05);
            gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
        }

        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    // 単語正解時のSE
    playWordCorrectSound(combo = 0) {
        if (this.sfxVolume === 0 || this.audioContext.state === 'suspended') return;

        const isSuper = combo >= 5;
        const notes = isSuper
            ? [523.25, 659.25, 783.99, 1046.50]
            : [523.25, 659.25];

        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = isSuper ? 'sawtooth' : 'sine';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                gain.gain.setValueAtTime(this.sfxVolume * (isSuper ? 0.3 : 0.4), this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.start(this.audioContext.currentTime);
                osc.stop(this.audioContext.currentTime + 0.3);
            }, i * 80);
        });
    }

    // 不正解音
    playWrongSound() {
        if (this.sfxVolume === 0 || this.audioContext.state === 'suspended') return;

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

    setBGMVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.bgmGainNode) {
            this.bgmGainNode.gain.setTargetAtTime(this.bgmVolume, this.audioContext.currentTime, 0.1);
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    getBGMVolume() { return this.bgmVolume; }
    getSFXVolume() { return this.sfxVolume; }
}

const audioManager = new AudioManager();
