import {getOnBulletHitAssets, getBulletMissAssets, getDuckCommandAssets, getJumpCommandAssets, getOnExplosionHitAssets} from './assetLoader.js'

// defining dimensions of video to capture from web cam
const width = 224;
const height = 224;

// how often to run posture inference from web cam in milliseconds
const modelEvaluationPeriod = 50;

// initialise posture
let posture = null;

// the probability per game engine tick that a target will appear
const showTargetProbability = 0.05;
const missedPunchPenalty = 30;

// end_time of duck event, to be initialized with duckEventInitializer
let end_time = 0;

// defines whether a game is active or not
let gameActive = false;

// Load audio assets
const punchSound = new Audio('assets/punch.mp3');
punchSound.volume = 0.7;
const countdownSound = new Audio('assets/mario_kart_race_start.mp3');
countdownSound.volume = 0.8;
// const fightSound = new Audio('assets/mortal_kombat_fight.mp3');
const leftPunchSound = new Audio('assets/left_punch.m4a');
leftPunchSound.volume = 0.7;
const rightPunchSound = new Audio('assets/right_punch.m4a');
rightPunchSound.volume = 0.7;
const welcomeSound = new Audio('assets/welcome.m4a');
const shatterSound = new Audio('assets/target_shatter.mp3');
shatterSound.volume = 0.7;
const gunshotSound = new Audio('assets/gunshot.mp3');
const gameOver = new Audio('assets/game_over_2.wav');
const explosionSounds = new Audio('assets/explosion_1.wav');

let onBulletHit = getOnBulletHitAssets();
let onBulletMiss = getBulletMissAssets();
let duckCommands = getDuckCommandAssets();
let jumpCommands = getJumpCommandAssets();
let onExplosionHit = getOnExplosionHitAssets();

let playerScore = 0;
let punchCount = 0;
let targetsDestroyed = 0;
let duckProbability = 0.02;
let duckTime = 2000;
let jumpProbability = 0.05;
let jumpTime = 1500;
let lives = 3;

// tracks how many game engine ticks a target has survived
let rightTargetAge = 0;
let leftTargetAge = 0;

let gameCanvasLeft = document.getElementById('game_canvas_left');
let gameContextLeft = gameCanvasLeft.getContext("2d");
let punchPromptLeft = document.getElementById('punch_prompt_left');

let gameCanvasRight = document.getElementById('game_canvas_right');
let gameContextRight = gameCanvasRight.getContext("2d");
let punchPromptRight = document.getElementById('punch_prompt_right');

let modalBody = document.getElementById('modal-body');

const targetRect = [50, 50, 150, 150];
const targetOutline = [47, 47, 153, 153];

let rightTargetStatus = false;
let leftTargetStatus = false;
let gameEvent = false;
let duckEvent = false;
let jumpEvent = false;
let shellShock = false;

let playerScoreElement = document.getElementById('player_score');
let targetsDestroyedElement = document.getElementById('targets_destroyed');
let postureElement = document.getElementById("posture");
let resetButton = document.getElementById('reset');
let gameStartButton = document.getElementById('game_start');
let livesTracker = document.getElementById("lives");
livesTracker.innerHTML = '❤️'.repeat(lives);

gameStartButton.onclick = function () {
    playFromStart(countdownSound);
    setTimeout(function gameStart() {
        gameActive = true;
    }, 4500)
};

let model;

async function loadModel() {
    model = await tf.loadModel('models/model.json');
    return model
}

const modelLabels = {0: 'duck', 1: 'jump', 2: 'left punch', 3: 'no punch', 4: 'right punch',};

function timeToDuck() {
    return 2000 - Math.min(900, 50 * targetsDestroyed)
}

function computeDuckProbability() {
    return Math.min(0.1, 0.02 + 0.0025 * targetsDestroyed)
}

function draw() {
    drawStateToHTML();
    drawTarget(rightTargetStatus, gameContextRight, punchPromptRight);
    drawTarget(leftTargetStatus, gameContextLeft, punchPromptLeft);
}

function drawStateToHTML() {
    playerScoreElement.innerText = playerScore;
    targetsDestroyedElement.innerText = targetsDestroyed;
    postureElement.innerText = posture;
}

function playFromStart(audio) {
    if (audio.paused) {
        audio.play();
    } else {
        audio.currentTime = 0;
    }
}

function newPunch(newPosture) {
    playFromStart(punchSound);

    if (newPosture === 'left punch') {
        playFromStart(leftPunchSound);

        if (leftTargetStatus) {
            playFromStart(shatterSound);
            playerScore += Math.max(0, 40 - leftTargetAge);
            targetsDestroyed++;
            duckTime = timeToDuck();
            duckProbability = computeDuckProbability();
            leftTargetAge = 0;
            leftTargetStatus = false;
        } else if (gameActive) {
            playerScore -= missedPunchPenalty
        }

    } else if (newPosture === 'right punch') {
        playFromStart(rightPunchSound);

        if (rightTargetStatus) {
            playFromStart(shatterSound);
            playerScore += Math.max(0, 40 - rightTargetAge);
            targetsDestroyed++;
            duckTime = timeToDuck();
            duckProbability = computeDuckProbability();
            rightTargetAge = 0;
            rightTargetStatus = false;
        } else if (gameActive) {
            playerScore -= missedPunchPenalty
        }
    }
    punchCount++;
}


