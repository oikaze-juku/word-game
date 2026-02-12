// ========================================
// ゲーム状態管理
// ========================================
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    RESULT: 'result'
};

let currentState = GameState.MENU;
let selectedCategory = null;
let wordList = [];
let currentWordIndex = 0;
let currentWord = null;
let userAnswer = [];
let score = 0;
let timeRemaining = 60;
let timerInterval = null;
let mistakenWords = [];
let isCheckingAnswer = false;
let comboCount = 0;
let isPenaltyMode = false; // 不正解後のペナルティモード
let hurrying = false; // 焦るBGMフラグ

// ========================================
// DOM要素の取得
// ========================================
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');

const categoryGrid = document.getElementById('category-grid');
const startBtn = document.getElementById('start-btn');
const bgmVolumeSlider = document.getElementById('bgm-volume');
const sfxVolumeSlider = document.getElementById('sfx-volume');
const bgmVolumeValue = document.getElementById('bgm-volume-value');
const sfxVolumeValue = document.getElementById('sfx-volume-value');
const bgmToggleBtn = document.getElementById('bgm-toggle-btn');
const retireBtn = document.getElementById('retire-btn');

const timerDisplay = document.getElementById('timer');
const currentScoreDisplay = document.getElementById('current-score');
const questionText = document.getElementById('question-text');
const answerSlots = document.getElementById('answer-slots');
const answerArea = document.querySelector('.answer-area');
const letterButtons = document.getElementById('letter-buttons');
const questionArea = document.querySelector('.question-area');

const finalScoreDisplay = document.getElementById('final-score');
const reviewList = document.getElementById('review-list');
const retryBtn = document.getElementById('retry-btn');
const menuBtn = document.getElementById('menu-btn');

// ========================================
// 初期化
// ========================================
async function init() {
    const startOverlay = document.getElementById('start-overlay');

    // オーディオ初期化のイベント設定（一回限り）
    const unlockAudio = async () => {
        if (audioManager.audioContext.state === 'suspended') {
            await audioManager.audioContext.resume();
        }
        audioManager.playMenuBGM();
        startOverlay.classList.add('hidden');
        // イベント解除
        startOverlay.removeEventListener('click', unlockAudio);
    };

    startOverlay.addEventListener('click', unlockAudio);

    // 単語データの読み込み
    try {
        const response = await fetch('words.json');
        const data = await response.json();
        window.wordsData = data;
    } catch (error) {
        console.error('単語データの読み込みに失敗しました:', error);
        alert('単語データの読み込みに失敗しました。ページを再読み込みしてください。');
        return;
    }

    setupEventListeners();
}

function setupEventListeners() {
    // カテゴリーボタンの生成
    if (categoryGrid && window.wordsData) {
        categoryGrid.innerHTML = '';

        // コースIDと表示名・アイコンのマッピング
        const categoryMap = {
            "course1": { name: "時間・数・曜日", icon: "📅" },
            "course2": { name: "たべもの・家", icon: "🍎" },
            "course3": { name: "動物・自然・色", icon: "🐶" },
            "course4": { name: "学校・行事", icon: "🏫" },
            "course5": { name: "体・服・ようす", icon: "👕" },
            "course6": { name: "街・人・乗物", icon: "🚗" },
            "course7": { name: "身近なことば", icon: "💬" }
        };

        Object.keys(window.wordsData).forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.dataset.category = key;

            // マッピングがあればそれを使用、なければキーをそのまま表示
            const categoryInfo = categoryMap[key] || { name: key, icon: "📝" };

            btn.innerHTML = `
                <span class="category-icon">${categoryInfo.icon}</span>
                <span class="category-label">${categoryInfo.name}</span>
            `;

            btn.addEventListener('click', () => {
                const allBtns = categoryGrid.querySelectorAll('.category-btn');
                allBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedCategory = key;
                startBtn.disabled = false;
            });
            categoryGrid.appendChild(btn);
        });
    }

    // BGM音量設定
    bgmVolumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        audioManager.setBGMVolume(volume);
        bgmVolumeValue.textContent = e.target.value + '%';
    });

    // BGMトグルボタン
    if (bgmToggleBtn) {
        bgmToggleBtn.addEventListener('click', () => {
            const isEnabled = audioManager.toggleBGM();
            bgmToggleBtn.textContent = isEnabled ? '🔊' : '🔇';
            bgmToggleBtn.style.opacity = isEnabled ? '1' : '0.5';

            if (isEnabled) {
                if (currentState === GameState.MENU) audioManager.playMenuBGM();
                else if (currentState === GameState.PLAYING) {
                    if (hurrying) audioManager.playHurryBGM();
                    else audioManager.playGameBGM();
                }
            }
        });
    }

    // 効果音音量設定
    sfxVolumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        audioManager.setSFXVolume(volume);
        sfxVolumeValue.textContent = e.target.value + '%';
    });

    // ゲーム開始
    startBtn.addEventListener('click', startGame);

    // リタイア
    if (retireBtn) {
        retireBtn.addEventListener('click', endGame);
    }

    // リトライ
    retryBtn.addEventListener('click', startGame);

    // メニューに戻る
    menuBtn.addEventListener('click', () => {
        showScreen(GameState.MENU);
        resetGame();
    });
}

