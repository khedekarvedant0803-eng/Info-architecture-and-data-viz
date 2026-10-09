let state = "START_SCREEN";
let showDebugHUD = true; 
let trailerVideo;
let bsVideo;
let flip1, flip2, flip3, flip4;
let ellaStartVideo, ellaEndVideo;
let bsFinishedFlag = false;
let ellaStartFinished = false;
let ellaIntroVideo, ellaIntroFinished = false;
let ellaEndFinished = false;
let roarVideo;
let idleVideo;
let walkawayVideo;
let jungleVideo;
let images = {};
let bgmSound; // Audio tracks

// Single Camera & ML5 Vision variables
let videoCapture;
let handPose;
let faceMesh;
let hands = [];
let faces = [];
let cameraReady = false;

// Audio & Flow variables
let mic, audioLevel = 0;
let playerTimer = 0;        
let zoomFactor = 1.0;
let stateLockTimer = 0; 
let cameraFlash = 0;
let silenceTimer = 0;          
let lastCameraFlashTime = 0;   
let shutterAnimTimer = 0;      
let bgmVolumeState = 0.3;      // Background music volume state (0.3 or 1.0)

// Visual FX
let maskLayer;
let targetMaskX = 0, targetMaskY = 0;
let smoothedMaskX = 0, smoothedMaskY = 0;

// Face Count Stabilization
let faceCountHistory = [];
let stableFaceCount = 0;
let handXHistory = [];

// Dynamic Player Tracking
let targetPlayerCount = 1;
let setupSequence = [];
let setupIndex = 0;

// Strict Release-to-Reset Thumbs Up Logic
let hasReleasedThumb = true;
let hasReleasedPalm = true; 

// Gesture Toggles
let prevBinoculars = false;
let prevShush = false;

let gestureBuffer = {
  mouthOpen: 0,
  thinking: 0,
  tooClose: 0,
  binoculars: 0,
  shush: 0,
  photoClick: 0,
  thumbsUp: 0
};
const TRIGGER_THRESHOLD = 6; 