function duckEventInitializer() {
    let date = new Date();
    let start_time = date.getTime();
    playFromStart(duckCommands[Math.floor(Math.random() * duckCommands.length)]);
    setTimeout(function duckCommandDelay() {
        gunshotSound.play();
    }, 1000);
    return start_time + duckTime + 20
}


function duckCheck(posture) {
    let date = new Date();
    if (date.getTime() > end_time) {
        if (posture === 'duck') {
            playFromStart(onBulletMiss[Math.floor(Math.random() * onBulletMiss.length)]);
            duckEvent = false;
            gameEvent = false;
        } else {
            playFromStart(onBulletHit[Math.floor(Math.random() * onBulletHit.length)]);
            lives--;
            shellShock = true;
            livesTracker.innerHTML = '❤️'.repeat(lives);
            duckEvent = false;
            gameEvent = false;

            setTimeout(function shellShockDelay() {
                shellShock=false;
            }, 750);
        }
    }
}


function jumpCheck(posture) {
    setTimeout(function jumpDelay() {
        if (posture === 'jump') {
            playFromStart(explosionSounds);
        } else {
            playFromStart(explosionSounds);
            playFromStart(onExplosionHit[Math.floor(Math.random() * onExplosionHit.length)]);
            lives--;
            shellShock=true;
            livesTracker.innerHTML = '❤️'.repeat(lives);

            setTimeout(function shellShockDelay() {
                shellShock=false;
            }, 750);
        }

        setTimeout(function eventOutroDelay() {
            gameEvent = false;
        }, 500);

    }, jumpTime)
}


function resetGame() {
    gameActive = false;

    playerScore = 0;
    punchCount = 0;
    lives = 3;
    livesTracker.innerHTML = '❤️'.repeat(lives);

    rightTargetStatus = false;
    rightTargetAge = 0;
    leftTargetStatus = false;
    leftTargetAge = 0;

    targetsDestroyed = 0;

    duckProbability = 0.02;
    duckTime = 2000;

    jumpProbability = 0.01;
}


resetButton.onclick = resetGame;

function drawTarget(targetStatus, context, targetPrompt) {
    if (targetStatus) {
        context.fillStyle = "#FF0000";
        context.fillRect(...targetRect);
        targetPrompt.innerText = 'Punch!';

    } else {
        context.fillStyle = "#FFFFFF";
        context.fillRect(...targetRect);

        context.rect(...targetOutline);
        context.lineWidth = "6";
        context.stroke();

        targetPrompt.innerText = '';
    }
}


draw();

function gameEndCheck() {
    if (lives === 0) {
        modalBody.innerText = 'Your final score was: ' + playerScore.toString();
        $('#finalScoreModal').modal('show');
        setTimeout(function gameOverVoiceover() {
            playFromStart(gameOver)
        }, 750);


        resetGame()
    }
}


loadModel().then(function (model) {

    let canvas, context, video;

    const constraints = {video: {width: {exact: width}, height: {exact: height}}};
    video = document.querySelector('video');
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream
    });

    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");

    function inferPosture(imageData) {
        const tensor = tf.fromPixels(imageData).reshape([1, width, height, 3]);
        const normalisedTensor = tensor.div(tf.tensor([255.0]));
        const predictions = model.predict(normalisedTensor);
        const labelValue = predictions.argMax(1).asScalar().get();
        return modelLabels[labelValue]
    }

    playFromStart(welcomeSound);

    setInterval(function () {
        context.drawImage(video, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);

        // console.time('inferPosture');
        const newPosture = inferPosture(imageData);
        // console.timeEnd('inferPosture');

        if (gameActive) {

            if ((newPosture === posture) && (newPosture === 'right punch')) {

            } else if ((newPosture !== posture) && (newPosture === 'right punch') && (shellShock === false)) {
                newPunch(newPosture)
            } else if ((newPosture !== posture) && (newPosture === 'left punch') && (shellShock === false)) {
                newPunch(newPosture)
            }


            if (duckEvent) {
                duckCheck(posture, end_time);
            }

            if (jumpEvent) {
                jumpCheck(posture);
                jumpEvent = false;
            }
        }
        posture = newPosture;

        if (rightTargetStatus) {
            rightTargetAge++;
        }

        if (leftTargetStatus) {
            leftTargetAge++
        }
        draw();

        gameEndCheck();

    }, modelEvaluationPeriod);


    setInterval(function () {
        if (gameActive) {
            if (Math.random() < showTargetProbability) {
                rightTargetStatus = true;
            }
            if (Math.random() < showTargetProbability) {
                leftTargetStatus = true;
            }

            if ((Math.random() < duckProbability) && (duckEvent === false) && (gameEvent === false)) {
                duckEvent = true;
                gameEvent = true;
                end_time = duckEventInitializer();
            }

            if ((Math.random() < jumpProbability) && (gameEvent === false)) {
                jumpEvent = true;
                gameEvent = true;
                playFromStart(jumpCommands[Math.floor(Math.random() * jumpCommands.length)]);
            }
        }
    }, 100)
});