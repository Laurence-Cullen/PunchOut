    // defining dimensions of video to capture from web cam
    const width = 224;
    const height = 224;

    // how often to run posture inference from web cam in milliseconds
    const modelEvaluationPeriod = 50;

    // initialise posture
    let posture = null;

    // how long a single game session is in terms of destroyed targets
    const gameLength = 10;

    // the probability per game engine tick that a target will appear
    const showTargetProbability = 0.05;

    // the probability of having to duck per game engine tick

    let duckStatusProbability = 0.01;

    const gunshotProbability = 0.01;

    // end_time of duck event, to be initialized with duckEventInitializer

    let end_time = 0;

    // defines whether a game is active or not
    let gameActive = false;

    const punchSound = new Audio('assets/PUNCH.mp3');
    const countdownSound = new Audio('assets/mario_kart_race_start.mp3');
    const fightSound = new Audio('assets/mortal_kombat_fight.mp3');
    const leftPunchSound = new Audio('assets/left_punch.m4a');
    const rightPunchSound = new Audio('assets/right_punch.m4a');
    const welcomeSound = new Audio('assets/welcome.m4a');
    const shatterSound = new Audio('assets/shatter.mp3');
    const gunshotSound = new Audio('assets/gunshot.mp3');
    const onHit = new Audio('assets/male_grunt_2.mp3');
    const gameOver = new Audio('assets/game_over_1.wav');
    let bulletMisses = [new Audio('assets/bullet_miss_1.wav'),
        new Audio('assets/bullet_miss_2.wav'),
        new Audio('assets/bullet_miss_3.wav'),
        new Audio('assets/bullet_miss_4.wav'),
        new Audio('assets/bullet_miss_5.wav'),
        new Audio('assets/bullet_miss_6.wav'),
        new Audio('assets/bullet_miss_7.wav'),
        new Audio('assets/bullet_miss_8.wav'),
        new Audio('assets/bullet_miss_9.wav')
    ];

    let playerScore = 0;
    let punchCount = 0;
    let targetsDestroyed = 0;
    let duckTime = 3;
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
    let duckStatus = false;

    let playerScoreElement = document.getElementById('player_score');
    let targetsDestroyedElement = document.getElementById('targets_destroyed');
    let postureElement = document.getElementById("posture");
    let resetButton = document.getElementById('reset');
    let gameStartButton = document.getElementById('game_start');
    let livesTracker = document.getElementById("lives");
    livesTracker.innerHTML = lives;
    gameStartButton.onclick = function () {
        playFromStart(countdownSound);
        gameActive = true
    };

    let model;

    async function loadModel() {
        model = await tf.loadModel('models/model.json');
        return model
    }

    const modelLabels = {0: 'duck', 1: 'left punch', 2: 'no punch', 3: 'right punch',};

    function timeToDuck() {
        return 3000 - Math.min(2500, 50 * targetsDestroyed)
    }

    function duckProbability() {
        return Math.min(0.1, 0.01 + 0.0025 * targetsDestroyed)
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
                duckStatusProbability = duckProbability();
                leftTargetAge = 0;
                leftTargetStatus = false;
            } else if (gameActive) {
                playerScore -= 10
            }

        } else if (newPosture === 'right punch') {
            playFromStart(rightPunchSound);

            if (rightTargetStatus) {
                playFromStart(shatterSound);
                playerScore += Math.max(0, 40 - rightTargetAge);
                targetsDestroyed++;
                duckTime = timeToDuck();
                duckStatusProbability = duckProbability();
                rightTargetAge = 0;
                rightTargetStatus = false;
            } else if (gameActive) {
                playerScore -= 10
            }
        }
        punchCount++;
    }

    function duckEventInitializer() {
        let date = new Date();
        let start_time = date.getTime();
        playFromStart(gunshotSound);
        return start_time + duckTime + 20
    }

    function duckCheck(posture) {
        let date = new Date();
        if (date.getTime() > end_time) {
            if (posture === 'duck') {
                playFromStart(bulletMisses[Math.floor(Math.random() * bulletMisses.length)]);
                duckStatus = false;
            } else {
                playFromStart(onHit);
                lives--;
                livesTracker.innerHTML = lives;
                duckStatus = false;
            }
        }


    }

    function reset() {
        gameActive = false;

        playerScore = 0;
        punchCount = 0;
        lives = 3;

        rightTargetStatus = false;
        rightTargetAge = 0;
        leftTargetStatus = false;
        leftTargetAge = 0;

        targetsDestroyed = 0;

        duckStatusProbability = 0.01;
        duckTime = 3;
    }

    resetButton.onclick = reset;

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
            playFromStart(gameOver);

            reset()
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
            const tensor = tf.fromPixels(imageData).reshape([1, 224, 224, 3]);
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

            if ((newPosture === posture) && (newPosture === 'right punch')) {

            } else if ((newPosture !== posture) && (newPosture === 'right punch')) {
                newPunch(newPosture)
            } else if ((newPosture !== posture) && (newPosture === 'left punch')) {
                newPunch(newPosture)
            }

            if (duckStatus) {
                duckCheck(posture, end_time);
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

                console.log(duckStatusProbability)

                if ((Math.random() < duckStatusProbability) && (duckStatus === false)) {
                    duckStatus = true;
                    end_time = duckEventInitializer();
                }

            }

        }, 100)
    })