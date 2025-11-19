const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/********** INPUT HANDLING **********/
let keys = {};
let keyPressed = {};

document.addEventListener("keydown", e => {
    if (!keys[e.key]) {
        keyPressed[e.key] = true;
    }
    keys[e.key] = true;
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
    keyPressed[e.key] = false;
});

/********** LOAD IMAGES **********/
let catImg = new Image();
catImg.src = "assets/image1.png";

let monsterImg = new Image();
monsterImg.src = "assets/image2.png";

let coinImg = new Image();
coinImg.src = "assets/image3.png";

/********** GAME VARIABLES **********/
let cat = {
    x: 100,
    y: 300,
    w: 60,
    h: 60,
    vy: 0,
    onGround: false,
    jumpCount: 0,
    speed: 4,
    sprint: false,
    sprintBoost: false
};

let camera = {
    x: 0,
    y: 0
};

let gravity = 0.6;
let baseGravity = 0.6;
let platforms = [];
let coins = [];
let monsters = [];
let dialogTriggers = [];
let triggeredDialogs = [];
let currentDialog = null;
let itemActive = "None";
let itemTimer = 0;

let collectedCoins = 0;
let gameTime = 90;
let gameOver = false;
let gameWon = false;

/********** CREATE PLATFORMS **********/
// Ground platform
platforms.push({ x: 0, y: 450, w: 4000, h: 20 });

// Floating platforms throughout the level
for (let i = 0; i < 15; i++) {
    platforms.push({
        x: 300 + i * 220,
        y: 350 - (i % 4) * 60,
        w: 120,
        h: 20
    });
}

// Additional challenge platforms
platforms.push({ x: 800, y: 200, w: 100, h: 20 });
platforms.push({ x: 1400, y: 180, w: 100, h: 20 });
platforms.push({ x: 2000, y: 220, w: 100, h: 20 });
platforms.push({ x: 2500, y: 160, w: 120, h: 20 });

/********** CREATE COINS (10 TOTAL) **********/
coins.push({ x: 400, y: 250, taken: false });
coins.push({ x: 650, y: 280, taken: false });
coins.push({ x: 900, y: 150, taken: false });
coins.push({ x: 1200, y: 300, taken: false });
coins.push({ x: 1500, y: 130, taken: false });
coins.push({ x: 1800, y: 250, taken: false });
coins.push({ x: 2100, y: 180, taken: false });
coins.push({ x: 2400, y: 300, taken: false });
coins.push({ x: 2700, y: 200, taken: false });
coins.push({ x: 2900, y: 350, taken: false });

/********** CREATE MONSTERS **********/
monsters.push({ x: 550, y: 390, w: 60, h: 60 });
monsters.push({ x: 1000, y: 390, w: 60, h: 60 });
monsters.push({ x: 1350, y: 390, w: 60, h: 60 });
monsters.push({ x: 1700, y: 390, w: 60, h: 60 });
monsters.push({ x: 2200, y: 390, w: 60, h: 60 });
monsters.push({ x: 2600, y: 390, w: 60, h: 60 });
monsters.push({ x: 2850, y: 390, w: 60, h: 60 });

/********** DIALOG TRIGGERS **********/
dialogTriggers = [
    { x: 500, triggered: false },
    { x: 1300, triggered: false },
    { x: 2100, triggered: false }
];

/********** DIALOG DOM ELEMENTS **********/
const dialogOverlay = document.getElementById("dialogOverlay");
const dialogChoices = document.getElementById("dialogChoices");
const dialogText = document.getElementById("dialogText");
const dialogClose = document.getElementById("dialogClose");

/********** GAME LOOP **********/
let lastTime = Date.now();

