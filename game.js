// ========================================
// ゲーム状態管理
// ========================================
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    RESULT: 'result'
};

let currentState = GameState.MENU;
let selectedDifficulty = null;
let soundEnabled = true;
let wordList = [];
let currentWordIndex = 0;
let currentWord = null;
let userAnswer = [];
let score = 0;
let timeRemaining = 60;
let timerInterval = null;
let answeredWords = [];

// ========================================
// DOM要素の取得
// ========================================
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');

const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const soundToggle = document.getElementById('sound-toggle');
const startBtn = document.getElementById('start-btn');

const timerDisplay = document.getElementById('timer');
const currentScoreDisplay = document.getElementById('current-score');
const questionText = document.getElementById('question-text');
const answerSlots = document.getElementById('answer-slots');
const letterButtons = document.getElementById('letter-buttons');

const finalScoreDisplay = document.getElementById('final-score');
const reviewList = document.getElementById('review-list');
const retryBtn = document.getElementById('retry-btn');
const menuBtn = document.getElementById('menu-btn');

// ========================================
// 初期化
// ========================================
async function init() {
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

    // イベントリスナーの設定
    setupEventListeners();
}

function setupEventListeners() {
    // 難易度選択
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDifficulty = btn.dataset.level;
            startBtn.disabled = false;
        });
    });

    // 音声設定
    soundToggle.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
    });

    // ゲーム開始
    startBtn.addEventListener('click', startGame);

    // リトライ
    retryBtn.addEventListener('click', () => {
        startGame();
    });

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
            break;
        case GameState.PLAYING:
            gameScreen.classList.add('active');
            break;
        case GameState.RESULT:
            resultScreen.classList.add('active');
            break;
    }
}

// ========================================
// ゲーム開始
// ========================================
function startGame() {
    resetGame();
    
    // 選択された難易度の単語リストを取得
    wordList = [...window.wordsData[selectedDifficulty]];
    shuffleArray(wordList);
    
    currentWordIndex = 0;
    score = 0;
    timeRemaining = 60;
    answeredWords = [];
    
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
}

// ========================================
// タイマー
// ========================================
function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 10) {
            document.querySelector('.timer-display').classList.add('warning');
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
        // 単語リストを使い切ったらシャッフルして再利用
        shuffleArray(wordList);
        currentWordIndex = 0;
    }
    
    currentWord = wordList[currentWordIndex];
    currentWordIndex++;
    userAnswer = [];
    
    // 問題表示
    questionText.textContent = currentWord.japanese;
    
    // 回答スロットの生成
    createAnswerSlots();
    
    // 文字ボタンの生成
    createLetterButtons();
}

function createAnswerSlots() {
    answerSlots.innerHTML = '';
    
    for (let i = 0; i < currentWord.english.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'answer-slot';
        slot.dataset.index = i;
        answerSlots.appendChild(slot);
    }
}

function createLetterButtons() {
    letterButtons.innerHTML = '';
    
    // 単語の文字をシャッフル
    const letters = currentWord.english.split('');
    shuffleArray(letters);
    
    letters.forEach((letter, index) => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        btn.textContent = letter.toUpperCase();
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
    const letter = btn.dataset.letter;
    
    // 回答に追加
    userAnswer.push(letter);
    
    // ボタンを無効化
    btn.classList.add('used');
    
    // 回答スロットに表示
    updateAnswerSlots();
    
    // 回答が完成したかチェック
    if (userAnswer.length === currentWord.english.length) {
        checkAnswer();
    }
}

function updateAnswerSlots() {
    const slots = answerSlots.querySelectorAll('.answer-slot');
    
    userAnswer.forEach((letter, index) => {
        if (slots[index]) {
            slots[index].textContent = letter.toUpperCase();
            slots[index].classList.add('filled');
        }
    });
}

// ========================================
// 回答チェック
// ========================================
function checkAnswer() {
    const userWord = userAnswer.join('');
    const correctWord = currentWord.english;
    
    if (userWord === correctWord) {
        // 正解
        score++;
        updateScore();
        answeredWords.push({
            japanese: currentWord.japanese,
            english: currentWord.english
        });
        
        // 正解アニメーション後、次の問題へ
        setTimeout(() => {
            loadNextWord();
        }, 300);
    } else {
        // 不正解（この実装では起こらないはずだが、念のため）
        setTimeout(() => {
            loadNextWord();
        }, 300);
    }
}

function updateScore() {
    currentScoreDisplay.textContent = score;
}

// ========================================
// ゲーム終了
// ========================================
function endGame() {
    clearInterval(timerInterval);
    timerInterval = null;
    
    // リザルト画面へ
    showScreen(GameState.RESULT);
    displayResults();
}

function displayResults() {
    // スコア表示
    finalScoreDisplay.textContent = score;
    
    // 復習リスト表示
    reviewList.innerHTML = '';
    
    if (answeredWords.length === 0) {
        reviewList.innerHTML = '<p style="text-align: center; opacity: 0.7;">正解した単語がありません</p>';
    } else {
        answeredWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <span class="review-japanese">${word.japanese}</span>
                <span class="review-english">${word.english.toUpperCase()}</span>
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

// ========================================
// アプリケーション起動
// ========================================
document.addEventListener('DOMContentLoaded', init);