// ========================================
// 画面遷移
// ========================================
function showScreen(state) {
    currentState = state;

    startScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');

    switch (state) {
        case GameState.MENU:
            startScreen.classList.add('active');
            audioManager.playMenuBGM();
            break;
        case GameState.PLAYING:
            gameScreen.classList.add('active');
            audioManager.playGameBGM();
            break;
        case GameState.RESULT:
            resultScreen.classList.add('active');
            audioManager.stopBGM();
            break;
    }
}

// ========================================
// ゲーム開始
// ========================================
function startGame() {
    resetGame();

    wordList = [...window.wordsData[selectedCategory]];
    shuffleArray(wordList);

    currentWordIndex = 0;
    score = 0;
    comboCount = 0;
    timeRemaining = 60;
    hurrying = false;
    mistakenWords = [];

    showScreen(GameState.PLAYING);
    updateScore();
    startTimer();
    loadNextWord();
}

function resetGame() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    userAnswer = [];
    currentWord = null;
    isPenaltyMode = false;
    document.querySelector('.timer-display').classList.remove('warning');
    updateComboDisplay();
}

// ========================================
// タイマー
// ========================================
function startTimer() {
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 10 && !hurrying) {
            document.querySelector('.timer-display').classList.add('warning');
            hurrying = true;
            audioManager.playHurryBGM();
        }

        if (timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    timerDisplay.textContent = timeRemaining;
}

// ========================================
// 問題の読み込み
// ========================================
function loadNextWord() {
    if (currentWordIndex >= wordList.length) {
        shuffleArray(wordList);
        currentWordIndex = 0;
    }

    currentWord = wordList[currentWordIndex];
    currentWordIndex++;
    userAnswer = [];
    isPenaltyMode = false;

    questionText.textContent = currentWord.japanese;
    createAnswerSlots();
    createLetterButtons();
}

function createAnswerSlots() {
    answerSlots.innerHTML = '';
    const word = currentWord.english;
    const isLongWord = word.length >= 7;
    const needsWrap = word.length >= 10;

    // 10文字以上なら改行位置を決める
    let splitIndex = -1;
    if (word.length >= 10) {
        const middle = Math.floor(word.length / 2);
        // 真ん中付近のスペースを探す
        let bestSpaceIndex = -1;
        let minDistance = 100;

        for (let i = 0; i < word.length; i++) {
            if (word[i] === ' ') {
                const dist = Math.abs(i - middle);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestSpaceIndex = i;
                }
            }
        }

        // 適切なスペースがあればそこで改行（スペースの次の文字から2行目）
        if (bestSpaceIndex !== -1 && minDistance < 4) {
            splitIndex = bestSpaceIndex + 1;
        } else {
            // なければ単純に真ん中で切る
            splitIndex = middle;
        }
    }

    for (let i = 0; i < word.length; i++) {
        // 改行ポイントなら改行要素を挿入（splitIndexの直前で改行）
        if (splitIndex !== -1 && i === splitIndex) {
            const breakLine = document.createElement('div');
            breakLine.className = 'break-line'; // CSSでスタイル制御推奨
            breakLine.style.flexBasis = '100%';
            breakLine.style.height = '0';
            answerSlots.appendChild(breakLine);
        }

        const slot = document.createElement('div');
        slot.className = 'answer-slot';
        slot.dataset.index = i;

        // 7文字以上の単語は、最初の1文字だけヒントを表示
        if (isLongWord && i === 0) {
            slot.classList.add('hint');
            slot.dataset.hint = word[i].toLowerCase();
        }

        answerSlots.appendChild(slot);
    }
    updateAnswerSlots(); // 初期状態でアクティブスロットを設定
}

