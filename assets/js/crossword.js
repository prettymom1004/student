class CrosswordGenerator {
    constructor(wordList) {
        this.wordList = wordList;
        this.gridSize = 25;
        this.grid = null;
        this.placedWords = [];
    }

    shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    canPlaceWord(word, r, c, isAcross) {
        if (isAcross && c + word.length > this.gridSize) return false;
        if (!isAcross && r + word.length > this.gridSize) return false;

        let intersects = 0;
        for (let i = 0; i < word.length; i++) {
            let row = isAcross ? r : r + i;
            let col = isAcross ? c + i : c;
            let cell = this.grid[row][col];

            if (cell !== null && cell !== word[i]) return false;
            if (cell === word[i]) intersects++;

            if (cell === null) {
                if (isAcross) {
                    if (row > 0 && this.grid[row - 1][col] !== null) return false;
                    if (row < this.gridSize - 1 && this.grid[row + 1][col] !== null) return false;
                } else {
                    if (col > 0 && this.grid[row][col - 1] !== null) return false;
                    if (col < this.gridSize - 1 && this.grid[row][col + 1] !== null) return false;
                }
            }
        }
        
        if (isAcross) {
            if (c > 0 && this.grid[r][c - 1] !== null) return false;
            if (c + word.length < this.gridSize && this.grid[r][c + word.length] !== null) return false;
        } else {
            if (r > 0 && this.grid[r - 1][c] !== null) return false;
            if (r + word.length < this.gridSize && this.grid[r + word.length][c] !== null) return false;
        }

        return intersects;
    }

    generate(targetWordCount = 8) {
        // Try multiple times to get a good grid
        let bestGrid = null;
        let bestPlacedCount = 0;

        for (let attempt = 0; attempt < 100; attempt++) {
            let shuffled = this.shuffle([...this.wordList]);
            this.placedWords = [];
            this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));

            let firstWord = shuffled.shift();
            let r = Math.floor(this.gridSize / 2);
            let c = Math.floor((this.gridSize - firstWord.word.length) / 2);
            this.placeWord(firstWord, r, c, true);
            
            for (let wordObj of shuffled) {
                if (this.placedWords.length >= targetWordCount) break;
                
                let bestPlacement = null;
                let maxIntersects = -1;

                for (let i = 0; i < this.gridSize; i++) {
                    for (let j = 0; j < this.gridSize; j++) {
                        let acrossIntersects = this.canPlaceWord(wordObj.word, i, j, true);
                        if (acrossIntersects !== false && acrossIntersects > maxIntersects && acrossIntersects > 0) {
                            maxIntersects = acrossIntersects;
                            bestPlacement = { r: i, c: j, isAcross: true };
                        }
                        let downIntersects = this.canPlaceWord(wordObj.word, i, j, false);
                        if (downIntersects !== false && downIntersects > maxIntersects && downIntersects > 0) {
                            maxIntersects = downIntersects;
                            bestPlacement = { r: i, c: j, isAcross: false };
                        }
                    }
                }

                if (bestPlacement) {
                    // Deep clone wordObj before placing so we don't mutate the original across attempts
                    let newWordObj = Object.assign({}, wordObj);
                    this.placeWord(newWordObj, bestPlacement.r, bestPlacement.c, bestPlacement.isAcross);
                }
            }

            if (this.placedWords.length > bestPlacedCount) {
                bestPlacedCount = this.placedWords.length;
                bestGrid = {
                    words: this.placedWords,
                    grid: this.grid
                };
            }
            if (bestPlacedCount >= targetWordCount) break;
        }
        
        this.placedWords = bestGrid.words;
        this.grid = bestGrid.grid;
        return this.placedWords;
    }

    placeWord(wordObj, r, c, isAcross) {
        wordObj.r = r;
        wordObj.c = c;
        wordObj.isAcross = isAcross;
        wordObj.number = this.placedWords.length + 1;
        
        for (let i = 0; i < wordObj.word.length; i++) {
            let row = isAcross ? r : r + i;
            let col = isAcross ? c + i : c;
            this.grid[row][col] = wordObj.word[i];
        }
        this.placedWords.push(wordObj);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!window.quizWords || window.quizWords.length === 0) return;

    let app = document.getElementById("crossword-app");
    if (!app) return;

    let targetWords = window.quizWordsCount || 10;
    
    function renderCrossword() {
        app.innerHTML = '<div style="text-align:center;"><p>퍼즐을 만들고 있습니다...</p></div>';
        
        setTimeout(() => {
            let generator = new CrosswordGenerator(window.quizWords);
            let placedWords = generator.generate(targetWords);
            
            // Find bounds to crop the grid
            let minR = generator.gridSize, maxR = 0, minC = generator.gridSize, maxC = 0;
            for(let w of placedWords) {
                if (w.r < minR) minR = w.r;
                if (w.c < minC) minC = w.c;
                if (w.isAcross) {
                    if (w.r > maxR) maxR = w.r;
                    if (w.c + w.word.length - 1 > maxC) maxC = w.c + w.word.length - 1;
                } else {
                    if (w.r + w.word.length - 1 > maxR) maxR = w.r + w.word.length - 1;
                    if (w.c > maxC) maxC = w.c;
                }
            }
            
            let html = '<div class="crossword-wrapper">';
            html += '<table class="crossword-board">';
            
            // Map inputs for answers
            let inputMap = {}; 

            for (let r = minR; r <= maxR; r++) {
                html += '<tr>';
                for (let c = minC; c <= maxC; c++) {
                    let cell = generator.grid[r][c];
                    if (cell) {
                        let numberHtml = '';
                        let cellWords = placedWords.filter(w => w.r === r && w.c === c);
                        if (cellWords.length > 0) {
                            // find minimum number
                            let num = Math.min(...cellWords.map(w => w.number));
                            numberHtml = `<span class="cw-num">${num}</span>`;
                        }
                        
                        html += `<td class="cw-cell cw-active">
                                    ${numberHtml}
                                    <input type="text" maxlength="1" data-r="${r}" data-c="${c}" class="cw-input" />
                                 </td>`;
                        inputMap[`${r},${c}`] = cell;
                    } else {
                        html += `<td class="cw-cell cw-empty"></td>`;
                    }
                }
                html += '</tr>';
            }
            html += '</table>';
            
            // Clues
            html += '<div class="cw-clues">';
            let across = placedWords.filter(w => w.isAcross).sort((a,b) => a.number - b.number);
            let down = placedWords.filter(w => !w.isAcross).sort((a,b) => a.number - b.number);
            
            html += '<div class="cw-clues-section"><h3>가로 열쇠</h3><ol>';
            across.forEach(w => {
                html += `<li><strong>${w.number}.</strong> ${w.clue} <span class="cw-len">(${w.word.length}글자)</span></li>`;
            });
            html += '</ol></div>';
            
            html += '<div class="cw-clues-section"><h3>세로 열쇠</h3><ol>';
            down.forEach(w => {
                html += `<li><strong>${w.number}.</strong> ${w.clue} <span class="cw-len">(${w.word.length}글자)</span></li>`;
            });
            html += '</ol></div>';
            html += '</div>'; // end clues
            
            html += '<div class="cw-actions">';
            html += '<button id="btn-check" class="cw-btn">정답 확인하기</button>';
            html += '<button id="btn-new" class="cw-btn cw-btn-secondary">새로운 퍼즐 만들기 (다른 10문제)</button>';
            html += '<div id="cw-result" class="cw-result"></div>';
            html += '</div>';

            html += '</div>'; // end wrapper
            
            app.innerHTML = html;
            
            // Attach Events
            document.getElementById('btn-check').addEventListener('click', () => {
                let correctCount = 0;
                let totalCount = Object.keys(inputMap).length;
                let inputs = document.querySelectorAll('.cw-input');
                inputs.forEach(inp => {
                    let r = inp.getAttribute('data-r');
                    let c = inp.getAttribute('data-c');
                    let ans = inputMap[`${r},${c}`];
                    
                    // Allow simple Hangul composition check
                    if (inp.value.trim() === ans) {
                        inp.classList.add('cw-correct');
                        inp.classList.remove('cw-wrong');
                        correctCount++;
                    } else if (inp.value.trim() !== "") {
                        inp.classList.add('cw-wrong');
                        inp.classList.remove('cw-correct');
                    } else {
                        inp.classList.remove('cw-correct', 'cw-wrong');
                    }
                });
                
                let resDiv = document.getElementById('cw-result');
                if (correctCount === totalCount) {
                    resDiv.innerHTML = "🎉 와! 모든 낱말을 다 맞혔어요! 대단합니다! 🎉";
                    resDiv.style.color = "#28a745";
                } else {
                    resDiv.innerHTML = `아직 조금 부족해요! (현재 맞은 글자 수: ${correctCount}/${totalCount})`;
                    resDiv.style.color = "#dc3545";
                }
            });

            document.getElementById('btn-new').addEventListener('click', () => {
                renderCrossword();
            });

            // Focus management
            let allInputs = document.querySelectorAll('.cw-input');
            allInputs.forEach((inp, idx) => {
                inp.addEventListener('input', function() {
                    if (this.value.length === 1 && idx < allInputs.length - 1) {
                        // Not perfect, but moves to next input
                        allInputs[idx + 1].focus();
                    }
                });
            });

        }, 100);
    }
    
    renderCrossword();
});