function update() {
    // Calculate delta time
    let now = Date.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    // Don't update game if dialog is open or game is over
    if (!dialogOverlay.classList.contains("hidden") || gameOver) {
        return requestAnimationFrame(update);
    }

    // Update game timer
    gameTime -= dt;
    document.getElementById("timer").innerText = gameTime.toFixed(1) + "s";

    if (gameTime <= 0 && !gameOver) {
        endGame("Time's Up! You ran out of time.");
        return;
    }

    // Movement
    let speed = cat.speed;
    if (keys["Shift"] || cat.sprintBoost) {
        speed *= 1.8;
    }

    if (keys["a"] || keys["A"] || keys["ArrowLeft"]) {
        cat.x -= speed;
    }
    if (keys["d"] || keys["D"] || keys["ArrowRight"]) {
        cat.x += speed;
    }

    // Jump (with double jump, keyPressed prevents holding)
    if ((keys["w"] || keys["W"] || keys["ArrowUp"] || keys[" "]) && keyPressed["w"] && cat.jumpCount < 2) {
        cat.vy = -12;
        cat.jumpCount++;
        keyPressed["w"] = false;
        keyPressed["W"] = false;
        keyPressed["ArrowUp"] = false;
        keyPressed[" "] = false;
    }

    // Also check other jump keys
    if ((keys["W"] || keys["ArrowUp"] || keys[" "]) &&
        (keyPressed["W"] || keyPressed["ArrowUp"] || keyPressed[" "]) &&
        cat.jumpCount < 2) {
        cat.vy = -12;
        cat.jumpCount++;
        keyPressed["w"] = false;
        keyPressed["W"] = false;
        keyPressed["ArrowUp"] = false;
        keyPressed[" "] = false;
    }

    // Apply gravity
    cat.vy += gravity;
    cat.y += cat.vy;

    // Keep cat in bounds (left side)
    if (cat.x < 0) cat.x = 0;

    // Ground collision
    cat.onGround = false;
    if (cat.y >= 390) {
        cat.y = 390;
        cat.vy = 0;
        cat.jumpCount = 0;
        cat.onGround = true;
    }

    // Platform collision
    for (let p of platforms) {
        // Check if cat is falling onto platform
        if (cat.vy >= 0 &&
            cat.x + cat.w > p.x && cat.x < p.x + p.w &&
            cat.y + cat.h >= p.y && cat.y + cat.h <= p.y + 15) {
            cat.y = p.y - cat.h;
            cat.vy = 0;
            cat.jumpCount = 0;
            cat.onGround = true;
        }
    }

    // Coin collection
    for (let c of coins) {
        if (!c.taken &&
            cat.x < c.x + 40 && cat.x + cat.w > c.x &&
            cat.y < c.y + 40 && cat.y + cat.h > c.y) {
            c.taken = true;
            collectedCoins++;
            document.getElementById("coinCount").innerText = collectedCoins;
        }
    }

    // Monster collision (reset game)
    for (let m of monsters) {
        if (cat.x < m.x + m.w && cat.x + cat.w > m.x &&
            cat.y < m.y + m.h && cat.y + cat.h > m.y) {
            resetGame();
            return;
        }
    }

    // Dialog triggers
    for (let trigger of dialogTriggers) {
        if (!trigger.triggered && cat.x > trigger.x) {
            trigger.triggered = true;
            startDialog(trigger.x);
        }
    }

    // Item timer countdown
    if (itemTimer > 0) {
        itemTimer -= dt;
        if (itemTimer <= 0) {
            itemActive = "None";
            cat.sprintBoost = false;
            gravity = baseGravity;
            document.getElementById("itemStatus").innerText = "None";
        } else {
            // Show remaining time
            document.getElementById("itemStatus").innerText = itemActive + " (" + itemTimer.toFixed(1) + "s)";
        }
    }

    // Win condition: reach the end with at least 7 coins
    if (cat.x > 3000) {
        if (collectedCoins >= 7 && !gameOver) {
            endGame("Victory! You completed the adventure!");
            gameWon = true;
        } else if (!gameOver) {
            endGame("Not enough coins! You need at least 7 coins to complete the game.");
        }
        return;
    }

    // Update camera to follow cat
    updateCamera();

    // Draw everything
    draw();
    requestAnimationFrame(update);
}

/********** CAMERA SYSTEM **********/
function updateCamera() {
    // Camera follows cat, keeping it centered
    camera.x = cat.x - canvas.width / 2 + cat.w / 2;

    // Clamp camera to level bounds
    if (camera.x < 0) camera.x = 0;
    if (camera.x > 3200 - canvas.width) camera.x = 3200 - canvas.width;
}