function createLetterButtons() {
    letterButtons.innerHTML = '';
    // スペースを除いた文字のリストを作成
    const letters = currentWord.english.replace(/\s+/g, '').split('');
    shuffleArray(letters);

    letters.forEach((letter, index) => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        btn.textContent = letter.toLowerCase();
        btn.dataset.letter = letter;
        btn.dataset.index = index;
        btn.addEventListener('click', () => handleLetterClick(btn));
        letterButtons.appendChild(btn);
    });
}

// ========================================
// 文字タップ処理
// ========================================
function handleLetterClick(btn) {
    if (isCheckingAnswer || btn.classList.contains('used')) return;

    const letter = btn.dataset.letter;

    // スペースを除いた正解文字列
    const targetString = currentWord.english.replace(/\s+/g, '');
    const currentIndex = userAnswer.length;

    // 正解の文字かチェック
    if (letter === targetString[currentIndex]) {
        audioManager.playCorrectSound(comboCount);
        userAnswer.push(letter);
        btn.classList.add('used');
        updateAnswerSlots();

        if (userAnswer.length === targetString.length) {
            checkAnswer();
        }
    } else {
        // 不正解
        if (!mistakenWords.some(w => w.english === currentWord.english)) {
            mistakenWords.push({
                japanese: currentWord.japanese,
                english: currentWord.english
            });
        }
        enterPenaltyMode();
    }
}

function enterPenaltyMode() {
    if (isPenaltyMode) {
        audioManager.playWrongSound();
        return; // すでにペナルティ中なら音だけ出す
    }

    isPenaltyMode = true;
    comboCount = 0; // コンボリセット
    updateComboDisplay();
    audioManager.playWrongSound();

    // 回答リセット
    userAnswer = [];
    const usedBtns = letterButtons.querySelectorAll('.letter-btn.used');
    usedBtns.forEach(b => b.classList.remove('used'));

    // スロットにヒントを表示（CSSで制御）
    const slots = answerSlots.querySelectorAll('.answer-slot');
    slots.forEach((slot, i) => {
        slot.textContent = '';
        slot.classList.remove('filled');
        slot.classList.add('hint');
        slot.dataset.hint = currentWord.english[i].toLowerCase();
        slot.classList.add('wrong'); // 一瞬赤くする
        setTimeout(() => slot.classList.remove('wrong'), 500);
    });

    if (answerArea) {
        answerArea.classList.add('wrong-flash');
        setTimeout(() => answerArea.classList.remove('wrong-flash'), 500);
    }
    updateAnswerSlots(); // ペナルティモードに入ったらスロットを更新してアクティブなスロットを再設定
}