function preload() {
  try {
    trailerVideo = createVideo(['assets/trailer.mp4'], () => {
      trailerVideo.elt.muted = true;
      trailerVideo.hide();
    });
    roarVideo = createVideo(['assets/Roar_v2.mp4'], () => {
      roarVideo.hide();
    });
    walkawayVideo = createVideo(['assets/walkaway.mp4'], () => {
      walkawayVideo.hide();
    });
    idleVideo = createVideo(['assets/idle.mp4'], () => {
      idleVideo.hide();
    });
    jungleVideo = createVideo(['assets/wholejungle.mp4'], () => {
      jungleVideo.hide();
    });
    bsVideo = createVideo(['assets/bs_v2.mp4'], () => {
      bsVideo.hide();
      bsVideo.onended(() => { bsFinishedFlag = true; });
    });
    flip1 = createVideo(['assets/FLIP1.mp4'], () => { flip1.hide(); });
    flip2 = createVideo(['assets/FLIP2.mp4'], () => { flip2.hide(); });
    flip3 = createVideo(['assets/FLIP3.mp4'], () => { flip3.hide(); });
    flip4 = createVideo(['assets/FLIP4.mp4'], () => { flip4.hide(); });
    ellaIntroVideo = createVideo(['assets/1ella.mp4'], () => {
      ellaIntroVideo.hide();
      ellaIntroVideo.onended(() => { ellaIntroFinished = true; });
    });
    ellaStartVideo = createVideo(['assets/2ella.mp4'], () => { 
      ellaStartVideo.hide(); 
      ellaStartVideo.onended(() => { ellaStartFinished = true; });
    });
    ellaEndVideo = createVideo(['assets/3ella.mp4'], () => { 
      ellaEndVideo.hide(); 
      ellaEndVideo.onended(() => { ellaEndFinished = true; });
    });
  } catch(e) {}

  // Load Audio Files
  soundFormats('mp3');
  bgmSound = loadSound('assets/background.mp3');

  // Load ML5 models in preload() to eliminate runtime freezing & loading delays
  handPose = ml5.handPose({ flipped: true, maxHands: 4 });
  faceMesh = ml5.faceMesh({ flipped: true, maxFaces: 4 });

  let assetFiles = {
    "intro": "assets/Intro.png",
    "player1": "assets/Player1.png",
    "player2": "assets/player2.png",
    "player3": "assets/player3.png",
    "player4": "assets/player4.png",
    "watcher": "assets/watcher.png",
    "spotter": "assets/spotter.png",
    "listener": "assets/listener.png",
    "researcher": "assets/researcher.png",
    "biome": "assets/biome.png",
    "himalayas": "assets/himalayas.png",
    "jungle1": "assets/jungle1.png",
    "bear2": "assets/bear2.png",
    "bear_roar": "assets/bear-roar.png",
    "infopop": "assets/infopop.png",
    "caution": "assets/caution.png",
    "bear_walkaway": "assets/bear-walkaway.png",
    "journal1": "assets/journal-1.png",
    "journal2": "assets/journal-2.png",
    "gestures1": "assets/Gestures1.png",
    "gestures2": "assets/Gestures2.png"
  };

  for (let key in assetFiles) {
    images[key] = loadImage(assetFiles[key]);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
}


function getJungleAsset() {
  if (jungleVideo && jungleVideo.elt.readyState >= 2) {
    if (jungleVideo.elt.paused) jungleVideo.loop();
    return jungleVideo;
  }
  return images["jungle1"];
}

function initMacCamera() {
  videoCapture = createCapture(VIDEO, () => {
    console.log("Stream ready! Starting detect...");
    handPose.detectStart(videoCapture, gotHands);
    faceMesh.detectStart(videoCapture, gotFaces);
    cameraReady = true;
  });
  videoCapture.size(640, 480);
  videoCapture.hide(); 
}

function gotHands(results) { hands = results; }
function gotFaces(results) { faces = results; }
function distKp(p1, p2) { return dist(p1.x, p1.y, p2.x, p2.y); }

// --- GESTURE SMOOTHING & DETECTION ---

function updateBuffer(key, rawCondition, customThreshold = TRIGGER_THRESHOLD) {
  if (gestureBuffer[key] === undefined) {
    gestureBuffer[key] = 0;
  }
  if (rawCondition) {
    gestureBuffer[key] = min(gestureBuffer[key] + 1, customThreshold);
  } else {
    gestureBuffer[key] = max(gestureBuffer[key] - 1, 0);
  }
  return gestureBuffer[key] >= customThreshold;
}

function isLHand(kp) {
  let thumbExtended = distKp(kp[4], kp[5]) > 30;
  let indexExtended = distKp(kp[8], kp[5]) > 40;
  let lShape = distKp(kp[4], kp[8]) > 40; // Ensure thumb and index are far apart (not pinched)
  let middleCurled = kp[12].y > kp[9].y; // Middle finger folded down
  let ringCurled = kp[16].y > kp[13].y;
  let pinkyCurled = kp[20].y > kp[17].y;
  
  return thumbExtended && indexExtended && lShape && middleCurled && ringCurled && pinkyCurled;
}

function isHandOpen(kp) {
  let palmSize = distKp(kp[0], kp[9]);
  // Finger tips must be fully extended away from the wrist
  return distKp(kp[8], kp[0]) > palmSize * 1.5 && 
         distKp(kp[12], kp[0]) > palmSize * 1.5 && 
         distKp(kp[16], kp[0]) > palmSize * 1.5 && 
         distKp(kp[20], kp[0]) > palmSize * 1.5;
}

function checkOkGesture(kp) {
  let palmSize = distKp(kp[0], kp[9]);
  
  // Thumb and index tips are pinched
  let isPinched = distKp(kp[4], kp[8]) < palmSize * 0.5;
  
  // Middle, ring, and pinky fingers extended
  let middleUp = kp[12].y < kp[10].y;
  let ringUp = kp[16].y < kp[14].y;
  let pinkyUp = kp[20].y < kp[18].y;
  
  return isPinched && middleUp && ringUp && pinkyUp;
}

function checkFist(kp) {
  let palmSize = distKp(kp[0], kp[9]);
  // Finger tips must be curled inward towards their own bases
  return distKp(kp[8], kp[5]) < palmSize * 0.8 && 
         distKp(kp[12], kp[9]) < palmSize * 0.8 && 
         distKp(kp[16], kp[13]) < palmSize * 0.8 && 
         distKp(kp[20], kp[17]) < palmSize * 0.8;
}

let currentFaceSizeRatio = 0;

function checkGestures() {
  let rawMouth = false;
  let rawClose = false;
  let rawThink = false;
  let rawBinoc = false;
  let rawShush = false;
  let rawPhotoClick = false;
  let rawThumb = false;
  let rawOkGesture = false;
  let rawPalm = false;

  let lipX, lipY, headX, headY;

  // Track Palm Gesture
  if (hands.length > 0) {
    let kp = hands[0].keypoints;

    // Track open palm gesture
    if (isHandOpen(kp)) {
      rawPalm = true;
    } else if (hands.length > 1 && isHandOpen(hands[1].keypoints)) {
      rawPalm = true;
    }

    // Track OK gesture
    if (checkOkGesture(kp)) {
      rawOkGesture = true;
    } else if (hands.length > 1 && checkOkGesture(hands[1].keypoints)) {
      rawOkGesture = true;
    }
  }

  // 1. Face Gestures (Proximity, Mouth, getting facial landmarks)
  if (faces.length > 0) {
    let face = faces[0];
    
    let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
    for (let kp of face.keypoints) {
      if (kp.x < minX) minX = kp.x;
      if (kp.x > maxX) maxX = kp.x;
      if (kp.y < minY) minY = kp.y;
      if (kp.y > maxY) maxY = kp.y;
    }
    
    let faceW = maxX - minX;
    let faceH = maxY - minY;
    
    currentFaceSizeRatio = faceW / 640;
    if (currentFaceSizeRatio > 0.28) { 
      rawClose = true;
    }

    let topLip = face.keypoints[13];
    let bottomLip = face.keypoints[14];
    if (topLip && bottomLip) {
      let gap = dist(topLip.x, topLip.y, bottomLip.x, bottomLip.y);
      if (gap / faceH > 0.06) rawMouth = true; 
      
      lipX = (topLip.x + bottomLip.x) / 2;
      lipY = (topLip.y + bottomLip.y) / 2;
    }
    
    // Target upper part of the head (temple/forehead area)
    headX = (minX + maxX) / 2;
    headY = minY + (faceH * 0.25);
  } else {
    currentFaceSizeRatio = 0;
  }

  // 2. Hand Gestures (One Hand - Thinking, Shush, Thumbs Up)
  if (hands.length > 0) {
    for (let h of hands) {
      let kp = h.keypoints;
      
      // Thumb up check: Thumb pointing UP, other fingers curled
      let thumbUp = kp[4].y < kp[3].y && kp[4].y < kp[5].y;
      let fingersCurled = kp[8].y > kp[5].y && kp[12].y > kp[9].y && kp[16].y > kp[13].y;
      if (thumbUp && fingersCurled) {
        rawThumb = true;
      }

      
      // Shush & Think: Require index finger UP and others curled
      let indexUp = kp[8].y < kp[6].y;
      let middleCurled = kp[12].y > kp[9].y;
      
      if (indexUp && middleCurled) {
        if (lipX !== undefined && headX !== undefined) {
          let dLips = dist(kp[8].x, kp[8].y, lipX, lipY);
          let dHead = dist(kp[8].x, kp[8].y, headX, headY);
          
          if (dLips < 60 && dLips < dHead) {
            rawShush = true;
          } else if (dHead < 100 && dHead <= dLips) {
            rawThink = true;
          }
        }
      }
    }
  }
  


  let rawBinocPullApart = false;
  // 3. Binoculars & Dual L-Frame Photo Gesture (Requires 2 Hands)
  if (hands.length >= 2) {
    let kp1 = hands[0].keypoints;
    let kp2 = hands[1].keypoints;
    
    let isH1L = isLHand(kp1);
    let isH2L = isLHand(kp2);

    if (isH1L && isH2L) {
      rawPhotoClick = true;
      rawThink = false;
      rawShush = false;
      rawThumb = false;
    } else {
      // Binoculars: thumbs and indexes pinched together on both hands
      let h1PinchBinoc = distKp(kp1[4], kp1[8]) < 40;
      let h2PinchBinoc = distKp(kp2[4], kp2[8]) < 40;
      
      if (h1PinchBinoc && h2PinchBinoc && kp1[0].y < height * 0.6 && kp2[0].y < height * 0.6) {
        let handDist = distKp(kp1[0], kp2[0]);
        if (handDist > 250) {
          rawBinocPullApart = true;
        } else {
          rawBinoc = true;
          rawThumb = false; // Prevent confusion
        }
      }
    }
  }

  // Keyboard Backups
  if (keyIsDown(77)) rawMouth = true; // M
  if (keyIsDown(67)) rawClose = true; // C
  if (keyIsDown(73)) rawThink = true; // I
  if (keyIsDown(66)) rawBinoc = true; // B
  if (keyIsDown(81)) rawShush = true; // Q
  if (keyIsDown(80)) rawPhotoClick = true; // P 
  if (keyIsDown(74)) rawThumb = true; // J

  let isMouthOpen = updateBuffer("mouthOpen", rawMouth);
  let isTooClose = updateBuffer("tooClose", rawClose); 
  let isThinking = updateBuffer("thinking", rawThink); 
  let isBinoculars = updateBuffer("binoculars", rawBinoc, 15); // Require holding for 15 frames (~0.25s) to avoid accidental triggers
  let isBinocPullApart = updateBuffer("binocPull", rawBinocPullApart, 10);
  let isShush = updateBuffer("shush", rawShush);
  let isPhotoClick = updateBuffer("photoClick", rawPhotoClick);
  let isOkGesture = updateBuffer("okGesture", rawOkGesture, 10);
  let isPalm = updateBuffer("palm", rawPalm, 5);
  
  if (gestureBuffer["palm"] === 0) {
    hasReleasedPalm = true;
  }
  let validPalm = false;
  if (isPalm && hasReleasedPalm) {
    validPalm = true;
    hasReleasedPalm = false;
  }

  // Revert back to quick thumbs up buffer, using release-to-reset logic
  let isThumbsUp = updateBuffer("thumbsUp", rawThumb);

  if (gestureBuffer["thumbsUp"] === 0) {
    hasReleasedThumb = true;
  }

  let validThumbsUp = false;
  if (isThumbsUp && hasReleasedThumb) {
    validThumbsUp = true;
    hasReleasedThumb = false; 
    // We don't reset to 0 here because they are holding it, but hasReleasedThumb prevents double firing
  }

  let binocularToggled = false;
  if (isBinoculars && !prevBinoculars) {
    binocularToggled = true;
  }
  prevBinoculars = isBinoculars;

  let shushToggled = false;
  if (isShush && !prevShush) {
    shushToggled = true;
  }
  prevShush = isShush;

  // Stabilize face count over ~45 frames (0.75 seconds)
  faceCountHistory.push(faces.length);
  if (faceCountHistory.length > 45) {
    faceCountHistory.shift();
  }
  stableFaceCount = Math.max(...faceCountHistory);

  return { isMouthOpen, isTooClose, isThinking, isBinoculars, isBinocPullApart, binocularToggled, shushToggled, isShush, isPhotoClick, validThumbsUp, isOkGesture, isPalm, validPalm };
}

// --- MAIN DRAW LOOP ---
function draw() {
  background(0);

  let g = { isMouthOpen: false, isTooClose: false, isThinking: false, isBinoculars: false, isBinocPullApart: false, binocularToggled: false, shushToggled: false, isShush: false, isPhotoClick: false, validThumbsUp: false, isOkGesture: false, isPalm: false, validPalm: false };
  
  if (cameraReady) {
    g = checkGestures();
  }

  // Handle BGM Volume: 100% while shush is held, 30% otherwise
  if (bgmSound && bgmSound.isLoaded()) {
    let targetVolume = g.isShush ? 1.0 : 0.3;
    if (bgmVolumeState !== targetVolume) {
      bgmVolumeState = targetVolume;
      bgmSound.setVolume(bgmVolumeState, 0.5); // 0.5s smooth transition
    }
  }

  if (state !== "START_SCREEN" && state !== "TRAILER") {
    audioLevel = mic.getLevel();
  }
  
  if (state.includes("BEAR")) {
    if (audioLevel > 0.25 || keyIsDown(83)) { 
      if (roarVideo) roarVideo.stop();
      if (idleVideo) idleVideo.stop();
      if (state !== "BEAR_WALKAWAY") {
        state = "BEAR_WALKAWAY";
        if (walkawayVideo) { walkawayVideo.time(0); walkawayVideo.loop(); }
      }
    }

    if (g.binocularToggled && millis() - stateLockTimer > 1000) {
      if (roarVideo) roarVideo.stop();
      if (walkawayVideo) walkawayVideo.stop();
    if (bsVideo) bsVideo.stop();
    if (ellaIntroVideo) ellaIntroVideo.stop();
    ellaIntroFinished = false;
    ellaStartFinished = false;
    ellaEndFinished = false;
    if (flip1) flip1.stop();
    if (flip2) flip2.stop();
    if (flip3) flip3.stop();
    if (flip4) flip4.stop();
    if (ellaStartVideo) ellaStartVideo.stop();
    if (ellaEndVideo) ellaEndVideo.stop();
    bsFinishedFlag = false;
      if (idleVideo) idleVideo.stop();
      state = "ZOOMING_OUT";
      stateLockTimer = millis();
    }
  }

  if (state.includes("BEAR") && g.isPhotoClick) {
    if (millis() - lastCameraFlashTime > 5000) {
      cameraFlash = 255;
      shutterAnimTimer = millis(); 
      saveCanvas('bear_experience_snapshot', 'png');
      lastCameraFlashTime = millis();
    }
    gestureBuffer.photoClick = 0; 
  }



  // Global override to enter Ella sequence
  if (state.includes("BEAR") && g.isOkGesture && millis() - stateLockTimer > 1000) {
    if (roarVideo) roarVideo.stop();
    if (walkawayVideo) walkawayVideo.stop();
    if (idleVideo) idleVideo.stop();
    state = "ELLA_START";
    if (ellaStartVideo) { ellaStartVideo.time(0); ellaStartVideo.play(); ellaStartFinished = false; }
    stateLockTimer = millis();
  }

  // Global override to exit Ella sequence
  if ((state.includes("ELLA_") || state.includes("FLIP")) && keyIsDown(13) && millis() - stateLockTimer > 1000) {
    if (flip1) flip1.stop();
    if (flip2) flip2.stop();
    if (flip3) flip3.stop();
    if (flip4) flip4.stop();
    if (ellaStartVideo) ellaStartVideo.stop();
    if (ellaEndVideo) ellaEndVideo.stop();
    state = "BEAR_DEFAULT";
    stateLockTimer = millis();
  }

  // Global reset
  if (keyIsDown(82)) { // 'R' key
    state = "TRAILER"; // Or START_SCREEN
    if (trailerVideo) trailerVideo.loop();
    if (jungleVideo) jungleVideo.stop();
    if (roarVideo) roarVideo.stop();
    if (idleVideo) idleVideo.stop();
    if (walkawayVideo) walkawayVideo.stop();
    if (bsVideo) bsVideo.stop();
    if (ellaIntroVideo) ellaIntroVideo.stop();
    ellaIntroFinished = false;
    ellaStartFinished = false;
    ellaEndFinished = false;
    if (flip1) flip1.stop();
    if (flip2) flip2.stop();
    if (flip3) flip3.stop();
    if (flip4) flip4.stop();
    if (ellaStartVideo) ellaStartVideo.stop();
    if (ellaEndVideo) ellaEndVideo.stop();
    bsFinishedFlag = false;
  }

  switch (state) {
    case "START_SCREEN":
      drawStartScreen();
      break;

    case "TRAILER":
      if (trailerVideo && trailerVideo.elt.readyState >= 2) {
        image(trailerVideo, 0, 0, width, height);
      } else {
        drawFallbackText("Loading Trailer...");
      }
      
      if (stableFaceCount > 0 || keyIsDown(32)) {
        if (trailerVideo) trailerVideo.stop();
        state = "INTRO";
      }
      break;

    case "INTRO":
      drawAssetSafe(images["intro"], "Intro.png");
      
      fill(255);
      textSize(20);
      textAlign(CENTER, BOTTOM);
      
      text("Detected players: " + stableFaceCount + " (Give a Thumbs Up to confirm!)", width/2, height - 30);

      if (g.validThumbsUp && millis() - stateLockTimer > 1000) { 
        targetPlayerCount = constrain(stableFaceCount > 0 ? stableFaceCount : 1, 1, 4);
        setupSequence = buildSetupSequence(targetPlayerCount);
        setupIndex = 0;
        
        if (setupSequence.length === 0) {
          state = "BS_VIDEO";
          bsFinishedFlag = false;
        } else {
          state = "SETUP_SEQUENCE";
        }
        stateLockTimer = millis();
      }
      break;

    case "SETUP_SEQUENCE":
      if (!setupSequence || setupIndex >= setupSequence.length) {
        state = "BS_VIDEO";
          bsFinishedFlag = false;
        break;
      }
      let currentStep = setupSequence[setupIndex];
      if (currentStep.type === "player") {
        drawAssetSafe(images["player" + currentStep.id], "Player.png");
      } else {
        drawAssetSafe(getRoleImage(currentStep.id), "Role.png");
      }
      
      fill(255);
      textSize(24);
      textAlign(CENTER, BOTTOM);
      if (currentStep.type === "player") {
        text("Next Player: Raise Thumbs Up!", width/2, height - 40);
      } else {
        text("Raise Thumbs Up to claim this role!", width/2, height - 40);
      }

      if (g.validThumbsUp && millis() - stateLockTimer > 1000) {
        setupIndex++;
        if (setupIndex >= setupSequence.length) {
          state = "BS_VIDEO";
          bsFinishedFlag = false;
        }
        stateLockTimer = millis();
      }
      break;

    case "BS_VIDEO":
      if (bsVideo && bsVideo.elt.readyState >= 2) {
        if (bsVideo.elt.paused && !bsFinishedFlag) bsVideo.play();
        imageMode(CENTER);
        let h = height;
        let w = (bsVideo.width / bsVideo.height) * height;
        if (w < width) { w = width; h = (bsVideo.height / bsVideo.width) * width; }
        image(bsVideo, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else {
        drawFallbackText("Loading bs_v2.mp4...");
      }

      if (bsFinishedFlag) {
        state = "ELLA_INTRO";
        stateLockTimer = millis();
        bsFinishedFlag = false;
        if (bsVideo) bsVideo.stop();
        if (ellaIntroVideo) { ellaIntroVideo.time(0); ellaIntroVideo.play(); ellaIntroFinished = false; }
      }
      break;



    case "ELLA_INTRO":
      if (ellaIntroVideo && ellaIntroVideo.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height; let w = (ellaIntroVideo.width / ellaIntroVideo.height) * height;
        if (w < width) { w = width; h = (ellaIntroVideo.height / ellaIntroVideo.width) * width; }
        image(ellaIntroVideo, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else { drawFallbackText("1ella.mp4"); }
      
      if (ellaIntroFinished) {
        if (ellaIntroVideo) ellaIntroVideo.stop();
        ellaIntroFinished = false;
        state = "JUNGLE";
        stateLockTimer = millis();
      }
      break;

    case "JUNGLE":
      drawAssetSafe(getJungleAsset(), "wholejungle.mp4");

      if (g.binocularToggled) {
        state = "BINOCULAR_VIEW";
        stateLockTimer = millis();
        // Initialize mask exactly in the center
        targetMaskX = width / 2;
        targetMaskY = height / 2;
        smoothedMaskX = width / 2;
        smoothedMaskY = height / 2;
      }
      break;

    case "BINOCULAR_VIEW":
      drawAssetSafe(getJungleAsset(), "wholejungle.mp4");
      
      // Update target mask position based on average index finger position
      if (hands.length >= 2) {
        let h1 = hands[0].keypoints[8];
        let h2 = hands[1].keypoints[8];
        let avgX = (h1.x + h2.x) / 2;
        let avgY = (h1.y + h2.y) / 2;
        targetMaskX = map(avgX, 0, 640, 0, width);
        targetMaskY = map(avgY, 0, 480, 0, height);
      }
      
      // Smoothly interpolate the mask position so it feels natural
      smoothedMaskX = lerp(smoothedMaskX, targetMaskX, 0.15);
      smoothedMaskY = lerp(smoothedMaskY, targetMaskY, 0.15);
      
      drawBinocularMask(smoothedMaskX, smoothedMaskY);
      
      fill(255);
      textSize(24);
      textAlign(CENTER, BOTTOM);
      text("Pull your hands apart to Zoom In!", width/2, height - 40);

      // Trigger zoom if they pull hands apart, or if they drop the gesture (natural exit)
      if (g.isBinocPullApart || (!g.isBinoculars && millis() - stateLockTimer > 1500)) {
        state = "ZOOMING_IN";
        stateLockTimer = millis();
      }
      break;
      
    case "ZOOMING_IN":
      let progress = (millis() - stateLockTimer) / 1000.0; // 1 second zoom duration
      if (progress >= 1.0) {
        state = "BEAR_DEFAULT";
        if (jungleVideo) jungleVideo.stop();
        stateLockTimer = millis();
      } else {
        push();
        translate(width / 2, height / 2);
        scale(1.0 + progress * 2.0); // Scale up from 1x to 3x smoothly
        imageMode(CENTER);
        let img = getJungleAsset();
        if (img && img.width > 10) {
          let h = height;
          let w = (img.width / img.height) * height;
          if (w < width) { w = width; h = (img.height / img.width) * width; }
          image(img, 0, 0, w, h);
        }
        pop();
      }
      break;

    case "ZOOMING_OUT":
      let outProgress = (millis() - stateLockTimer) / 1000.0; // 1 second zoom duration
      if (outProgress >= 1.0) {
        state = "JUNGLE";
        stateLockTimer = millis();
      } else {
        push();
        translate(width / 2, height / 2);
        scale(3.0 - outProgress * 2.0); // Scale down from 3x to 1x smoothly
        imageMode(CENTER);
        let img = getJungleAsset();
        if (img && img.width > 10) {
          let h = height;
          let w = (img.width / img.height) * height;
          if (w < width) { w = width; h = (img.height / img.width) * width; }
          image(img, 0, 0, w, h);
        }
        pop();
      }
      break;

    case "BEAR_DEFAULT":
      if (roarVideo) { roarVideo.stop(); roarVideo.hide(); }
      if (walkawayVideo) { walkawayVideo.stop(); walkawayVideo.hide(); } 
      
      if (idleVideo && idleVideo.elt.paused) {
        idleVideo.loop();
      }

      let shutterScale = 1.0;
      if (millis() - shutterAnimTimer < 400) {
        shutterScale = 1.15; 
      }

      push();
      translate(width / 2, height / 2);
      scale(shutterScale);
      imageMode(CENTER);
      if (idleVideo && idleVideo.elt.readyState >= 2) {
        image(idleVideo, 0, 0, width, height);
      } else {
        if (images["bear2"]) image(images["bear2"], 0, 0, width, height);
      }
      pop();
      
      if (millis() - stateLockTimer > 500) {
        if (g.isTooClose) { 
          if (idleVideo) idleVideo.stop();
          state = "CAUTION"; stateLockTimer = millis(); 
        }
        else if (g.isMouthOpen) { 
          if (idleVideo) idleVideo.stop();
          state = "BEAR_ROAR"; 
          stateLockTimer = millis(); 
          if (roarVideo) { roarVideo.time(0); roarVideo.loop(); }
        }
        else if (g.isThinking) { 
          state = "BEAR_INFO"; stateLockTimer = millis(); 
        }
      }
      break;

    case "BEAR_ROAR":
      if (roarVideo && roarVideo.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height;
        let w = (roarVideo.width / roarVideo.height) * height;
        if (w < width) { w = width; h = (roarVideo.height / roarVideo.width) * width; }
        image(roarVideo, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else {
        drawAssetSafe(images["bear_roar"], "Roar_v2.mp4");
      }

      if (!g.isMouthOpen && millis() - stateLockTimer > 500) {
        state = "BEAR_DEFAULT";
        stateLockTimer = millis();
      }
      break;

    case "BEAR_INFO":
      if (idleVideo && idleVideo.elt.paused) {
        idleVideo.loop();
      }

      push();
      translate(width / 2, height / 2);
      imageMode(CENTER);
      
      // 1. Draw idle background
      if (idleVideo && idleVideo.elt.readyState >= 2) {
        image(idleVideo, 0, 0, width, height);
      } else {
        if (images["bear2"]) image(images["bear2"], 0, 0, width, height);
      }
      
      // 2. Draw infopop overlay
      let popImg = images["infopop"];
      if (popImg && popImg.width > 10) {
        // Calculate fullscreen size to maintain aspect ratio
        let baseH = height;
        let baseW = (popImg.width / popImg.height) * baseH;
        if (baseW < width) { baseW = width; baseH = (popImg.height / popImg.width) * width; }
        
        // Scale down to half size
        let popW = baseW * 0.5;
        let popH = baseH * 0.5;
        
        // Right align (with 20px margin from the right edge)
        let popX = (width / 2) - (popW / 2) - 20;
        let popY = 0; // Vertically centered
        
        image(popImg, popX, popY, popW, popH);
      } else {
        drawFallbackText("Missing: infopop.png");
      }
      pop();

      if (!g.isThinking && millis() - stateLockTimer > 500) {
        state = "BEAR_DEFAULT";
        stateLockTimer = millis();
      }
      break;

    case "CAUTION":
      drawAssetSafe(images["caution"], "caution.png");
      if (!g.isTooClose && millis() - stateLockTimer > 500) {
        state = "BEAR_DEFAULT";
        stateLockTimer = millis();
      }
      break;

    case "BEAR_WALKAWAY":
      if (roarVideo) roarVideo.stop();
      if (walkawayVideo && walkawayVideo.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height;
        let w = (walkawayVideo.width / walkawayVideo.height) * height;
        if (w < width) { w = width; h = (walkawayVideo.height / walkawayVideo.width) * width; }
        image(walkawayVideo, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else {
        drawAssetSafe(images["bear_walkaway"], "walkaway.mp4");
      }
      
      if (audioLevel < 0.1) {
        if (!silenceTimer) silenceTimer = millis();
        else if (millis() - silenceTimer > 4000) {
          state = "BEAR_DEFAULT";
          silenceTimer = 0;
          stateLockTimer = millis();
        }
      } else {
        silenceTimer = 0; 
      }
      break;








    case "ELLA_START":
      if (ellaStartVideo && ellaStartVideo.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height; let w = (ellaStartVideo.width / ellaStartVideo.height) * height;
        if (w < width) { w = width; h = (ellaStartVideo.height / ellaStartVideo.width) * width; }
        image(ellaStartVideo, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else { drawFallbackText("2ella.mp4"); }
      if (ellaStartFinished) {
        if (ellaStartVideo) ellaStartVideo.stop();
        ellaStartFinished = false;
        state = "FLIP1";
        if (flip1) { flip1.time(0); flip1.play(); }
        stateLockTimer = millis();
      }
      break;

    case "FLIP1":
      if (flip1 && flip1.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height; let w = (flip1.width / flip1.height) * height;
        if (w < width) { w = width; h = (flip1.height / flip1.width) * width; }
        image(flip1, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else { drawFallbackText("FLIP1.mp4"); }
      
      fill(255); textSize(24); textAlign(CENTER, BOTTOM);
      text("Show Open Palm to turn the page!", width/2, height - 40);

      if (g.validPalm && millis() - stateLockTimer > 1000) {
        if (flip1) flip1.stop();
        state = "FLIP2";
        stateLockTimer = millis();
        if (flip2) { flip2.time(0); flip2.play(); }
      }
      break;

    case "FLIP2":
      if (flip2 && flip2.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height; let w = (flip2.width / flip2.height) * height;
        if (w < width) { w = width; h = (flip2.height / flip2.width) * width; }
        image(flip2, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else { drawFallbackText("FLIP2.mp4"); }
      
      fill(255); textSize(24); textAlign(CENTER, BOTTOM);
      text("Show Open Palm to turn the page!", width/2, height - 40);

      if (g.validPalm && millis() - stateLockTimer > 1000) {
        if (flip2) flip2.stop();
        state = "FLIP3";
        stateLockTimer = millis();
        if (flip3) { flip3.time(0); flip3.play(); }
      }
      break;

    case "FLIP3":
      if (flip3 && flip3.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height; let w = (flip3.width / flip3.height) * height;
        if (w < width) { w = width; h = (flip3.height / flip3.width) * width; }
        image(flip3, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else { drawFallbackText("FLIP3.mp4"); }
      
      fill(255); textSize(24); textAlign(CENTER, BOTTOM);
      text("Show Open Palm to turn the page!", width/2, height - 40);

      if (g.validPalm && millis() - stateLockTimer > 1000) {
        if (flip3) flip3.stop();
        state = "FLIP4";
        stateLockTimer = millis();
        if (flip4) { flip4.time(0); flip4.play(); }
      }
      break;

    case "FLIP4":
      if (flip4 && flip4.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height; let w = (flip4.width / flip4.height) * height;
        if (w < width) { w = width; h = (flip4.height / flip4.width) * width; }
        image(flip4, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else { drawFallbackText("FLIP4.mp4"); }
      
      fill(255); textSize(24); textAlign(CENTER, BOTTOM);
      text("Raise Thumbs Up to finish reading!", width/2, height - 40);

      if (g.validThumbsUp && millis() - stateLockTimer > 1000) {
        if (flip4) flip4.stop();
        state = "ELLA_END";
        if (ellaEndVideo) { ellaEndVideo.time(0); ellaEndVideo.play(); ellaEndFinished = false; }
        stateLockTimer = millis();
      }
      break;

    case "ELLA_END":
      if (ellaEndVideo && ellaEndVideo.elt.readyState >= 2) {
        imageMode(CENTER);
        let h = height; let w = (ellaEndVideo.width / ellaEndVideo.height) * height;
        if (w < width) { w = width; h = (ellaEndVideo.height / ellaEndVideo.width) * width; }
        image(ellaEndVideo, width / 2, height / 2, w, h);
        imageMode(CORNER);
      } else { drawFallbackText("3ella.mp4"); }
      
      if (ellaEndFinished) {
        if (ellaEndVideo) ellaEndVideo.stop();
        ellaEndFinished = false;
        state = "JUNGLE";
        stateLockTimer = millis();
      }
      break;
  }

  if (cameraFlash > 0) {
    fill(255, cameraFlash);
    noStroke();
    rect(0, 0, width, height);
    cameraFlash -= 15; 
  }

  if (state !== "START_SCREEN") {
    if (state === "JUNGLE" || state === "BINOCULAR_VIEW") {
      drawGestureHUD("gestures1");
    } else if (state.includes("BEAR") || state.includes("ELLA_") || state.includes("FLIP")) {
      drawGestureHUD("gestures2");
    }

    drawCameraPreview();
    
    if (showDebugHUD) {
      drawStatusHUD(g);
    }
  }
}

// --- HELPERS & OVERLAYS ---

function getRoleImage(index) {
  if (index === 1) return images["watcher"];
  if (index === 2) return images["spotter"];
  if (index === 3) return images["listener"];
  return images["researcher"];
}

function drawStartScreen() {
  background(20);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("Click Anywhere to Start Experience", width / 2, height / 2 - 20);
}

function mousePressed() {
  if (state === "START_SCREEN") {
    userStartAudio();
    try { mic.start(); } catch(e) {}
    
    initMacCamera(); 
    if (trailerVideo) {
      trailerVideo.loop();
    }
    // Start background jungle music at 50% volume
    if (bgmSound && !bgmSound.isPlaying()) {
      bgmSound.loop();
      bgmSound.setVolume(bgmVolumeState);
    }
    state = "TRAILER";
  }
}

function drawCameraPreview() {
  if (videoCapture) {
    push();
    translate(15 + 140, height - 135);
    scale(-1, 1);
    imageMode(CORNER);
    image(videoCapture, 0, 0, 140, 105);
    pop();
    
    push();
    translate(15, height - 135);
    let sX = 140 / 640;
    let sY = 105 / 480;
    
    // Draw Hand Meshes
    for (let h of hands) {
      fill(0, 255, 200);
      noStroke();
      for (let kp of h.keypoints) {
        circle(kp.x * sX, kp.y * sY, 3.5);
      }
    }
    
    // Draw Face Meshes
    for (let f of faces) {
      fill(255, 100, 100);
      noStroke();
      for (let kp of f.keypoints) {
        circle(kp.x * sX, kp.y * sY, 1.5);
      }
    }
    pop();

    fill(0, 160);
    noStroke();
    rect(15, height - 135, 140, 20);
    fill(0, 255, 100);
    textSize(10);
    textAlign(LEFT, CENTER);
    text(`Hands: ${hands.length} | Faces: ${stableFaceCount} | BGM: ${int(bgmVolumeState * 100)}%`, 20, height - 125);
  }
}

function drawStatusHUD(g) {
  push();
  fill(0, 180);
  noStroke();
  rect(15, 15, 340, 210, 8);

  fill(255);
  textSize(13);
  textStyle(BOLD);
  text("GESTURE HUD & DEBUG", 30, 35);

  textStyle(NORMAL);
  textSize(11);
  text(`State: ${state}`, 30, 60);
  text(`Target Players: ${targetPlayerCount} (Faces seen: ${stableFaceCount})`, 30, 80);
  text(`BGM Volume: ${int(bgmVolumeState * 100)}% (Shush to 100%)`, 30, 100);
  text(`Mouth Open: ${g.isMouthOpen ? 'YES' : 'No'} | Shush Hold: ${g.isShush ? 'YES' : 'No'}`, 30, 120);
  text(`Too Close: ${g.isTooClose ? 'YES' : 'No'} | Audio: ${nf(audioLevel, 1, 2)}`, 30, 140);
  text(`OK Sign: ${g.isOkGesture ? 'YES' : 'No'} | Palm: ${g.isPalm ? 'YES' : 'No'}`, 30, 160);
  text(`Photo Ready: ${millis() - lastCameraFlashTime > 5000 ? 'YES' : 'Cooldown'}`, 30, 180);

  fill(255);
  let prompt = "";
  if (state === "TRAILER") prompt = "Trailer playing. Step in front of camera!";
  else if (state === "INTRO") prompt = "Counting players in frame...";
  else if (state.includes("SHOW")) prompt = "LOWER your hand, then raise a NEW Thumbs Up";
  else if (state === "BS_VIDEO") prompt = "Enjoy the video transition...";
  else if (state === "JUNGLE") prompt = "Make Binoculars to Zoom In | Shush Finger to Toggle BGM Volume";
  else if (state === "ZOOMING_IN") prompt = "Zooming into the bear...";
  else if (state.includes("BEAR")) prompt = "Mouth = Roar | Binoc = Zoom Out | OK Sign = Journal";
  else if (state.includes("ELLA_") || state.includes("FLIP")) prompt = "Thumb Up = Next | Palm = Swipe Page | ENTER = Exit";
  text(prompt, 30, 190);
  pop();
}

function drawAssetSafe(img, filename) {
  if (img && img.width > 10) {
    let h = height;
    let w = (img.width / img.height) * height;
    if (w < width) {
      w = width;
      h = (img.height / img.width) * width;
    }
    imageMode(CENTER);
    image(img, width / 2, height / 2, w, h);
    imageMode(CORNER);
  } else {
    background(30);
    fill(255, 120, 120);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("Loading / Missing Asset: " + filename, width / 2, height / 2);
    textSize(13);
    fill(200);
    text("Check file names in your p5.js project panel!", width / 2, height / 2 + 35);
  }
}

function drawFallbackText(msg) {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(msg, width / 2, height / 2);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

function buildSetupSequence(players) {
  let seq = [];
  if (players === 1) {
    // If only 1 player is detected, skip role menu entirely
    return seq;
  } 
  
  if (players >= 2) {
    seq.push({ type: "player", id: 1 });
    seq.push({ type: "role", id: 1 }); // Watcher
    
    seq.push({ type: "player", id: 2 });
    seq.push({ type: "role", id: 2 }); // Spotter
  } 
  
  if (players >= 3) {
    seq.push({ type: "player", id: 3 });
    seq.push({ type: "role", id: 3 }); // Listener
  } 
  
  if (players >= 4) {
    seq.push({ type: "player", id: 4 });
    seq.push({ type: "role", id: 4 }); // Researcher
  }
  
  return seq;
}

function drawBinocularMask(cx, cy) {
  let mw = width * 3;
  let mh = height * 3;
  
  if (!maskLayer || maskLayer.width !== mw) {
    maskLayer = createGraphics(mw, mh);
    maskLayer.clear();
    maskLayer.background(0); // Fill with black
    maskLayer.erase(); // Erase holes
    // Two circles in the center of the giant mask layer
    maskLayer.circle(mw / 2 - 120, mh / 2, 350);
    maskLayer.circle(mw / 2 + 120, mh / 2, 350);
    maskLayer.noErase();
  }
  
  push();
  imageMode(CENTER);
  // Center of the mask layer matches the center of the holes, so drawing it at cx, cy places the holes at cx, cy.
  image(maskLayer, cx, cy);
  pop();
}

function drawGestureHUD(imgKey) {
  let img = images[imgKey];
  if (img && img.width > 10) {
    push();
    imageMode(CORNER);
    
    // Scale to a reasonable size (e.g., 30% of screen height)
    let h = height * 0.30;
    let w = (img.width / img.height) * h;
    
    // Draw on extreme right, vertically centered
    let x = width - w - 20; 
    let y = (height / 2) - (h / 2);
    
    image(img, x, y, w, h);
    pop();
  }
}

function keyPressed() {
  // 'K' key toggles all HUDs and overlays
  if (keyCode === 75) {
    showDebugHUD = !showDebugHUD;
  }
}