/********** DRAW FUNCTION **********/
function draw() {
    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw sky/background gradient
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0f0f1e");
    gradient.addColorStop(1, "#1a1a3e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context and apply camera transform
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw platforms
    ctx.fillStyle = "#8B4513";
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    for (let p of platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    // Draw coins
    for (let c of coins) {
        if (!c.taken) {
            ctx.drawImage(coinImg, c.x, c.y, 40, 40);

            // Draw glow effect around coins
            ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
            ctx.beginPath();
            ctx.arc(c.x + 20, c.y + 20, 25, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw monsters
    for (let m of monsters) {
        ctx.drawImage(monsterImg, m.x, m.y, m.w, m.h);

        // Draw danger indicator
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(m.x - 5, m.y - 5, m.w + 10, m.h + 10);
    }

    // Draw cat
    ctx.drawImage(catImg, cat.x, cat.y, cat.w, cat.h);

    // Draw sprint effect
    if (keys["Shift"] || cat.sprintBoost) {
        ctx.strokeStyle = "rgba(100, 200, 255, 0.5)";
        ctx.lineWidth = 3;
        ctx.strokeRect(cat.x - 2, cat.y - 2, cat.w + 4, cat.h + 4);
    }

    // Draw goal line
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
    ctx.fillRect(3000, 0, 50, canvas.height);
    ctx.fillStyle = "#00ff00";
    ctx.font = "20px Arial";
    ctx.fillText("GOAL", 3005, 250);

    // Restore context
    ctx.restore();

    // Draw UI overlay (not affected by camera)
    drawUI();
}

/********** DRAW UI **********/
function drawUI() {
    // Draw mini-map / progress bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, canvas.height - 30, 200, 20);

    ctx.fillStyle = "#00ff00";
    let progress = (cat.x / 3000) * 200;
    ctx.fillRect(10, canvas.height - 30, progress, 20);

    ctx.strokeStyle = "#fff";
    ctx.strokeRect(10, canvas.height - 30, 200, 20);

    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.fillText("Progress", 70, canvas.height - 15);
}

/********** DIALOG SYSTEM **********/
function startDialog(triggerX) {
    dialogOverlay.classList.remove("hidden");

    // Different dialog text based on trigger position
    if (triggerX < 1000) {
        dialogText.innerText = "You found a mysterious treasure box! Choose an item to help you on your journey.";
    } else if (triggerX < 2000) {
        dialogText.innerText = "Another treasure appears! Select an item wisely.";
    } else {
        dialogText.innerText = "One last gift for your adventure! Choose carefully.";
    }

    dialogChoices.innerHTML = `
        <button onclick="chooseItem('Spring')">🌱 Spring Shoes (High Jump)</button><br><br>
        <button onclick="chooseItem('Fish')">🐟 Magic Fish (Speed Boost)</button><br><br>
        <button onclick="chooseItem('Balloon')">🎈 Balloon (Low Gravity)</button><br><br>
        <button onclick="chooseItem('Horn')">📯 Magic Horn (Random Effect)</button>
    `;
}

// Make chooseItem available globally
window.chooseItem = function(item) {
    itemActive = item;
    itemTimer = 5.0;

    // Reset previous effects
    cat.sprintBoost = false;
    gravity = baseGravity;

    // Apply item effects
    if (item === "Fish") {
        cat.sprintBoost = true;
        dialogText.innerText = "You gained a speed boost for 5 seconds!";
    } else if (item === "Spring") {
        cat.vy = -18;
        dialogText.innerText = "Spring shoes propel you high into the air!";
    } else if (item === "Balloon") {
        gravity = 0.3;
        dialogText.innerText = "You feel lighter! Gravity reduced for 5 seconds!";
    } else if (item === "Horn") {
        // Random effect
        let random = Math.floor(Math.random() * 3);
        if (random === 0) {
            cat.sprintBoost = true;
            dialogText.innerText = "The horn grants you speed!";
        } else if (random === 1) {
            cat.vy = -18;
            dialogText.innerText = "The horn launches you upward!";
        } else {
            gravity = 0.3;
            dialogText.innerText = "The horn makes you float!";
        }
    }

    document.getElementById("itemStatus").innerText = item + " (5.0s)";

    // Close dialog after a short delay
    setTimeout(() => {
        dialogOverlay.classList.add("hidden");
    }, 1500);
};

dialogClose.onclick = () => {
    dialogOverlay.classList.add("hidden");
};

/********** RESET GAME (AFTER MONSTER COLLISION) **********/
function resetGame() {
    // Reset cat position
    cat.x = 100;
    cat.y = 300;
    cat.vy = 0;
    cat.jumpCount = 0;
    cat.sprintBoost = false;

    // Reset coins collected
    collectedCoins = 0;
    document.getElementById("coinCount").innerText = "0";

    // Reset all coins
    for (let c of coins) {
        c.taken = false;
    }

    // Reset dialog triggers
    for (let trigger of dialogTriggers) {
        trigger.triggered = false;
    }

    // Reset item
    itemActive = "None";
    itemTimer = 0;
    gravity = baseGravity;
    document.getElementById("itemStatus").innerText = "None";

    // Reset timer
    gameTime = 90;

    // Show reset message briefly
    let msg = document.getElementById("message");
    msg.innerText = "Oh no! You touched a monster! Starting over...";
    msg.style.color = "#ff4444";
    msg.style.fontSize = "24px";
    msg.style.fontWeight = "bold";

    setTimeout(() => {
        msg.innerText = "";
    }, 2000);
}

/********** END GAME **********/
function endGame(text) {
    gameOver = true;
    let msg = document.getElementById("message");
    msg.innerText = text;
    msg.style.fontSize = "28px";
    msg.style.fontWeight = "bold";
    msg.style.textAlign = "center";
    msg.style.padding = "20px";
    msg.style.background = "rgba(0, 0, 0, 0.8)";
    msg.style.borderRadius = "10px";
    msg.style.marginTop = "20px";

    if (gameWon) {
        msg.style.color = "#00ff00";
    } else {
        msg.style.color = "#ff9900";
    }

    // Show restart instruction
    setTimeout(() => {
        msg.innerText += "\n\nRefresh the page to play again!";
    }, 1500);
}

/********** START GAME **********/
// Wait for images to load before starting
let imagesLoaded = 0;
const totalImages = 3;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        startGame();
    }
}

catImg.onload = imageLoaded;
monsterImg.onload = imageLoaded;
coinImg.onload = imageLoaded;

function startGame() {
    console.log("Siamese Cat Adventure - Game Started!");
    console.log("Controls: W/↑/Space = Jump, A/← = Left, D/→ = Right, Shift = Sprint");
    update();
}

// Fallback: start game after 1 second even if images don't load
setTimeout(() => {
    if (imagesLoaded < totalImages) {
        console.warn("Some images didn't load, starting anyway...");
        startGame();
    }
}, 1000);