function updateAnswerSlots() {
    const slots = answerSlots.querySelectorAll('.answer-slot');

    // 全スロットから active を削除
    slots.forEach(slot => slot.classList.remove('active'));

    // ユーザーが入力した文字を、スペースを飛ばしながらスロットに埋めていく
    let currentInputIdx = 0;
    for (let i = 0; i < currentWord.english.length; i++) {
        const char = currentWord.english[i];
        const slot = slots[i];

        if (char === ' ') {
            slot.classList.add('space');
            continue;
        }

        if (currentInputIdx < userAnswer.length) {
            slot.textContent = userAnswer[currentInputIdx].toLowerCase();
            slot.classList.add('filled');
            slot.classList.remove('hint');
            currentInputIdx++;
        } else {
            // 入力されていない非スペーススロットはクリア
            slot.textContent = '';
            slot.classList.remove('filled');
            // ヒントは残すか、ペナルティモードで再設定される
        }
    }

    // 次に入力すべき非スペーススロットを光らせる（アクティブ化）
    let foundNext = false;
    let filledNonSpaceCount = 0;
    for (let i = 0; i < currentWord.english.length; i++) {
        const char = currentWord.english[i];
        const slot = slots[i];

        if (char === ' ') {
            continue;
        }

        if (slot.classList.contains('filled')) {
            filledNonSpaceCount++;
        } else if (filledNonSpaceCount === userAnswer.length && !foundNext) {
            slot.classList.add('active');
            foundNext = true;
        }
    }
}

// ========================================
// 回答チェック
// ========================================
function checkAnswer() {
    const userWord = userAnswer.join('');
    const correctWord = currentWord.english.replace(/\s+/g, '');

    if (userWord === correctWord) {
        if (!isPenaltyMode) {
            // 累進的なコンボボーナス計算
            // ベース100点 + コンボ数に応じたボーナス
            let bonus = comboCount * 10;
            if (comboCount >= 5) bonus += (comboCount - 4) * 20;
            if (comboCount >= 10) bonus += (comboCount - 9) * 40;

            let gainedScore = Math.min(100 + bonus, 1500);
            score += gainedScore;
            comboCount++;
            showScorePopup(gainedScore, comboCount);
            audioManager.playWordCorrectSound(comboCount);
        } else {
            // ペナルティモード中は得点なし、音は控えめ
            audioManager.playWordCorrectSound(0);
        }

        // ここでは復習リストの追加は行わず、正解処理のみ
        updateScore();
        updateComboDisplay();

        isCheckingAnswer = true;
        setTimeout(() => {
            isCheckingAnswer = false;
            loadNextWord();
        }, 600);
    }
}

function showScorePopup(points, combo) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    let text = `+${points}`;
    if (combo >= 5) {
        text += ` Combo!`;
        popup.style.color = '#ffeb3b';
        popup.style.fontSize = '48px';
    }
    popup.textContent = text;
    questionArea.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
}

function updateComboDisplay() {
    let comboContainer = document.getElementById('combo-container');
    if (!comboContainer) return;

    let comboEl = document.getElementById('combo-display');
    if (!comboEl) {
        comboEl = document.createElement('div');
        comboEl.id = 'combo-display';
        comboEl.className = 'combo-display';
        comboEl.innerHTML = `<span class="combo-label">COMBO</span><span class="combo-value" id="combo-value">0</span>`;
        comboContainer.appendChild(comboEl);
    }

    const comboValue = document.getElementById('combo-value');
    if (comboCount >= 2) {
        comboEl.style.display = 'flex';
        comboEl.classList.add('active');
        comboValue.textContent = comboCount;
    } else {
        comboEl.classList.remove('active');
        comboEl.style.display = 'none';
    }
}

function updateScore() {
    currentScoreDisplay.textContent = score;
}

// ========================================
// ゲーム終了
// ========================================
function endGame() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    showScreen(GameState.RESULT);
    displayResults();
}

function displayResults() {
    finalScoreDisplay.textContent = score;
    reviewList.innerHTML = '';

    if (mistakenWords.length === 0) {
        reviewList.innerHTML = '<p style="text-align: center; opacity: 0.7;">間違えた単語はありません👏</p>';
    } else {
        mistakenWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <span class="review-japanese">${word.japanese}</span>
                <span class="review-english">${word.english.toLowerCase()}</span>
            `;
            reviewList.appendChild(item);
        });
    }
}

// ========================================
// ユーティリティ関数
// ========================================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

document.addEventListener('DOMContentLoaded', init);
