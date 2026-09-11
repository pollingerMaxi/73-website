// ==UserScript==
// @name         Hero Wars Alliance — Guild Dungeon
// @namespace    https://github.com/pollingerMaxi/hwa-auto-dungeon
// @version      0.13.0
// @description  Plays the guild dungeon: picks rooms by element, keeps the healing slot filled, and refuses to fight an understrength team.
// @match        https://www.hero-wars-alliance.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://seventhree.dev/downloads/hwa-dungeon.user.js
// @downloadURL  https://seventhree.dev/downloads/hwa-dungeon.user.js
// ==/UserScript==

"use strict";
(() => {
  // config/chrome.json
  var chrome_default = {
    "//calibrated": "Every coordinate below traces to a measurement off a real 1800x875 frame.",
    calibrated: true,
    "//session": "Which way the runner reaches the game. Each backend is calibrated separately, so a config file belongs to exactly one of them - see config/android.json for the native client.",
    session: {
      backend: "chrome",
      chrome: {
        gameUrl: "https://www.hero-wars-alliance.com/",
        "//userDataDir": "Sits at the repository root rather than inside this client, because it predates the split into per-client directories and a live Chrome was holding it when the move happened. Relocating a profile out from under a running browser risks the logged-in session, and there is nothing to gain by hurrying it. Move it to runner/.chrome-profile with the browser closed and drop the `../` whenever convenient.",
        userDataDir: "../.chrome-profile",
        viewport: { width: 1800, height: 875 },
        "//remoteDebuggingPort": "The browser is launched with this port open so a later run can reconnect instead of reloading the game and walking back to the dungeon by hand. Only reachable from this machine.",
        remoteDebuggingPort: 9222
      }
    },
    strategy: {
      elementPriority: ["water", "earth", "mix", "fire"],
      "//team": "Never start a fight with fewer than requiredTitans titans. The cost of getting this wrong is the day, not the battle: the titans that survive an understrength fight are damaged or dead for the rest of it, so the next fight is entered weaker still - one run went in with three, lost them all, and the remaining titans died in the following battle. allowIncompleteTeam is for anybody who runs short-handed on purpose.",
      team: {
        requiredTitans: 5,
        allowIncompleteTeam: false
      },
      healing: {
        healAtOrBelowHealth: 0.8,
        "//candidates": "The titans allowed in the rotating slot, most preferred first, and the order is the whole preference: the first name wins when two are equally hurt - within five points - and takes the slot when neither needs healing. Two separate fields used to say that and both said angus. Every name here needs a portrait below, because a titan is only identifiable by its artwork.",
        candidates: ["angus", "moloch"],
        "//portraits": "Each tank is found by matching its portrait artwork against every card in the roster, because the strip re-sorts as titans level up and a pinned index silently starts reading someone else's health. Regenerate these crops with `npm run tank-templates -- <capture>` if the artwork ever changes.",
        portraits: {
          angus: "fixtures/templates/angus.png",
          moloch: "fixtures/templates/moloch.png"
        },
        "//maxPortraitDistance": "Absolute ceiling. Every genuine match measured across four real frames - fielded, not fielded, alive and dead - scores under 0.04.",
        maxPortraitDistance: 0.1,
        "//minPortraitMargin": "How far the best-matching card must beat the second best. This is the real test. Measured: a tank that is present beats the runner-up by 0.15 or more, while a tank that is absent produces a best and second best within 0.004 of each other, because nothing matches and the ranking is just noise. An earlier value of 0.03 was set before contrast normalisation and stopped a run at a margin of 0.028.",
        minPortraitMargin: 0.08
      }
    },
    limits: {
      maxBattles: 100,
      stopWhenOutOfAttempts: true
    },
    "//coordinates": "All positions are fractions of the viewport (0..1), NOT pixels. They are multiplied by the live viewport at runtime so the script survives window resizing. Boxes are {x, y, w, h} with x/y as the top-left corner. Re-derive these with `npm run calibrate` if the game layout changes.",
    coordinates: {
      dungeonMap: {
        toBattleBanner: { x: 0.3125, y: 0.2572 }
      },
      "//battleChoice": "The choice screen has two layouts. Usually two panels side by side; sometimes a single panel, centred, with only one Attack button. The centre probe is what tells them apart, since the two-panel layout has only a divider there.",
      battleChoice: {
        left: {
          elementEmblem: { x: 0.281, y: 0.632, w: 0.07, h: 0.07 },
          attackButton: { x: 0.3106, y: 0.811 }
        },
        right: {
          elementEmblem: { x: 0.651, y: 0.632, w: 0.07, h: 0.07 },
          attackButton: { x: 0.6857, y: 0.811 }
        },
        single: {
          elementEmblem: { x: 0.465, y: 0.632, w: 0.07, h: 0.07 },
          attackButton: { x: 0.5, y: 0.811 }
        }
      },
      teamSelect: {
        "//canvasArea": "The slice of the calibrated viewport the game canvas actually occupied, measured in the page: the canvas is 1800x822 at top 52.5 of an 1800x875 viewport, because the black header above it is DOM and not canvas. Only the in-page backend needs this, and it is what makes that backend resolution-independent: it scales whatever size canvas the player's window produces into this rectangle, so one set of measured constants serves every window size whose canvas has this shape. A screenshot backend needs nothing here, since it photographs the header along with everything else.",
        canvasArea: { x: 0, y: 0.06, w: 1, h: 0.93943 },
        autoBattleButton: { x: 0.8724, y: 0.7743 },
        toBattleButton: { x: 0.8724, y: 0.9016 },
        "//emptySlots": "The gold chevron on an unfilled team slot, which is how the runner refuses to fight understrength. The formation is five: three across the top at 0.110, 0.253 and 0.402, and two below at 0.183 and 0.329. Four are blob centroids measured on two empty-team frames that agreed to within 0.005. The fifth could not be measured that way - the 'Choose titans to enter battle' banner covers all but its tip, and that banner is only drawn on a completely EMPTY team - so it was derived instead from a live four-of-five frame: the three occupied slots whose centres were already known each sat 0.005 from their titan's name plate, spread 0.004, and the fourth titan's plate put the remaining slot at 0.253. Do not widen this by colour - a full team produces MORE gold blobs in the arena than an empty one (35 against 10) because titan armour is gold, so it is size, shape and position together that identify the marker.",
        emptySlots: {
          centers: [
            { x: 0.11, y: 0.347 },
            { x: 0.253, y: 0.347 },
            { x: 0.402, y: 0.347 },
            { x: 0.183, y: 0.459 },
            { x: 0.329, y: 0.458 }
          ],
          "//marker": "Re-measured after decodePng stopped applying embedded ICC profiles, over the nine real chevrons in this corpus - four on emptyteam-mixed-01.png, four on emptyteam-waterdead-01.png, and the one at slot 0 of 2026-08-09T19-20-48-352Z_abort.png: 104-124 pixels, aspect 1.214-1.385, fill 0.449-0.521. What has to be excluded is the gold-armoured titan who stands at slot 2 on four team-select frames, 0.016-0.018 from the slot centre and so NOT excluded by position: 71-81 pixels, aspect 0.500-0.550, fill 0.327-0.405. Three of the four bounds turn him away independently (pixels, aspect, and the gold band below), and the fill floor is not one of them - his fill sits above it, not below. maxFillRatio is the tightest bound in this block, 0.029 above the widest real marker, and the ICC fix is what narrowed it: with the profile applied those same nine markers filled 0.339-0.493. Nothing measured asks it to move, and widening it without a blob to exclude would be a guess.",
          marker: {
            minPixels: 88,
            maxPixels: 135,
            minAspect: 0.95,
            maxAspect: 1.45,
            minFillRatio: 0.28,
            maxFillRatio: 0.55,
            positionTolerance: 0.03,
            "//coverageBox": "The box the gold-coverage test is taken over, centred on the slot.",
            coverageBox: { w: 0.034, h: 0.062 },
            "//goldCoverage": "A BAND, and the band is the point. A marker is a fixed glyph on empty floor and always covers about the same share of its box: 0.1840 to 0.2005 measured over nine slots across three rooms that look nothing alike. An occupied slot misses the band from one side or the other - a titan standing on the marker hides it and scores 0.000 to 0.028, while one in gold armour scores 0.2976 to 0.3024, MORE gold than the marker itself. Treating more gold as more marker-like is what stopped a run on an earth floor, where the whole team is green and gold. The ICC fix moved both edges inward: the armoured titan used to score 0.2987-0.3226, so the ceiling's margin above him fell from 0.0487 to 0.0476, and the markers used to score 0.1648-0.2005, so the floor's margin below them rose from 0.0548 to 0.0740.",
            minGoldCoverage: 0.11,
            maxGoldCoverage: 0.25
          }
        },
        "//roster": "Derived by detecting the gold energy bars, one per card, on a real 1800x875 capture: 11 cards at 203.5, 316.5, 429.5 ... 1330.5, giving 112.70px spacing. Do not eyeball this. Two hand estimates (0.0558, 0.0596) were both short, and the error compounds - at 0.0558 the crop for card 6 sat 37px off, between two cards, which is why Moloch's health read a constant 59% for an entire run. Re-derive with `npm run probe -- <capture> roster`.",
        roster: {
          firstCardCenterX: 0.11306,
          cardSpacingX: 0.06261,
          visibleCardCount: 12,
          portraitCenterY: 0.885,
          portraitBox: { w: 0.05, h: 0.09 },
          "//healthBar": "halfWidth was 0.0256, which is 92px at 1800 and 15px wider than the bar it is a fraction of. Measured on the health row of the two browser team selects in the corpus: the bar's track runs 164..240 at 1800 and its one-pixel border either side leaves a fill area of 75px, 150px on the same layout at a 2x device pixel ratio - so 75/2/1800, the same 0.0208 at both. The old box reached 7px past the gold edging on the left and 9px on the right, none of which can ever be green, so a titan at FULL health read 80-82% and the healing rule's 0.80 sat two points below full. 0.9668 and 0.009 are unchanged and still agree with what the derivation measures.",
          healthBar: { y: 0.9668, halfWidth: 0.02083, thickness: 9e-3 },
          "//portraitArt": "The crop a portrait fingerprint is taken from. Was a hard-coded constant in vision/roster.ts; these are exactly the values it held, now written down as belonging to this client rather than to the code.",
          portraitArt: { w: 0.04, h: 0.055, centerY: 0.882 },
          "//selectedTick": "Measured off a magnified card: a cream check at the lower right of the portrait. An earlier box centred at 0.885 ended at 0.9075 - entirely above the tick - so every card read as unselected, which made the runner click a titan who was already in the team and remove them.",
          selectedTick: { dx: 0.019, y: 0.918, w: 0.02, h: 0.032 },
          "//selectedTickShape": "What a tick LOOKS like here, which coverage alone cannot settle. The account's level-45 gold titan fills her tick box with pale robe: 0.280 of it on a frame where the team is EMPTY, above every genuine tick measured (0.187-0.279) and above the 0.18 coverage threshold, so she read as fielded when nothing was. Shape separates them, because a tick is a chevron and artwork is not. Derived with `probe <capture> tick-template 0 1 2` off the calibrate frame and checked against every team-select capture on disk: genuine ticks 0.039-0.050, everything else 0.225-0.286. The threshold sits in that gap with 3x margin below it. Chrome's own template, not Android's - the same glyph into a 36x28 box here and a 58x49 one there does not reduce to the same 16x16 signature, and Android's template scores Chrome's real ticks at 0.155-0.170, which its own threshold would reject.",
          selectedTickShape: {
            template: "zszY0cjc39zX3dXfQnFtPs7Oz8nG2N3W1t7PGm9pamnR0MbBx87Qytbb6FdrZGxUzs/Dz9fLzsTN2CdsYmdf9tDQ2TknzcrFyO5dY19uJdrT5TlqXvjByNEpY1piTfvyyxpsWFoyyMT2WlxdVAj39MMcaVlSVe/LMVtXYRrl6fHK1j9fT1si/VdQWzfT89nMycb5UFNSS0RTUlDlvvzctc3RywhRT09PSlsXu9H42LvO0NzeH1JMRFI209Lq8su82N/x6N8tUEFM+dnr6Ni9vuHp8ei82EFSG9ne1sW8vb/m6d7Muc8RKdjEvru6vr+/3djHwdHz7M+0s7m+v7+/vw==",
            maxDistance: 0.15
          },
          "//elementBadge": "Measured off a magnified card at 0.0244 left of centre, 0.863 down. Reading it is how the tank slot is identified: the team is four water titans plus one tank, so the single selected card that is not water IS the tank slot.",
          elementBadge: { dx: -0.0244, y: 0.863, w: 0.016, h: 0.028 }
        }
      },
      battleResult: {
        okButton: { x: 0.5, y: 0.86 }
      }
    },
    "//timing": "The runner does not sleep for fixed amounts; it retries until the screen says what it is waiting for. These values only set how patient each retry loop is.",
    timing: {
      "//retry": "The single retry policy: try, wait retryDelayMs, try again, up to retryAttempts times. Every wait in the run goes through it.",
      retryAttempts: 8,
      retryDelayMs: 1e3,
      "//gateSettleAttempts": "Re-reads allowed while waiting for the scrolling map to stop. Higher than the default because a room transition is the longest animation in the loop.",
      gateSettleAttempts: 15,
      "//battleTimeoutMs": "Converted into retry attempts. A battle's length is set by the game, so this is far more patient than any other step.",
      battleTimeoutMs: 18e4,
      "//readyTimeoutMs": "Covers the game loading AND you navigating to Guild -> Dungeon, which the runner deliberately does not do itself.",
      readyTimeoutMs: 18e4,
      "//betweenClicksMs": "A short settle after a click so the next screenshot is not taken mid-frame. Everything longer is handled by retrying.",
      betweenClicksMs: 250,
      screenPollIntervalMs: 500
    },
    safety: {
      abortOnUnknownScreen: true,
      saveScreenshotOnAbort: true,
      "//captureBattleResults": "Saves the result dialog of every battle, won or lost. Victory and defeat put their button in the same place, so the runner clicks through both identically and has never recorded a defeat - there is no frame to build the distinction from. Turn off once defeat is recognised and the frames stop being interesting.",
      captureBattleResults: true,
      "//stopWhenTitanDies": "Ends the run on the result dialog the moment it says a titan died, with nothing on that dialog clicked - not OK, and not the Retry beside it - so you arrive to the game exactly as the battle left it and decide for yourself whether to revive, retry or stop for the day. A death costs the day rather than the battle: a dead titan cannot be fielded again until it is revived, so every fight after one is entered a titan short, which is the same cost strategy.team.allowIncompleteTeam refuses at team select. On costs whatever attempts are left, since they sit unspent until somebody comes back. False here because off is what every configuration did before the option existed, and a run that halts unasked looks like a bug; the browser panel carries the same switch, and the Android app carries it as TeamPolicy.stopWhenTitanDies. A dialog whose casualty row cannot be read is re-read three times 700ms apart and then stops the run rather than being clicked through - see CASUALTY_READ_ATTEMPTS in DungeonRunner.ts.",
      stopWhenTitanDies: false
    }
  };

  // src/vision/frame.ts
  var LUMA_RED = 0.2126;
  var LUMA_GREEN = 0.7152;
  var LUMA_BLUE = 0.0722;
  var RGBA_CHANNELS = 4;
  function boxToPixels(box, imageWidth, imageHeight) {
    const left = clamp(Math.round(box.x * imageWidth), 0, imageWidth - 1);
    const top = clamp(Math.round(box.y * imageHeight), 0, imageHeight - 1);
    const width = clamp(Math.round(box.w * imageWidth), 1, imageWidth - left);
    const height = clamp(Math.round(box.h * imageHeight), 1, imageHeight - top);
    return { left, top, width, height };
  }
  function cropRegion(frame, region) {
    const out = new Uint8Array(region.width * region.height * 3);
    for (let y = 0; y < region.height; y += 1) {
      const sourceRow = (region.top + y) * frame.width;
      for (let x = 0; x < region.width; x += 1) {
        const from = (sourceRow + region.left + x) * RGBA_CHANNELS;
        const to = (y * region.width + x) * 3;
        out[to] = frame.data[from] ?? 0;
        out[to + 1] = frame.data[from + 1] ?? 0;
        out[to + 2] = frame.data[from + 2] ?? 0;
      }
    }
    return { data: out, width: region.width, height: region.height, channels: 3 };
  }
  function downscaleRegion(frame, region, targetWidth, targetHeight) {
    const out = new Uint8Array(targetWidth * targetHeight * 3);
    const scaleX = region.width / targetWidth;
    const scaleY = region.height / targetHeight;
    for (let y = 0; y < targetHeight; y += 1) {
      const startY = Math.floor(y * scaleY);
      const endY = Math.max(startY + 1, Math.min(region.height, Math.ceil((y + 1) * scaleY)));
      for (let x = 0; x < targetWidth; x += 1) {
        const startX = Math.floor(x * scaleX);
        const endX = Math.max(startX + 1, Math.min(region.width, Math.ceil((x + 1) * scaleX)));
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let sourceY = startY; sourceY < endY; sourceY += 1) {
          const row = (region.top + sourceY) * frame.width + region.left;
          for (let sourceX = startX; sourceX < endX; sourceX += 1) {
            const offset = (row + sourceX) * RGBA_CHANNELS;
            red += frame.data[offset] ?? 0;
            green += frame.data[offset + 1] ?? 0;
            blue += frame.data[offset + 2] ?? 0;
            count += 1;
          }
        }
        const to = (y * targetWidth + x) * 3;
        out[to] = Math.round(red / count);
        out[to + 1] = Math.round(green / count);
        out[to + 2] = Math.round(blue / count);
      }
    }
    return { data: out, width: targetWidth, height: targetHeight, channels: 3 };
  }
  function downscaleRegionToGrey(frame, region, targetWidth, targetHeight) {
    const colour = downscaleRegion(frame, region, targetWidth, targetHeight);
    const grey = new Uint8Array(targetWidth * targetHeight);
    for (let index = 0; index < grey.length; index += 1) {
      const offset = index * 3;
      grey[index] = Math.round(
        LUMA_RED * (colour.data[offset] ?? 0) + LUMA_GREEN * (colour.data[offset + 1] ?? 0) + LUMA_BLUE * (colour.data[offset + 2] ?? 0)
      );
    }
    return grey;
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // src/vision/image.ts
  function cropToRgb(frame, box) {
    if (frame.width === 0 || frame.height === 0) {
      throw new Error("Frame has no readable dimensions.");
    }
    return cropRegion(frame, boxToPixels(box, frame.width, frame.height));
  }
  function pixelAt(pixels, x, y) {
    const offset = (y * pixels.width + x) * pixels.channels;
    const red = pixels.data[offset] ?? 0;
    const green = pixels.data[offset + 1] ?? 0;
    const blue = pixels.data[offset + 2] ?? 0;
    return rgbToHsv(red, green, blue);
  }
  function rgbToHsv(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta !== 0) {
      if (max === r) hue = 60 * ((g - b) / delta % 6);
      else if (max === g) hue = 60 * ((b - r) / delta + 2);
      else hue = 60 * ((r - g) / delta + 4);
    }
    if (hue < 0) hue += 360;
    return { hue, saturation: max === 0 ? 0 : delta / max, value: max };
  }

  // src/vision/color.ts
  var MINIMUM_SATURATION = 0.5;
  var MINIMUM_VALUE = 0.25;
  var HUE_BIN_COUNT = 12;
  var HUE_BIN_SIGNIFICANCE = 0.12;
  function profileHues(pixels) {
    let sumX = 0;
    let sumY = 0;
    let sampleCount = 0;
    const bins = new Array(HUE_BIN_COUNT).fill(0);
    const totalPixels = pixels.width * pixels.height;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const hsv = pixelAt(pixels, x, y);
        if (hsv.saturation < MINIMUM_SATURATION || hsv.value < MINIMUM_VALUE) continue;
        const radians = hsv.hue * Math.PI / 180;
        sumX += Math.cos(radians);
        sumY += Math.sin(radians);
        sampleCount += 1;
        const bin = Math.min(HUE_BIN_COUNT - 1, Math.floor(hsv.hue / (360 / HUE_BIN_COUNT)));
        bins[bin] = (bins[bin] ?? 0) + 1;
      }
    }
    if (sampleCount === 0) {
      return {
        dominantHue: 0,
        concentration: 0,
        sampleCount: 0,
        sampleRatio: 0,
        hueClusterCount: 0
      };
    }
    const hueClusterCount = bins.filter((count) => count / sampleCount >= HUE_BIN_SIGNIFICANCE).length;
    const meanX = sumX / sampleCount;
    const meanY = sumY / sampleCount;
    const concentration = Math.hypot(meanX, meanY);
    let dominantHue = Math.atan2(meanY, meanX) * 180 / Math.PI;
    if (dominantHue < 0) dominantHue += 360;
    return {
      dominantHue,
      concentration,
      sampleCount,
      sampleRatio: totalPixels === 0 ? 0 : sampleCount / totalPixels,
      hueClusterCount
    };
  }
  function hueDistance(a, b) {
    const raw = Math.abs(a - b) % 360;
    return raw > 180 ? 360 - raw : raw;
  }

  // src/vision/roster.ts
  function portraitBoxForCard(index, geometry) {
    const centerX = geometry.firstCardCenterX + index * geometry.cardSpacingX;
    const art = geometry.portraitArt;
    return {
      x: centerX - art.w / 2,
      y: art.centerY - art.h / 2,
      w: art.w,
      h: art.h
    };
  }
  var SIGNATURE_SIZE = 16;
  var SIGNATURE_SCALE = 64;
  function portraitSignature(frame, box) {
    const region = boxToPixels(box, frame.width, frame.height);
    const raw = downscaleRegionToGrey(frame, region, SIGNATURE_SIZE, SIGNATURE_SIZE);
    let sum = 0;
    for (const value of raw) sum += value;
    const mean = sum / raw.length;
    let variance = 0;
    for (const value of raw) variance += (value - mean) ** 2;
    const deviation = Math.sqrt(variance / raw.length) || 1;
    const signature = new Float32Array(raw.length);
    for (let index = 0; index < raw.length; index += 1) {
      signature[index] = ((raw[index] ?? 0) - mean) / deviation * SIGNATURE_SCALE;
    }
    return signature;
  }
  function signatureDistance(a, b) {
    if (a.length !== b.length || a.length === 0) return 1;
    let total = 0;
    for (let index = 0; index < a.length; index += 1) {
      total += Math.abs((a[index] ?? 0) - (b[index] ?? 0));
    }
    return total / a.length / 255;
  }
  function tickBoxForCard(index, geometry) {
    const centerX = geometry.firstCardCenterX + index * geometry.cardSpacingX;
    const tick = geometry.selectedTick;
    return {
      x: centerX + tick.dx - tick.w / 2,
      y: tick.y - tick.h / 2,
      w: tick.w,
      h: tick.h
    };
  }
  var TICK_MIN_VALUE = 0.75;
  var TICK_MAX_SATURATION = 0.35;
  var TICK_HUE_MIN = 25;
  var TICK_HUE_MAX = 65;
  var TICK_MIN_SATURATION = 0.12;
  function isTickPixel(hsv) {
    const brightEnough = hsv.value > TICK_MIN_VALUE && hsv.saturation < TICK_MAX_SATURATION;
    const rightColour = hsv.hue >= TICK_HUE_MIN && hsv.hue <= TICK_HUE_MAX && hsv.saturation >= TICK_MIN_SATURATION;
    return brightEnough && rightColour;
  }
  var SELECTED_BADGE_THRESHOLD = 0.18;
  async function isCardFielded(frame, index, geometry) {
    if (await tickCoverage(frame, index, geometry) < SELECTED_BADGE_THRESHOLD) return false;
    return await tickShapeDistance(frame, index, geometry) <= geometry.selectedTickShape.maxDistance;
  }
  async function tickCoverage(frame, index, geometry) {
    const pixels = await cropToRgb(frame, tickBoxForCard(index, geometry));
    const total = pixels.width * pixels.height;
    if (total === 0) return 0;
    let cream = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        if (isTickPixel(pixelAt(pixels, x, y))) cream += 1;
      }
    }
    return cream / total;
  }
  async function tickShapeDistance(frame, index, geometry) {
    const signature = await portraitSignature(frame, tickBoxForCard(index, geometry));
    return signatureDistance(decodeSignature(geometry.selectedTickShape.template), signature);
  }
  function decodeSignature(base64) {
    const binary = atob(base64);
    const signature = new Float32Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      signature[index] = (binary.charCodeAt(index) & 255) << 24 >> 24;
    }
    return signature;
  }
  async function locateTitans(frame, geometry, templates) {
    const cardSignatures = [];
    for (let index = 0; index < geometry.visibleCardCount; index += 1) {
      cardSignatures.push(await portraitSignature(frame, portraitBoxForCard(index, geometry)));
    }
    const matches = /* @__PURE__ */ new Map();
    for (const [tank, template] of templates) {
      const ranked = cardSignatures.map((signature, index) => ({ index, distance: signatureDistance(template, signature) })).sort((a, b) => a.distance - b.distance);
      const best = ranked[0];
      if (!best) continue;
      matches.set(tank, {
        tank,
        index: best.index,
        distance: best.distance,
        runnerUpDistance: ranked[1]?.distance ?? 1
      });
    }
    return matches;
  }

  // src/vision/locate.ts
  var COLOR_RANGES = {
    /** The green shared by Attack, Auto Battle, To battle!, Collect and OK. */
    actionButton: { hueMin: 75, hueMax: 155, minSaturation: 0.45, minValue: 0.4 },
    /**
     * The gold glow of the save-point Activate control.
     *
     * Wider and dimmer than it looks. The control is a dark bronze disc wrapped in
     * a glowing ring, measured at hue 34.5 — just outside a 35-60 window — and the
     * ring breaks into separate arcs rather than forming one solid blob.
     */
    activateOrb: { hueMin: 25, hueMax: 65, minSaturation: 0.4, minValue: 0.45 }
  };
  var SEARCH_WIDTH = 320;
  async function findColorBlobs(frame, range, options = {}) {
    const minPixels = options.minPixels ?? 40;
    const fullWidth = frame.width;
    const fullHeight = frame.height;
    if (fullWidth === 0 || fullHeight === 0) return [];
    let region = { left: 0, top: 0, width: fullWidth, height: fullHeight };
    if (options.searchArea) {
      region = boxToPixels(options.searchArea, fullWidth, fullHeight);
    }
    const offsetX = region.left;
    const offsetY = region.top;
    const regionWidth = region.width;
    const regionHeight = region.height;
    const scale = SEARCH_WIDTH / regionWidth;
    const searchHeight = Math.max(1, Math.round(regionHeight * scale));
    const { data } = downscaleRegion(frame, region, SEARCH_WIDTH, searchHeight);
    const width = SEARCH_WIDTH;
    const height = searchHeight;
    const matches = new Uint8Array(width * height);
    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 3;
      const hsv = rgbToHsv(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
      const inRange = hsv.hue >= range.hueMin && hsv.hue <= range.hueMax && hsv.saturation >= range.minSaturation && hsv.value >= range.minValue;
      matches[index] = inRange ? 1 : 0;
    }
    const blobs = [];
    const visited = new Uint8Array(width * height);
    const stack = [];
    for (let start = 0; start < width * height; start += 1) {
      if (matches[start] !== 1 || visited[start] === 1) continue;
      stack.length = 0;
      stack.push(start);
      visited[start] = 1;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      let count = 0;
      while (stack.length > 0) {
        const current = stack.pop();
        const x = current % width;
        const y = (current - x) / width;
        count += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        const neighbours = [
          x > 0 ? current - 1 : -1,
          x < width - 1 ? current + 1 : -1,
          y > 0 ? current - width : -1,
          y < height - 1 ? current + width : -1
        ];
        for (const neighbour of neighbours) {
          if (neighbour < 0) continue;
          if (matches[neighbour] !== 1 || visited[neighbour] === 1) continue;
          visited[neighbour] = 1;
          stack.push(neighbour);
        }
      }
      if (count < minPixels) continue;
      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const fillRatio = count / (boxWidth * boxHeight);
      const aspect = boxWidth / boxHeight;
      if (options.minFillRatio !== void 0 && fillRatio < options.minFillRatio) continue;
      if (options.minAspect !== void 0 && aspect < options.minAspect) continue;
      if (options.maxAspect !== void 0 && aspect > options.maxAspect) continue;
      const toFullX = (value) => (offsetX + value / width * regionWidth) / fullWidth;
      const toFullY = (value) => (offsetY + value / height * regionHeight) / fullHeight;
      blobs.push({
        center: { x: toFullX((minX + maxX) / 2), y: toFullY((minY + maxY) / 2) },
        bounds: {
          x: toFullX(minX),
          y: toFullY(minY),
          w: toFullX(maxX) - toFullX(minX),
          h: toFullY(maxY) - toFullY(minY)
        },
        pixelCount: count,
        aspect,
        fillRatio
      });
    }
    return blobs.sort((a, b) => b.pixelCount - a.pixelCount);
  }
  async function whiteFraction(frame, box) {
    const pixels = await cropToRgb(frame, box);
    const total = pixels.width * pixels.height;
    if (total === 0) return 0;
    let white = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const hsv = pixelAt(pixels, x, y);
        if (hsv.value > WHITE_MIN_VALUE && hsv.saturation < WHITE_MAX_SATURATION) white += 1;
      }
    }
    return white / total;
  }
  var WHITE_MIN_VALUE = 0.78;
  var WHITE_MAX_SATURATION = 0.22;
  async function whiteInkDensity(frame, box) {
    const pixels = await cropToRgb(frame, box);
    if (pixels.width * pixels.height === 0) return 0;
    let left = Number.MAX_SAFE_INTEGER;
    let right = -1;
    let top = Number.MAX_SAFE_INTEGER;
    let bottom = -1;
    let white = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const hsv = pixelAt(pixels, x, y);
        if (hsv.value <= WHITE_MIN_VALUE || hsv.saturation >= WHITE_MAX_SATURATION) continue;
        white += 1;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (white === 0) return 0;
    return white / ((right - left + 1) * (bottom - top + 1));
  }
  async function findActionButtons(frame) {
    return findColorBlobs(frame, COLOR_RANGES.actionButton, {
      minPixels: 170,
      minFillRatio: 0.7,
      minAspect: 1.6,
      maxAspect: 8
    });
  }

  // src/vision/elements.ts
  var ELEMENT_HUES = [
    // Measured fire orbs at 9 and 38 degrees depending on how much of the bright
    // centre versus the dark rim the crop catches; 24 sits between them.
    { element: "fire", hue: 24 },
    { element: "earth", hue: 120 },
    { element: "water", hue: 208 }
  ];
  var MIX_CONCENTRATION_CEILING = 0.6;
  var MIX_CONFIDENCE_SPAN = 0.2;
  var MIX_MINIMUM_HUE_CLUSTERS = 3;
  var MAX_HUE_ERROR_DEGREES = 45;
  var MIN_SAMPLE_RATIO = 0.03;
  function emblemBoxAboveAttackButton(attackButton) {
    const CENTRE_ABOVE_BUTTON = 0.145;
    const width = 0.045;
    const height = 0.095;
    return {
      x: attackButton.x - width / 2,
      y: attackButton.y - CENTRE_ABOVE_BUTTON - height / 2,
      w: width,
      h: height
    };
  }
  async function hasWingedEmblem(screenshot, attackButton) {
    const emblem = emblemBoxAboveAttackButton(attackButton);
    const band = {
      x: Math.max(0, attackButton.x - WING_SPAN / 2),
      y: emblem.y + emblem.h / 2 - WING_BAND_HEIGHT / 2,
      w: WING_SPAN,
      h: WING_BAND_HEIGHT
    };
    const pixels = await cropToRgb(screenshot, band);
    const total = pixels.width * pixels.height;
    if (total === 0) return false;
    let silver = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const hsv = pixelAt(pixels, x, y);
        if (hsv.value >= WING_MIN_VALUE && hsv.saturation <= WING_MAX_SATURATION) silver += 1;
      }
    }
    return silver / total >= WING_MIN_COVERAGE;
  }
  var WING_SPAN = 0.17;
  var WING_BAND_HEIGHT = 0.03;
  var WING_MIN_VALUE = 0.55;
  var WING_MAX_SATURATION = 0.3;
  var WING_MIN_COVERAGE = 0.18;
  function classifyElement(hueConcentration, dominantHue, sampleRatio, hueClusterCount) {
    if (sampleRatio < MIN_SAMPLE_RATIO) {
      return {
        element: "mix",
        confidence: 0,
        diagnostics: `only ${(sampleRatio * 100).toFixed(1)}% of the crop was colourful; emblem box is probably misaligned`
      };
    }
    if (hueConcentration < MIX_CONCENTRATION_CEILING && hueClusterCount >= MIX_MINIMUM_HUE_CLUSTERS) {
      const confidence = clamp01(
        (MIX_CONCENTRATION_CEILING - hueConcentration) / MIX_CONFIDENCE_SPAN
      );
      return {
        element: "mix",
        confidence,
        diagnostics: `concentration ${hueConcentration.toFixed(2)} below ${MIX_CONCENTRATION_CEILING}, ${hueClusterCount} cluster(s), mean hue ${dominantHue.toFixed(0)} deg`
      };
    }
    let best = ELEMENT_HUES[0];
    let bestError = hueDistance(dominantHue, best.hue);
    for (const candidate of ELEMENT_HUES.slice(1)) {
      const error = hueDistance(dominantHue, candidate.hue);
      if (error < bestError) {
        best = candidate;
        bestError = error;
      }
    }
    if (bestError > MAX_HUE_ERROR_DEGREES) {
      return {
        element: best.element,
        confidence: 0,
        diagnostics: `dominant hue ${dominantHue.toFixed(0)} deg is ${bestError.toFixed(0)} deg from the nearest known element (concentration ${hueConcentration.toFixed(2)})`
      };
    }
    return {
      element: best.element,
      confidence: clamp01(1 - bestError / MAX_HUE_ERROR_DEGREES),
      diagnostics: `hue ${dominantHue.toFixed(0)} deg, concentration ${hueConcentration.toFixed(2)}, ${hueClusterCount} cluster(s)`
    };
  }
  async function readBattleOption(screenshot, side, emblemBox) {
    const pixels = await cropToRgb(screenshot, emblemBox);
    const profile = profileHues(pixels);
    const reading = classifyElement(
      profile.concentration,
      profile.dominantHue,
      profile.sampleRatio,
      profile.hueClusterCount
    );
    return {
      side,
      element: reading.element,
      confidence: reading.confidence,
      diagnostics: reading.diagnostics
    };
  }
  function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
  }

  // src/vision/casualties.ts
  var ANDROID_CANVAS_ASPECT = 2.145;
  var BROWSER_CANVAS_ASPECT = 2.19;
  var MAX_TEAM_SIZE = 5;
  var SLOT_PITCH_IN_CANVAS_HEIGHTS = 0.17431;
  var BAR_LEFT_OFFSET_IN_CANVAS_HEIGHTS = -0.0603;
  var BAR_PROBE_HALF_WIDTH_IN_CANVAS_HEIGHTS = 0.0129;
  var SPINNER_HALF_WIDTH_IN_CANVAS_HEIGHTS = 0.039;
  var WORD_PROBE_HALF_WIDTH_IN_CANVAS_HEIGHTS = 0.0129;
  var BAR_GREEN = { hueMin: 45, hueMax: 125, minSaturation: 0.65 };
  var DEAD_RED = { hueBelow: 15, hueAbove: 345, minSaturation: 0.6 };
  var SIGNAL_MIN_COVERAGE = 0.15;
  var STATUS_ROW_MIN_HEIGHT_IN_PITCHES = 0.22;
  var BAND_BRIDGE_IN_PITCHES = 0.3;
  var PORTRAIT_PROBE_TOP_IN_PITCHES = 3.2;
  var PORTRAIT_PROBE_BOTTOM_IN_PITCHES = 1.1;
  var PORTRAIT_PROBE_HALF_WIDTH_IN_CANVAS_HEIGHTS = 0.0429;
  var PORTRAIT_MIN_RELATIVE_SPREAD = 0.4;
  var CARD_BAND_MAX_GAP_IN_PITCHES = 0.9;
  var CARD_BAND_MIN_HEIGHT_IN_PITCHES = 1;
  var CARD_BAND_WINDOW_IN_PITCHES = 0.25;
  var MAX_FRAME_ASPECT = 2.27;
  var DialogGeometry = class {
    /** The game picture's height, in rows of this frame. */
    canvasHeight;
    /** The lattice pitch, as a fraction of the frame's width - which is what a centre is measured in. */
    pitch;
    barLeftOffset;
    barProbeHalfWidth;
    wordProbeHalfWidth;
    spinnerHalfWidth;
    portraitProbeHalfWidth;
    /**
     * The unit every `_IN_PITCHES` threshold below is stated in, as a fraction of the frame's height.
     *
     * It is not the pitch, and the name is older than the knowledge. `pitch / aspect` is the pitch
     * converted from a width fraction to a height fraction *the wrong way round* - the right conversion
     * multiplies by the aspect - so this is the real pitch divided by the aspect twice, and it comes out
     * at about 0.215 of a card pitch: 54 rows of a 1440-row phone frame where a pitch is 251.
     *
     * It is left exactly as it was on purpose. Every threshold stated in these units - the status row's
     * height floor, the band bridge, the card band's three, the portrait probe's two - was measured
     * through this expression on real frames, and the thinnest of their margins is 1.26x. What the
     * mistake costs is that the unit carries the frame's aspect, so the same game distance is 12% more
     * of it in the browser than on the phone; the margins absorb that, which is why nothing has ever
     * failed on it. Putting it right means dividing all seven by about 4.6 and re-deriving every figure
     * their comments quote, which is a change of its own and not one to make while fixing the lattice.
     */
    pitchY;
    constructor(frame, canvasAspect) {
      this.canvasHeight = Math.min(frame.height, frame.width / canvasAspect);
      const perCanvasHeight = frame.width === 0 ? 0 : this.canvasHeight / frame.width;
      this.pitch = SLOT_PITCH_IN_CANVAS_HEIGHTS * perCanvasHeight;
      this.barLeftOffset = BAR_LEFT_OFFSET_IN_CANVAS_HEIGHTS * perCanvasHeight;
      this.barProbeHalfWidth = BAR_PROBE_HALF_WIDTH_IN_CANVAS_HEIGHTS * perCanvasHeight;
      this.wordProbeHalfWidth = WORD_PROBE_HALF_WIDTH_IN_CANVAS_HEIGHTS * perCanvasHeight;
      this.spinnerHalfWidth = SPINNER_HALF_WIDTH_IN_CANVAS_HEIGHTS * perCanvasHeight;
      this.portraitProbeHalfWidth = PORTRAIT_PROBE_HALF_WIDTH_IN_CANVAS_HEIGHTS * perCanvasHeight;
      this.pitchY = frame.height === 0 ? 0 : this.pitch / (frame.width / frame.height);
    }
    /** Card centres for a team of `size`, left to right. */
    centresFor(size) {
      return Array.from({ length: size }, (_, index) => 0.5 + (index - (size - 1) / 2) * this.pitch);
    }
  };
  function bestBandFor(bands) {
    const ranked = bands.slice().sort((a, b) => {
      const byDeath = Number(reportsDeath(b)) - Number(reportsDeath(a));
      return byDeath !== 0 ? byDeath : b.heightInPitches - a.heightInPitches;
    });
    return ranked[0];
  }
  function reportsDeath(band) {
    return band.slots.some((slot) => slot.signal === "dead");
  }
  function readBattleCasualties(frame, dialogBody, canvasAspect) {
    if (dialogBody.h <= 0 || dialogBody.w <= 0 || frame.width === 0 || frame.height === 0) {
      return unreadable("the dialog has no body between its banner and its buttons", 0);
    }
    const aspect = frame.width / frame.height;
    if (aspect > MAX_FRAME_ASPECT) {
      return refused(
        "unsupportedFrameShape",
        `the frame is ${frame.width}x${frame.height}, an aspect of ${aspect.toFixed(4)}, wider than the ${MAX_FRAME_ASPECT} this reading has ever been shown a capture of; the team lattice is placed from the height of the game's picture and nothing here has measured a picture that shape`,
        0
      );
    }
    const scan = new DialogScan(frame, dialogBody, canvasAspect);
    const refusals = [];
    for (let size = MAX_TEAM_SIZE; size >= 1; size -= 1) {
      const row = scan.statusRowFor(size);
      if (!row) continue;
      const reading = scan.confirmAgainstPortraits(size, row);
      if (reading.verdict !== "unreadable") return reading;
      refusals.push(reading.diagnostics);
      if (reading.outboardCard) break;
    }
    const [widest, ...rest] = refusals;
    const setAside = scan.bandsSetAside;
    const reason = widest === void 0 ? "no status row under the portraits: no lattice of 1 to 5 cards had every card showing exactly one of a health bar and a DEAD word" : `${widest}${rest.length > 0 ? ` (and ${rest.length} narrower lattice(s) likewise)` : ""}`;
    return unreadable(setAside === void 0 ? reason : `${reason}; ${setAside}`, scan.scannedFraction);
  }
  var DialogScan = class {
    /**
     * @param canvasAspect how wide the game draws its picture relative to how tall, on the client this
     *   frame came from - {@link ANDROID_CANVAS_ASPECT} or {@link BROWSER_CANVAS_ASPECT}. Third and
     *   required, because it is a fact about the frame, while the two below are test knobs.
     * @param bandBridgeInPitches defaults to the shipped {@link BAND_BRIDGE_IN_PITCHES}. A parameter
     *   only so a test can walk it down and watch what breaks, which is how that constant was measured
     *   on the Kotlin side in the first place - and the one death in the corpus turns out to depend on
     *   it, so "measured by hand once" was not good enough for it.
     * @param cardBandMaxGapInPitches defaults to the shipped {@link CARD_BAND_MAX_GAP_IN_PITCHES}. A
     *   parameter for the same reason and a sharper one: passing `Infinity` here turns the distance gate
     *   off, which is how both suites show what it is holding out rather than only that the corpus is
     *   green with it in. A rule whose absence cannot be demonstrated is a rule nobody can check.
     */
    constructor(frame, body, canvasAspect, bandBridgeInPitches = BAND_BRIDGE_IN_PITCHES, cardBandMaxGapInPitches = CARD_BAND_MAX_GAP_IN_PITCHES) {
      this.frame = frame;
      this.body = body;
      this.cardBandMaxGapInPitches = cardBandMaxGapInPitches;
      this.geometry = new DialogGeometry(frame, canvasAspect);
      this.pitchY = this.geometry.pitchY;
      this.rowsPerPitch = this.pitchY * frame.height;
      this.bandBridgeRows = Math.max(1, Math.round(bandBridgeInPitches * this.rowsPerPitch));
    }
    /** Where this frame's lattice and windows fall. Public so a test can print what it probed. */
    geometry;
    pitchY;
    rowsPerPitch;
    bandBridgeRows;
    probes = /* @__PURE__ */ new Map();
    cardBands = /* @__PURE__ */ new Map();
    bands = /* @__PURE__ */ new Map();
    setAside = [];
    scannedPixels = 0;
    /** Share of the frame every crop taken so far has covered. */
    get scannedFraction() {
      return this.scannedPixels / (this.frame.width * this.frame.height);
    }
    /** {@link STATUS_ROW_MIN_HEIGHT_IN_PITCHES} in rows of this frame. Two rows at the very least. */
    get statusRowMinRows() {
      return Math.max(2, Math.round(STATUS_ROW_MIN_HEIGHT_IN_PITCHES * this.rowsPerPitch));
    }
    /**
     * What the distance gate threw away, in the words a refusal needs.
     *
     * Undefined when it threw nothing away, so a caller can leave the sentence out rather than print
     * "0 bands". §3.2: a refusal that names only the rule that fired leaves the log unable to say what
     * the dialog actually had on it, and on a loot frame what it had on it is the whole story.
     */
    get bandsSetAside() {
      if (this.setAside.length === 0) return void 0;
      const measured = this.setAside.filter((gap) => Number.isFinite(gap));
      const unanchored = this.setAside.length - measured.length;
      if (measured.length === 0) {
        return `${unanchored} band(s) closed with no card band above them at all`;
      }
      const tail = unanchored > 0 ? `, and ${unanchored} with no card band above them at all` : "";
      return `${measured.length} band(s) closed ${Math.min(...measured).toFixed(2)}-${Math.max(...measured).toFixed(2)} pitches below the cards, past the ${CARD_BAND_MAX_GAP_IN_PITCHES} a status row sits within${tail}`;
    }
    /**
     * The best band of rows over which every card of a `size`-card lattice showed exactly one signal.
     *
     * Bands are found first, filtered by height second and chosen third. The height floor and the
     * choice are both applied here rather than inside the scan, which is what lets a test print the
     * bands each of them throws away: the row that floor exists to reject is a line of gold reward text
     * that no assertion would otherwise ever name, and a threshold whose losing side cannot be printed
     * is a threshold nobody can check. See {@link bestBandFor} for the choice.
     */
    statusRowFor(size) {
      return bestBandFor(this.bandsFor(size).filter((band) => band.rows >= this.statusRowMinRows));
    }
    /**
     * Every run of rows a `size`-card lattice closes over, top of the dialog first, short ones included.
     *
     * Separate from {@link statusRowFor} so both of the rules that narrow this list down are named
     * functions with tests on them rather than conditions buried in a scan - the impostor row
     * {@link bestBandFor} has to reject appears on no frame in either corpus, so the only thing that can
     * hold it to its rule is a test that builds the case by hand.
     */
    bandsFor(size) {
      const cached = this.bands.get(size);
      if (cached) return cached;
      const found = this.closeBandsFor(size);
      this.bands.set(size, found);
      return found;
    }
    closeBandsFor(size) {
      const centres = this.geometry.centresFor(size);
      if (centres.some((centre) => centre < 0 || centre > 1)) return [];
      const columns = centres.map((centre) => this.probeColumn(centre));
      const cards = this.cardBandFor(size);
      const rowCount = columns[0]?.readings.length ?? 0;
      const bands = [];
      let start = -1;
      let lastAgreeing = -1;
      for (let row = 0; row <= rowCount; row += 1) {
        const agrees = row < rowCount && columns.every((column) => isDecisive(column.readings[row]?.signal));
        if (agrees) {
          if (start < 0) start = row;
          lastAgreeing = row;
          continue;
        }
        if (start < 0) continue;
        if (row < rowCount && row - lastAgreeing <= this.bandBridgeRows) continue;
        const top = this.toFrameY(start, rowCount);
        const band = {
          top,
          bottom: this.toFrameY(lastAgreeing, rowCount),
          rows: lastAgreeing - start + 1,
          heightInPitches: (lastAgreeing - start + 1) / this.rowsPerPitch,
          pitchesBelowTheCards: cards === void 0 ? Number.POSITIVE_INFINITY : (top - cards.bottom) / this.pitchY,
          slots: columns.map(
            (column, slot) => summarise(column.readings, start, lastAgreeing, centres[slot] ?? 0)
          )
        };
        start = -1;
        if (band.pitchesBelowTheCards > this.cardBandMaxGapInPitches) {
          this.setAside.push(band.pitchesBelowTheCards);
          continue;
        }
        bands.push(band);
      }
      return bands;
    }
    /**
     * Where the cards end above a `size`-card lattice, and how much of a card that band was.
     *
     * The topmost run of structure over *every* centre of the lattice that is at least
     * {@link CARD_BAND_MIN_HEIGHT_IN_PITCHES} tall - which is the card band on all nine result frames of
     * both corpora, because nothing else on this dialog is that tall and above the team. Undefined when
     * no such run exists, which is a lattice with no cards over it and so a lattice no band can be a
     * status row for.
     *
     * "Topmost" and not "nearest above the band" is what keeps the loot out of the answer: the loot is
     * drawn *below* the team, so a search that started at the band and walked up would find loot art
     * 1.90 pitches tall sitting right against the loot band and call it the cards. Starting at the top
     * of the dialog body reaches the real cards first, every time.
     *
     * Read from the two probe windows the colour reading has already cropped, so it costs no pixels.
     * The consequence worth knowing is that it can only see the part of the card the dialog body
     * contains: on a victory the body's top edge cuts through the card art and leaves 2.48 to 3.30
     * pitches of it, which is what {@link CARD_BAND_MIN_HEIGHT_IN_PITCHES} has to stay under.
     */
    cardBandFor(size) {
      if (this.cardBands.has(size)) return this.cardBands.get(size);
      const centres = this.geometry.centresFor(size);
      const band = centres.some((centre) => centre < 0 || centre > 1) ? void 0 : this.topmostCardBand(centres.map((centre) => this.probeColumn(centre)));
      this.cardBands.set(size, band);
      return band;
    }
    topmostCardBand(columns) {
      const rowCount = columns[0]?.readings.length ?? 0;
      const windowRows = Math.max(1, Math.round(CARD_BAND_WINDOW_IN_PITCHES * this.rowsPerPitch));
      const minimumRows = Math.max(1, Math.round(CARD_BAND_MIN_HEIGHT_IN_PITCHES * this.rowsPerPitch));
      const lastWindow = rowCount - windowRows;
      let start = -1;
      let tallestRunAbove = 0;
      for (let window2 = 0; window2 <= lastWindow + 1; window2 += 1) {
        const structured = window2 <= lastWindow && columns.every((column) => isCardWindow(column, window2, windowRows));
        if (structured) {
          if (start < 0) start = window2;
          continue;
        }
        if (start < 0) continue;
        const heightInPitches = (window2 - start) / this.rowsPerPitch;
        if (window2 - start >= minimumRows) {
          return {
            bottom: this.toFrameY(window2 - 1 + windowRows, rowCount),
            heightInPitches,
            tallestRunAbove
          };
        }
        tallestRunAbove = Math.max(tallestRunAbove, heightInPitches);
        start = -1;
      }
      return void 0;
    }
    /**
     * Checks a closed lattice against the cards drawn above it, and turns it into a verdict.
     *
     * Every card of the lattice must have a portrait, and the two positions immediately outboard of it
     * must not. Without the outboard test a lattice narrower than the team would pass on its own
     * terms: a dialog whose middle card is legible and whose outer four are not closes as a team of
     * one, reports nobody dead, and is wrong about four titans.
     */
    confirmAgainstPortraits(size, row) {
      const centres = this.geometry.centresFor(size);
      const alive = row.slots.filter((slot) => slot.signal === "alive").length;
      const dead = row.slots.filter((slot) => slot.signal === "dead").length;
      const reading = `${size} card(s) at y ${row.top.toFixed(3)}-${row.bottom.toFixed(3)}, ${alive} with a health bar, ${dead} marked DEAD [${row.slots.map(describe).join(" ")}]`;
      const missing = centres.filter((centre) => !this.hasPortrait(centre, row.top));
      if (missing.length > 0) {
        return unreadable(
          `${reading}; ${missing.length} of them had no card drawn above the mark`,
          this.scannedFraction
        );
      }
      const pitch = this.geometry.pitch;
      for (const outboard of [centres[0] - pitch, centres[size - 1] + pitch]) {
        if (outboard < 0 || outboard > 1) continue;
        if (!this.hasPortrait(outboard, row.top)) continue;
        return {
          ...unreadable(
            `${reading}; a further card is drawn at ${outboard.toFixed(3)} that no mark accounted for`,
            this.scannedFraction
          ),
          outboardCard: true
        };
      }
      return {
        verdict: verdictFor(size, alive, dead),
        dead,
        alive,
        fielded: size,
        scannedFraction: this.scannedFraction,
        diagnostics: reading
      };
    }
    /** Reads both signals for one lattice position, on every row of the dialog body. */
    probeColumn(centre) {
      const cached = this.probes.get(centre);
      if (cached) return cached;
      const bar = this.scanWindow(
        centre + this.geometry.barLeftOffset,
        this.geometry.barProbeHalfWidth,
        isBarGreen
      );
      const word = this.scanWindow(centre, this.geometry.wordProbeHalfWidth, isDeadRed);
      const column = {
        readings: bar.coverage.map((barCoverage, row) => {
          const wordCoverage = word.coverage[row] ?? 0;
          return { signal: signalFor(barCoverage, wordCoverage), barCoverage, wordCoverage };
        }),
        brightest: bar.brightest.map((value, row) => Math.max(value, word.brightest[row] ?? 0)),
        darkest: bar.darkest.map((value, row) => Math.min(value, word.darkest[row] ?? 1))
      };
      this.probes.set(centre, column);
      return column;
    }
    /**
     * One narrow window, read once: what share of each row carries a colour, and how bright that row got.
     *
     * The two answers come out of the same crop because the second one is free. The colour reading uses
     * the coverage; {@link cardBandFor} uses the brightness to find where the cards end, and it
     * does so without taking a pixel of its own - which is the only reason the distance gate leaves
     * {@link MAX_SCANNED_FRACTION} where it was.
     */
    scanWindow(centre, halfWidth, matches) {
      const box = {
        x: Math.max(0, centre - halfWidth),
        y: this.body.y,
        w: 2 * halfWidth,
        h: this.body.h
      };
      const pixels = cropToRgb(this.frame, box);
      this.scannedPixels += pixels.width * pixels.height;
      const coverage = [];
      const brightest = [];
      const darkest = [];
      for (let y = 0; y < pixels.height; y += 1) {
        let hits = 0;
        let high = 0;
        let low = 1;
        for (let x = 0; x < pixels.width; x += 1) {
          const pixel = pixelAt(pixels, x, y);
          if (matches(pixel)) hits += 1;
          if (pixel.value > high) high = pixel.value;
          if (pixel.value < low) low = pixel.value;
        }
        coverage.push(pixels.width === 0 ? 0 : hits / pixels.width);
        brightest.push(high);
        darkest.push(pixels.width === 0 ? 1 : low);
      }
      return { coverage, brightest, darkest };
    }
    /** Whether a titan's card is drawn above this lattice position, loaded artwork or not. */
    hasPortrait(centre, rowTop) {
      const spread = this.portraitSpreadAt(centre, rowTop);
      return spread !== void 0 && spread >= PORTRAIT_MIN_RELATIVE_SPREAD;
    }
    /**
     * How much brightness varies across the card box, as a share of the box's own brightest pixel.
     *
     * Undefined when the box would fall off the frame, which is the one case that is not a measurement
     * at all and must not be reported as a low one. Named and returned rather than compared in place so
     * the figure {@link PORTRAIT_MIN_RELATIVE_SPREAD} is set from can be printed off any frame.
     */
    portraitSpreadAt(centre, rowTop) {
      const top = rowTop - PORTRAIT_PROBE_TOP_IN_PITCHES * this.pitchY;
      const bottom = rowTop - PORTRAIT_PROBE_BOTTOM_IN_PITCHES * this.pitchY;
      const box = {
        x: centre - this.geometry.portraitProbeHalfWidth,
        y: top,
        w: 2 * this.geometry.portraitProbeHalfWidth,
        h: bottom - top
      };
      if (box.x < 0 || box.x + box.w > 1 || box.y < 0 || box.y + box.h > 1) return void 0;
      const pixels = cropToRgb(this.frame, box);
      this.scannedPixels += pixels.width * pixels.height;
      if (pixels.width === 0 || pixels.height === 0) return void 0;
      let brightest = 0;
      let darkest = 1;
      for (let y = 0; y < pixels.height; y += 1) {
        for (let x = 0; x < pixels.width; x += 1) {
          const { value } = pixelAt(pixels, x, y);
          if (value > brightest) brightest = value;
          if (value < darkest) darkest = value;
        }
      }
      if (brightest <= 0) return void 0;
      return (brightest - darkest) / brightest;
    }
    toFrameY(row, rowCount) {
      return this.body.y + (rowCount === 0 ? 0 : row / rowCount * this.body.h);
    }
  };
  function verdictFor(fielded, alive, dead) {
    if (fielded <= 0) return "unreadable";
    if (alive + dead !== fielded) return "unreadable";
    return dead === 0 ? "noneDead" : "someDead";
  }
  function teamWasWiped(casualties) {
    return casualties.verdict === "someDead" && casualties.alive === 0;
  }
  function isDecisive(signal) {
    return signal === "alive" || signal === "dead";
  }
  function isCardWindow(column, from, rows) {
    let brightest = 0;
    let darkest = 1;
    for (let row = from; row < from + rows; row += 1) {
      brightest = Math.max(brightest, column.brightest[row] ?? 0);
      darkest = Math.min(darkest, column.darkest[row] ?? 1);
    }
    return brightest > 0 && (brightest - darkest) / brightest >= PORTRAIT_MIN_RELATIVE_SPREAD;
  }
  function signalFor(barCoverage, wordCoverage) {
    const hasBar = barCoverage >= SIGNAL_MIN_COVERAGE;
    const hasWord = wordCoverage >= SIGNAL_MIN_COVERAGE;
    if (hasBar && hasWord) return "contradictory";
    if (hasBar) return "alive";
    if (hasWord) return "dead";
    return "silent";
  }
  function summarise(column, start, end, centre) {
    let bar = 0;
    let word = 0;
    for (let row = start; row <= end; row += 1) {
      bar = Math.max(bar, column[row]?.barCoverage ?? 0);
      word = Math.max(word, column[row]?.wordCoverage ?? 0);
    }
    return { centre, barCoverage: bar, wordCoverage: word, signal: signalFor(bar, word) };
  }
  function describe(slot) {
    return `${slot.centre.toFixed(3)}:${slot.signal}(bar=${slot.barCoverage.toFixed(2)} word=${slot.wordCoverage.toFixed(2)})`;
  }
  function isBarGreen({ hue, saturation }) {
    return hue >= BAR_GREEN.hueMin && hue <= BAR_GREEN.hueMax && saturation >= BAR_GREEN.minSaturation;
  }
  function isDeadRed({ hue, saturation }) {
    return (hue <= DEAD_RED.hueBelow || hue >= DEAD_RED.hueAbove) && saturation >= DEAD_RED.minSaturation;
  }
  function refused(verdict, reason, scannedFraction) {
    return { verdict, dead: 0, alive: 0, fielded: 0, scannedFraction, diagnostics: reason };
  }
  function unreadable(reason, scannedFraction) {
    return refused("unreadable", reason, scannedFraction);
  }

  // src/screens/detect.ts
  var MIN_EMBLEM_CONFIDENCE = 0.55;
  var SHOP_BLUE = { hueMin: 195, hueMax: 225, minSaturation: 0.5, minValue: 0.5 };
  var DIALOG_BLUE = { hueMin: 195, hueMax: 230, minSaturation: 0.45, minValue: 0.45 };
  var DIMMED_ACTION = { hueMin: 75, hueMax: 190, minSaturation: 0.3, minValue: 0.18 };
  var DIMMED_MAX_VALUE = 0.6;
  var LOWER_BAND = { x: 0, y: 0.68, w: 1, h: 0.32 };
  var BANNER_BLUE = { hueMin: 195, hueMax: 245, minSaturation: 0.3, minValue: 0.28 };
  var GATE_SEARCH_AREA = { x: 0, y: 0.05, w: 1, h: 0.33 };
  var BANNER_MIN_PIXELS = 100;
  var BANNER_MIN_WHITE_FRACTION = 0.035;
  var BANNER_CLOTH = { width: 0.072, height: 0.09, aboveCentre: 0.06 };
  function clothBox(center) {
    return {
      x: Math.max(0, center.x - BANNER_CLOTH.width / 2),
      y: Math.max(0, center.y - BANNER_CLOTH.aboveCentre),
      w: BANNER_CLOTH.width,
      h: BANNER_CLOTH.height
    };
  }
  var MAP_BUTTON_AREA = { x: 0.72, y: 0.75, w: 0.28, h: 0.25 };
  var TEAM_BUTTON_AREA = { x: 0.72, y: 0.6, w: 0.28, h: 0.4 };
  var RESULT_BANNER = { x: 0.3, y: 0.06, w: 0.4, h: 0.28 };
  var VICTORY_GOLD = { hueMin: 35, hueMax: 65, minSaturation: 0.55, minValue: 0.65 };
  var VICTORY_GOLD_MIN = 0.05;
  var FOREIGN_PAINT = { hueMin: 150, hueMax: 300, minSaturation: 0.35, minValue: 0.25 };
  var OCCLUSION_BAND = { x: 0.3, y: 0.06, w: 0.4, h: 0.255 };
  var BANNER_OCCLUDED_MIN = 0.03;
  var FADED_DIALOG_GREEN = { hueMin: 75, hueMax: 155, minSaturation: 0.45, minValue: 0.15 };
  var FADED_DIALOG_BLUE = { hueMin: 195, hueMax: 230, minSaturation: 0.45, minValue: 0.15 };
  var FADED_DIALOG_MAX_VALUE = 0.45;
  var FADED_VICTORY_GOLD = { hueMin: 35, hueMax: 65, minSaturation: 0.55, minValue: 0.2 };
  function dialogBodyAbove(okButton) {
    const top = RESULT_BANNER.y + RESULT_BANNER.h;
    return { x: 0, y: top, w: 1, h: okButton.bounds.y - top };
  }
  function attackButtonsAmong(actionButtons) {
    return actionButtons.filter((blob) => blob.center.y > 0.7 && blob.center.x < 0.9);
  }
  function readOutcome(bannerSaysWon, bannerOccluded, casualties) {
    const banner = bannerSaysWon ? "won" : "lost";
    const occlusion = bannerOccluded ? " bannerOccluded" : "";
    const teamHasAnOpinion = casualties.verdict === "noneDead" || casualties.verdict === "someDead";
    if (teamHasAnOpinion) {
      const wiped = teamWasWiped(casualties);
      return {
        won: !wiped,
        diagnostics: `outcome=${wiped ? "lost" : "won"} banner=${banner} team=${wiped ? "wiped" : "survivors"} decidedBy=team${occlusion}`
      };
    }
    if (bannerOccluded) {
      return {
        won: void 0,
        diagnostics: `outcome=unknown banner=${banner} team=silent decidedBy=nothing${occlusion}`
      };
    }
    return {
      won: bannerSaysWon,
      diagnostics: `outcome=${banner} banner=${banner} team=silent decidedBy=banner`
    };
  }
  async function bandFraction(screenshot, band, range) {
    const pixels = await cropToRgb(screenshot, band);
    let matched = 0;
    let total = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const { hue, saturation, value } = pixelAt(pixels, x, y);
        if (hue >= range.hueMin && hue <= range.hueMax && saturation >= range.minSaturation && value >= range.minValue) {
          matched += 1;
        }
        total += 1;
      }
    }
    return total === 0 ? 0 : matched / total;
  }
  async function bannerGoldFraction(screenshot, gold) {
    return bandFraction(screenshot, RESULT_BANNER, gold);
  }
  async function bannerForeignFraction(screenshot) {
    return bandFraction(screenshot, OCCLUSION_BAND, FOREIGN_PAINT);
  }
  var ScreenDetector = class {
    constructor(config) {
      this.config = config;
    }
    /**
     * How wide the game draws its own picture, relative to how tall, on the client this config drives.
     *
     * The casualty lattice is a share of that picture's height rather than of the frame's, so this is
     * the one thing the reading cannot work out for itself: a browser frame carries the page's header
     * above the canvas and a phone frame is the phone's screen. Keyed off the backend rather than off
     * `canvasArea`, which describes the same fact from the other end but only for the in-page path.
     *
     * See `ANDROID_CANVAS_ASPECT`, which carries both measurements.
     */
    get canvasAspect() {
      return this.config.session.backend === "chrome" ? BROWSER_CANVAS_ASPECT : ANDROID_CANVAS_ASPECT;
    }
    async detect(screenshot) {
      const [actionButtons, shopButtons, activateOrbs] = await Promise.all([
        findActionButtons(screenshot),
        findColorBlobs(screenshot, SHOP_BLUE, { minPixels: 60, searchArea: MAP_BUTTON_AREA }),
        // Low floor on purpose: the Activate ring breaks into arcs of roughly 38
        // and 41 pixels, and a 40px floor discarded one of them, leaving the other
        // below the cluster minimum.
        findColorBlobs(screenshot, COLOR_RANGES.activateOrb, { minPixels: 20 })
      ]);
      const teamButtons = actionButtons.filter((blob) => inside(blob.center, TEAM_BUTTON_AREA));
      const diagnostics = `green=${actionButtons.length} greenOnRight=${teamButtons.length} shopBlue=${shopButtons.length} gold=${activateOrbs.length}`;
      if (teamButtons.length >= 2) {
        const autoBattle = topmost(teamButtons);
        return { state: "teamSelect", diagnostics, actionPoint: autoBattle.center, actionButtons };
      }
      if (shopButtons.length >= 1) {
        const gate = await findGate(screenshot);
        if (gate) {
          return {
            state: "dungeonMap",
            diagnostics: `${diagnostics} gate=banner`,
            actionPoint: gate,
            actionButtons
          };
        }
        const orb = await findActivateOrb(screenshot, activateOrbs);
        if (orb) {
          return {
            state: "savePoint",
            diagnostics: `${diagnostics} orb=${orb.pixelCount}px`,
            actionPoint: orb.center,
            actionButtons
          };
        }
        return { state: "unknown", diagnostics: `${diagnostics} noGate noOrb`, actionButtons };
      }
      const attackButtons = attackButtonsAmong(actionButtons);
      const dialogBlues = await findColorBlobs(screenshot, DIALOG_BLUE, {
        minPixels: 60,
        searchArea: LOWER_BAND
      });
      const resultDialog = await findResultDialog(screenshot, attackButtons, dialogBlues);
      if (resultDialog) {
        const { ok, blues, faded } = resultDialog;
        const gold = await bannerGoldFraction(
          screenshot,
          faded ? FADED_VICTORY_GOLD : VICTORY_GOLD
        );
        const foreign = await bannerForeignFraction(screenshot);
        const occluded = foreign >= BANNER_OCCLUDED_MIN;
        const casualties = readBattleCasualties(
          screenshot,
          dialogBodyAbove(ok),
          this.canvasAspect
        );
        const outcome = readOutcome(gold >= VICTORY_GOLD_MIN, occluded, casualties);
        return {
          state: "battleResult",
          diagnostics: `${diagnostics} dialogBlue=${blues}${faded ? " faded" : ""} bannerGold=${gold.toFixed(3)} bannerForeign=${foreign.toFixed(3)} ${outcome.diagnostics} casualties=${casualties.verdict} (${casualties.diagnostics}) scanned=${casualties.scannedFraction.toFixed(3)}`,
          actionPoint: ok.center,
          actionButtons,
          ...outcome.won === void 0 ? {} : { battleWon: outcome.won },
          battleCasualties: casualties
        };
      }
      const dimmed = await findDimmedTeamButtons(screenshot);
      if (dimmed >= 2) {
        return {
          state: "noFieldableTeam",
          diagnostics: `${diagnostics} dimmedTeamButtons=${dimmed}`,
          actionButtons
        };
      }
      if (attackButtons.length >= 1) {
        const winged = await Promise.all(
          attackButtons.map(async (button2) => {
            if (!await hasWingedEmblem(screenshot, button2.center)) return false;
            const reading = await readBattleOption(
              screenshot,
              "single",
              emblemBoxAboveAttackButton(button2.center)
            );
            return reading.confidence >= MIN_EMBLEM_CONFIDENCE;
          })
        );
        if (winged.some(Boolean)) {
          const only = attackButtons.length === 1 ? attackButtons[0] : void 0;
          return {
            state: "battleChoice",
            diagnostics: `${diagnostics} winged=${winged.filter(Boolean).length}/${winged.length}`,
            ...only ? { actionPoint: only.center } : {},
            actionButtons
          };
        }
        return {
          state: "unknown",
          diagnostics: `${diagnostics} greenButNoEmblem`,
          actionButtons
        };
      }
      return { state: "unknown", diagnostics, actionButtons };
    }
  };
  async function findResultDialog(screenshot, liveGreens, liveBlues) {
    if (liveGreens.length === 1 && liveBlues.length >= 1) {
      return { ok: liveGreens[0], blues: liveBlues.length, faded: false };
    }
    const fadedGreens = await findFadedDialogButtons(screenshot, FADED_DIALOG_GREEN);
    if (fadedGreens.length !== 1) return void 0;
    const fadedBlues = await findFadedDialogButtons(screenshot, FADED_DIALOG_BLUE);
    if (fadedBlues.length < 1) return void 0;
    return { ok: fadedGreens[0], blues: fadedBlues.length, faded: true };
  }
  async function findFadedDialogButtons(screenshot, range) {
    const blobs = await findColorBlobs(screenshot, range, {
      minPixels: 170,
      searchArea: LOWER_BAND,
      minFillRatio: 0.7,
      minAspect: 1.6,
      maxAspect: 8
    });
    const faded = [];
    for (const blob of blobs) {
      const pixels = await cropToRgb(screenshot, blob.bounds);
      let brightest = 0;
      for (let y = 0; y < pixels.height; y += 1) {
        for (let x = 0; x < pixels.width; x += 1) {
          const { value } = pixelAt(pixels, x, y);
          if (value > brightest) brightest = value;
        }
      }
      if (brightest <= FADED_DIALOG_MAX_VALUE) faded.push(blob);
    }
    return faded;
  }
  async function findDimmedTeamButtons(screenshot) {
    const blobs = await findColorBlobs(screenshot, DIMMED_ACTION, {
      minPixels: 170,
      searchArea: TEAM_BUTTON_AREA,
      minFillRatio: 0.7,
      minAspect: 1.6,
      maxAspect: 8
    });
    let dimmedCount = 0;
    for (const blob of blobs) {
      const pixels = await cropToRgb(screenshot, blob.bounds);
      let bright = 0;
      let total = 0;
      for (let y = 0; y < pixels.height; y += 1) {
        for (let x = 0; x < pixels.width; x += 1) {
          total += 1;
          if (pixelAt(pixels, x, y).value > DIMMED_MAX_VALUE) bright += 1;
        }
      }
      if (total > 0 && bright / total < 0.5) dimmedCount += 1;
    }
    return dimmedCount;
  }
  async function findGate(screenshot) {
    const banners = await findColorBlobs(screenshot, BANNER_BLUE, {
      minPixels: BANNER_MIN_PIXELS,
      searchArea: GATE_SEARCH_AREA,
      // The blob is the hanging banner merged with the gate arch beneath it, so it
      // is tall and loosely filled. Measured fill 0.27-0.42, aspect 0.44-0.62.
      // The bars that share this blue are far wider: the Shop button is 3.8 and
      // the Titanite meter 18, both excluded by the aspect ceiling.
      minFillRatio: 0.2,
      minAspect: 0.35,
      maxAspect: 1.8
    });
    const painted = [];
    for (const banner2 of banners) {
      const skull = await skullCentre(screenshot, clothBox(banner2.center));
      if (skull && skull.whiteFraction >= BANNER_MIN_WHITE_FRACTION) {
        painted.push({ blob: banner2, skull: skull.centre });
      }
    }
    let banner;
    for (const candidate of painted) {
      if (!banner || candidate.blob.center.y < banner.blob.center.y) banner = candidate;
    }
    return banner?.skull;
  }
  async function skullCentre(screenshot, cloth) {
    const pixels = await cropToRgb(screenshot, cloth);
    const total = pixels.width * pixels.height;
    if (total === 0) return void 0;
    let sumX = 0;
    let sumY = 0;
    let white = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const hsv = pixelAt(pixels, x, y);
        if (hsv.value <= WHITE_MIN_VALUE2 || hsv.saturation >= WHITE_MAX_SATURATION2) continue;
        sumX += x;
        sumY += y;
        white += 1;
      }
    }
    if (white === 0) return void 0;
    return {
      centre: {
        x: cloth.x + sumX / white / pixels.width * cloth.w,
        y: cloth.y + sumY / white / pixels.height * cloth.h
      },
      whiteFraction: white / total
    };
  }
  var WHITE_MIN_VALUE2 = 0.78;
  var WHITE_MAX_SATURATION2 = 0.22;
  var ORB_BAND = { top: 0.25, bottom: 0.72 };
  var ORB_CLUSTER_X_GAP = 0.06;
  var ORB_MIN_TOTAL_PIXELS = 60;
  var ORB_LABEL_MIN_WHITE_FRACTION = 0.015;
  var ORB_LABEL_MIN_INK_DENSITY = 0.26;
  var ORB_LABEL_OFFSET = { above: 0.155, height: 0.08, width: 0.12 };
  var ORB_MIN_HEIGHT = 0.085;
  var ORB_MIN_WIDTH = 0.025;
  async function findActivateOrb(screenshot, candidates) {
    const inBand = candidates.filter(
      (blob) => blob.center.y > ORB_BAND.top && blob.center.y < ORB_BAND.bottom
    );
    if (inBand.length === 0) return void 0;
    const clusters = [];
    for (const blob of inBand.sort((a, b) => a.center.x - b.center.x)) {
      const existing = clusters.find(
        (cluster) => cluster.some((member) => Math.abs(member.center.x - blob.center.x) <= ORB_CLUSTER_X_GAP)
      );
      if (existing) existing.push(blob);
      else clusters.push([blob]);
    }
    let best;
    for (const cluster of clusters) {
      const pixelCount = cluster.reduce((sum, blob) => sum + blob.pixelCount, 0);
      if (pixelCount < ORB_MIN_TOTAL_PIXELS) continue;
      if (best && pixelCount <= best.pixelCount) continue;
      const top = Math.min(...cluster.map((blob) => blob.bounds.y));
      const bottom = Math.max(...cluster.map((blob) => blob.bounds.y + blob.bounds.h));
      const left = Math.min(...cluster.map((blob) => blob.bounds.x));
      const right = Math.max(...cluster.map((blob) => blob.bounds.x + blob.bounds.w));
      if (bottom - top < ORB_MIN_HEIGHT || right - left < ORB_MIN_WIDTH) continue;
      const center = { x: (left + right) / 2, y: (top + bottom) / 2 };
      const label = {
        x: Math.max(0, center.x - ORB_LABEL_OFFSET.width / 2),
        y: Math.max(0, center.y - ORB_LABEL_OFFSET.above),
        w: ORB_LABEL_OFFSET.width,
        h: ORB_LABEL_OFFSET.height
      };
      if (await whiteFraction(screenshot, label) < ORB_LABEL_MIN_WHITE_FRACTION) continue;
      if (await whiteInkDensity(screenshot, label) < ORB_LABEL_MIN_INK_DENSITY) continue;
      best = { center, pixelCount };
    }
    return best;
  }
  function inside(point, area) {
    return point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h;
  }
  function topmost(blobs) {
    return blobs.reduce((best, blob) => blob.center.y < best.center.y ? blob : best);
  }

  // src/strategy/optionPriority.ts
  var AmbiguousBattleChoiceError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "AmbiguousBattleChoiceError";
    }
  };
  var BattleOptionSelector = class {
    constructor(priority, minimumConfidence) {
      this.priority = priority;
      this.minimumConfidence = minimumConfidence;
    }
    select(options) {
      if (options.length === 0) {
        throw new AmbiguousBattleChoiceError("No battle options were detected on screen.");
      }
      const unsure = options.filter((option) => option.confidence < this.minimumConfidence);
      if (unsure.length > 0) {
        const details = unsure.map((option) => `${option.side}=${option.element}@${option.confidence.toFixed(2)}`).join(", ");
        throw new AmbiguousBattleChoiceError(
          `Element identification below the ${this.minimumConfidence} confidence floor (${details}). Refusing to guess, because a misread here could spend an attempt on the wrong element.`
        );
      }
      for (const element of this.priority) {
        const match = options.find((option) => option.element === element);
        if (match) return match;
      }
      throw new AmbiguousBattleChoiceError(
        `None of the detected elements (${options.map((o) => o.element).join(", ")}) appear in the configured priority list (${this.priority.join(" > ")}).`
      );
    }
  };

  // src/strategy/healingSlot.ts
  var TIE_HEALTH_MARGIN = 0.05;
  var HealingSlotSelector = class {
    constructor(policy) {
      this.policy = policy;
    }
    /**
     * Returns undefined when no candidate can be fielded at all, which happens when
     * they are all dead. The caller then leaves the roster alone rather than trying
     * to slot someone who cannot fight.
     */
    select(candidates) {
      const alive = candidates.filter((titan) => !titan.isDead).sort((a, b) => this.preferenceOf(a.name) - this.preferenceOf(b.name));
      if (alive.length === 0) return void 0;
      const needingHeal = alive.filter((titan) => titan.health <= this.policy.healAtOrBelowHealth);
      if (needingHeal.length === 0) {
        const preferred = alive[0];
        return {
          titan: preferred.name,
          reason: `no living candidate at or below ${asPercent(this.policy.healAtOrBelowHealth)}; using the most preferred`
        };
      }
      if (needingHeal.length === 1) {
        const [only] = needingHeal;
        return {
          titan: only.name,
          reason: `${only.name} at ${asPercent(only.health)} needs healing`
        };
      }
      const worst = needingHeal.reduce((low, titan) => titan.health < low.health ? titan : low);
      const tied = needingHeal.filter((titan) => titan.health - worst.health <= TIE_HEALTH_MARGIN);
      const chosen = tied.length === 1 ? worst : tied[0];
      const others = needingHeal.filter((titan) => titan.name !== chosen.name).map((titan) => `${titan.name} at ${asPercent(titan.health)}`).join(", ");
      const because = tied.length === 1 ? "is the worst off" : "is preferred with nothing to choose between them";
      return {
        titan: chosen.name,
        reason: `${chosen.name} at ${asPercent(chosen.health)} ${because}, ahead of ${others}`
      };
    }
    /**
     * Where a titan sits in the owner's preference order.
     *
     * A name that is not in the list sorts last rather than throwing. That can only happen if a portrait
     * is configured for a titan the policy does not list, which is a configuration to tolerate rather
     * than a run to stop.
     */
    preferenceOf(name) {
      const position = this.policy.candidates.indexOf(name);
      return position >= 0 ? position : this.policy.candidates.length;
    }
  };
  function asPercent(fraction) {
    return `${Math.round(fraction * 100)}%`;
  }

  // src/vision/rosterCalibration.ts
  var HEALTH_HUE = { min: 70, max: 165 };
  var HEALTH_MIN_SATURATION = 0.3;
  var HEALTH_MIN_VALUE = 0.2;
  var TICK_MIN_PIXELS = 80;
  var TICK_MIN_DENSITY = 0.19;
  var TICK_MAX_ASPECT = 0.95;
  var BAR_TROUGH_MAX_VALUE = 0.145;
  var MIN_BAR_WIDTH = 0.015;
  var STRIP_SEARCH_TOP = 0.6;
  var LATTICE_TOLERANCE = 4e-3;
  var MIN_BARS = 3;
  var BADGE_SHARE_OF_TILE = 0.22;
  var ART_BOTTOM_SHARE_OF_TILE = 0.58;
  var TILE_WINDOW_SHARE_OF_PITCH = 1.4;
  var CARD_DETAIL_THRESHOLD = 0.06;
  var TILE_PROBE_INSET = 0.15;
  var TICK_SEARCH_SHARE_OF_TILE = 0.45;
  var ART_SHARE_OF_CARD_WIDTH = 0.66;
  var isHealth = (pixel) => pixel.hue >= HEALTH_HUE.min && pixel.hue <= HEALTH_HUE.max && pixel.saturation >= HEALTH_MIN_SATURATION && pixel.value >= HEALTH_MIN_VALUE;
  async function deriveRosterGeometry(screenshot, onTickBlob) {
    const whole = cropRegion(screenshot, {
      left: 0,
      top: 0,
      width: screenshot.width,
      height: screenshot.height
    });
    const pixels = { data: whole.data, width: whole.width, height: whole.height };
    const tolerance = LATTICE_TOLERANCE * pixels.width;
    const notes = [];
    const health = findBarBand(
      pixels,
      isHealth,
      Math.round(STRIP_SEARCH_TOP * pixels.height),
      pixels.height - 1,
      tolerance,
      true
    );
    if (!health) return refuse(notes, "no row of health bars at a constant pitch was found");
    notes.push(
      `health rows ${health.top}-${health.bottom}, ${health.lattice.runs.length} bars, thickness ${health.bottom - health.top + 1}px`
    );
    const pitch = health.lattice.pitch;
    const background = backgroundColour(
      pixels,
      Math.round((health.top + health.bottom) / 2),
      health.lattice.runs
    );
    const frames = barFrames(pixels, health, background);
    if (frames.length === 0) {
      return refuse(notes, "could not measure the bar frames");
    }
    const frameWidth = median(frames.map((frame) => frame.right - frame.left + 1));
    const barFillWidth = median(frames.map((frame) => frame.fillWidth));
    notes.push(
      `frame ${frameWidth.toFixed(1)}px, bar fill ${barFillWidth.toFixed(1)}px, background hue ${background.hue.toFixed(0)}`
    );
    const anchorCentre = cardCentreFromBarFrames(frames, pitch);
    const barCentres = health.lattice.runs.map((run) => run.start + frameWidth / 2);
    const tile = findTileBand(
      pixels,
      health.top,
      background,
      barCentres,
      frameWidth,
      Math.round(pitch * TILE_WINDOW_SHARE_OF_PITCH)
    );
    if (!tile) {
      return refuse(notes, "could not find the card tiles above the bars");
    }
    const tileHeight = tile.bottom - tile.top;
    const tileTop = tile.top;
    notes.push(`tile rows ${tile.top}-${tile.bottom} (${tileHeight}px)`);
    const strip = walkStrip(
      pixels,
      Math.round(tile.top + tileHeight * TILE_PROBE_INSET),
      Math.round(tile.bottom - tileHeight * TILE_PROBE_INSET),
      anchorCentre,
      pitch,
      frameWidth
    );
    notes.push(
      `${strip.count} cards, pitch ${pitch.toFixed(1)}px, first centre ${strip.firstCentre.toFixed(1)}px`
    );
    if (strip.count === 0) {
      return refuse(
        notes,
        `the tile band is ${tileHeight}px against a ${pitch.toFixed(0)}px pitch and holds no artwork to count cards by`,
        ARTWORK_HAS_NOT_ARRIVED
      );
    }
    const tick = findTick(
      pixels,
      strip.firstCentre,
      pitch,
      strip.count,
      Math.round(tile.bottom - tileHeight * TICK_SEARCH_SHARE_OF_TILE),
      tile.bottom,
      onTickBlob
    );
    notes.push(
      tick ? `tick dx ${(tick.dx / pixels.width).toFixed(4)}, y ${(tick.centreY / pixels.height).toFixed(4)}` : "no in-team tick in this frame"
    );
    const artTop = tileTop + tileHeight * BADGE_SHARE_OF_TILE;
    const artBottom = tileTop + tileHeight * ART_BOTTOM_SHARE_OF_TILE;
    if (artBottom <= artTop) {
      return refuse(notes, "the artwork band came out inverted");
    }
    const geometry = {
      firstCardCenterX: strip.firstCentre / pixels.width,
      cardSpacingX: pitch / pixels.width,
      visibleCardCount: strip.count,
      portraitCenterY: (tile.top + tile.bottom) / 2 / pixels.height,
      portraitBox: { w: frameWidth / pixels.width, h: tileHeight / pixels.height },
      healthBar: {
        y: (health.top + health.bottom) / 2 / pixels.height,
        halfWidth: barFillWidth / 2 / pixels.width,
        thickness: (health.bottom - health.top + 1) / pixels.height
      },
      portraitArt: {
        w: pitch * ART_SHARE_OF_CARD_WIDTH / pixels.width,
        h: (artBottom - artTop) / pixels.height,
        centerY: (artTop + artBottom) / 2 / pixels.height
      },
      selectedTick: tick ? {
        dx: tick.dx / pixels.width,
        y: tick.centreY / pixels.height,
        w: tick.width / pixels.width,
        h: tick.height / pixels.height
      } : { dx: 0, y: 0, w: 0, h: 0 },
      // Only drawn on a mixed roster, so it cannot be derived from an element-restricted one.
      // Left to configuration until it can be derived from a frame that shows it.
      elementBadge: null
    };
    return { geometry, diagnostics: notes.join("; ") };
  }
  function fitLattice(runs, tolerance) {
    if (runs.length < MIN_BARS) return void 0;
    const sorted = [...runs].sort((a, b) => a.start - b.start);
    const edges = sorted.map((run) => run.start);
    const gaps = [];
    for (let index = 1; index < edges.length; index += 1) gaps.push(edges[index] - edges[index - 1]);
    if (gaps.length === 0) return void 0;
    const smallest = Math.min(...gaps);
    const pitch = median(gaps.filter((gap) => gap <= smallest * 1.5));
    if (pitch <= tolerance) return void 0;
    let best;
    for (const origin of edges) {
      const matched = sorted.filter(
        (run) => Math.abs(run.start - (origin + Math.round((run.start - origin) / pitch) * pitch)) <= tolerance
      );
      if (!best || matched.length > best.runs.length) best = { origin, runs: matched };
    }
    if (!best || best.runs.length < MIN_BARS) return void 0;
    return { pitch, origin: Math.min(...best.runs.map((run) => run.start)), runs: best.runs };
  }
  var BARS_ARE_THE_ANCHOR = "The strip is anchored on the titans' health bars, and a dead titan draws none at all - so a roster with fewer than three living titans in it cannot be measured, and the configured geometry has to stand in.";
  var ARTWORK_HAS_NOT_ARRIVED = "Cards are counted on their artwork, because a dead titan draws no bar to count instead - and until the portraits load the game fills every tile with a flat element colour, which has nothing to count. This is a screen still assembling, not a screen without a roster; a frame in this state is also the one that makes portrait matching quietly wrong, so it is refused rather than measured.";
  function refuse(notes, detail, because = BARS_ARE_THE_ANCHOR) {
    const measured = notes.length === 0 ? "" : `${notes.join("; ")}; `;
    return { diagnostics: `${measured}${detail}. ${because}` };
  }
  function findBarBand(pixels, matches, searchTop, searchBottom, tolerance, preferLowest = false) {
    const minWidth = Math.round(MIN_BAR_WIDTH * pixels.width);
    const latticeOn = (y) => fitLattice(runsOnRow(pixels, y, matches, minWidth), tolerance);
    let best;
    for (let y = searchBottom; y >= searchTop; y -= 1) {
      const lattice = latticeOn(y);
      if (!lattice) continue;
      if (!best || lattice.runs.length > best.lattice.runs.length) best = { row: y, lattice };
      if (preferLowest) break;
    }
    if (!best) return void 0;
    const wanted = best.lattice.runs.length;
    let top = best.row;
    let bottom = best.row;
    while (top - 1 >= searchTop && latticeOn(top - 1)?.runs.length === wanted) top -= 1;
    while (bottom + 1 <= searchBottom && latticeOn(bottom + 1)?.runs.length === wanted) bottom += 1;
    return { top, bottom, lattice: best.lattice };
  }
  function runsOnRow(pixels, y, matches, minWidth) {
    const runs = [];
    let start;
    for (let x = 0; x <= pixels.width; x += 1) {
      const hit = x < pixels.width && matches(hsvAt(pixels, x, y));
      if (hit && start === void 0) start = x;
      if (!hit && start !== void 0) {
        if (x - start >= minWidth) runs.push({ start, end: x - 1 });
        start = void 0;
      }
    }
    return runs;
  }
  function hsvAt(pixels, x, y) {
    const offset = (y * pixels.width + x) * 3;
    return rgbToHsv(pixels.data[offset] ?? 0, pixels.data[offset + 1] ?? 0, pixels.data[offset + 2] ?? 0);
  }
  function backgroundColour(pixels, row, runs) {
    const inside2 = (x) => runs.some((run) => x >= run.start - 4 && x <= run.end + 4);
    const hues = [];
    const saturations = [];
    const values = [];
    for (let x = 0; x < pixels.width; x += 2) {
      if (inside2(x)) continue;
      const pixel = hsvAt(pixels, x, row);
      hues.push(pixel.hue);
      saturations.push(pixel.saturation);
      values.push(pixel.value);
    }
    return { hue: circularMedian(hues), saturation: median(saturations), value: median(values) };
  }
  var BACKGROUND_HUE_TOLERANCE = 25;
  var BACKGROUND_VALUE_TOLERANCE = 0.14;
  function isBackground(pixel, background) {
    return hueDistance(pixel.hue, background.hue) <= BACKGROUND_HUE_TOLERANCE && Math.abs(pixel.value - background.value) <= BACKGROUND_VALUE_TOLERANCE;
  }
  function barFrames(pixels, band, background) {
    const row = Math.round((band.top + band.bottom) / 2);
    const frames = [];
    for (const run of band.lattice.runs) {
      let start = run.start;
      let end = run.end;
      while (start - 1 >= 0 && !isBackground(hsvAt(pixels, start - 1, row), background)) start -= 1;
      while (end + 1 < pixels.width && !isBackground(hsvAt(pixels, end + 1, row), background)) end += 1;
      if (end - start + 1 >= band.lattice.pitch) continue;
      let trackStart = run.start;
      let trackEnd = run.end;
      while (trackStart - 1 >= 0 && hsvAt(pixels, trackStart - 1, row).value <= BAR_TROUGH_MAX_VALUE) {
        trackStart -= 1;
      }
      while (trackEnd + 1 < pixels.width && hsvAt(pixels, trackEnd + 1, row).value <= BAR_TROUGH_MAX_VALUE) {
        trackEnd += 1;
      }
      const border = run.start - trackStart;
      frames.push({ left: start, right: end, fillWidth: trackEnd - trackStart + 1 - 2 * border });
    }
    return frames;
  }
  function cardCentreFromBarFrames(frames, pitch) {
    const centres = frames.map((frame) => (frame.left + frame.right) / 2);
    const leftmost = Math.min(...centres);
    return median(centres.map((centre) => centre - pitch * Math.round((centre - leftmost) / pitch)));
  }
  function walkStrip(pixels, nearTop, nearBottom, anchorCentre, pitch, frameWidth) {
    const present = (centre) => {
      if (centre - frameWidth / 2 < 0 || centre + frameWidth / 2 >= pixels.width) return false;
      return detailAcross(pixels, nearTop, centre, frameWidth) >= CARD_DETAIL_THRESHOLD && detailAcross(pixels, nearBottom, centre, frameWidth) >= CARD_DETAIL_THRESHOLD;
    };
    let firstCentre = anchorCentre;
    while (present(firstCentre - pitch)) firstCentre -= pitch;
    let count = 0;
    for (let index = 0; ; index += 1) {
      if (!present(firstCentre + index * pitch)) break;
      count = index + 1;
    }
    return { firstCentre, count };
  }
  function tickBlobForCard(pixels, centre, pitch, searchTopRow, healthTop) {
    const searchTop = Math.max(0, searchTopRow);
    const left = Math.round(centre);
    const right = Math.min(pixels.width - 1, Math.round(centre + pitch / 2));
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let count = 0;
    for (let y = searchTop; y < healthTop; y += 1) {
      for (let x = left; x <= right; x += 1) {
        if (!isTickPixel(hsvAt(pixels, x, y))) continue;
        count += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return void 0;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const density = count / (width * height);
    return {
      count,
      minX,
      maxX,
      minY,
      maxY,
      width,
      height,
      density,
      aspect: height / width,
      isTick: count >= TICK_MIN_PIXELS && density >= TICK_MIN_DENSITY && height / width <= TICK_MAX_ASPECT
    };
  }
  function findTick(pixels, firstCentre, pitch, cardCount, searchTopRow, healthTop, onBlob) {
    const found = [];
    for (let index = 0; index < cardCount; index += 1) {
      const centre = firstCentre + index * pitch;
      const blob = tickBlobForCard(pixels, centre, pitch, searchTopRow, healthTop);
      if (!blob) continue;
      onBlob?.(index, blob);
      if (!blob.isTick) continue;
      found.push({
        dx: (blob.minX + blob.maxX) / 2 - centre,
        centreY: (blob.minY + blob.maxY) / 2,
        width: blob.width,
        height: blob.height,
        top: blob.minY
      });
    }
    if (found.length === 0) return void 0;
    return {
      dx: median(found.map((tick) => tick.dx)),
      centreY: median(found.map((tick) => tick.centreY)),
      width: median(found.map((tick) => tick.width)),
      height: median(found.map((tick) => tick.height)),
      top: median(found.map((tick) => tick.top))
    };
  }
  function findTileBand(pixels, healthTop, background, cardCentres, frameWidth, windowHeight) {
    const limit = Math.max(
      Math.round(STRIP_SEARCH_TOP * pixels.height),
      healthTop - windowHeight
    );
    const covered = (y) => cardCentres.some((centre) => detailAcross(pixels, y, centre, frameWidth) >= CARD_DETAIL_THRESHOLD);
    let best;
    let runBottom;
    for (let y = healthTop - 1; y >= limit; y -= 1) {
      if (covered(y)) {
        if (runBottom === void 0) runBottom = y;
        continue;
      }
      if (runBottom !== void 0) {
        const candidate = { top: y + 1, bottom: runBottom };
        if (!best || candidate.bottom - candidate.top > best.bottom - best.top) best = candidate;
        runBottom = void 0;
      }
    }
    if (runBottom !== void 0) {
      const candidate = { top: limit, bottom: runBottom };
      if (!best || candidate.bottom - candidate.top > best.bottom - best.top) best = candidate;
    }
    return best && best.bottom > best.top ? best : void 0;
  }
  function detailAcross(pixels, y, centre, width) {
    const left = Math.max(0, Math.round(centre - width / 2));
    const right = Math.min(pixels.width - 1, Math.round(centre + width / 2));
    if (right <= left) return 0;
    const values = [];
    for (let x = left; x <= right; x += 2) values.push(hsvAt(pixels, x, y).value);
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / values.length;
    return Math.sqrt(variance);
  }
  function median(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : sorted[middle] ?? 0;
  }
  function circularMedian(degrees) {
    if (degrees.length === 0) return 0;
    let sumX = 0;
    let sumY = 0;
    for (const value of degrees) {
      sumX += Math.cos(value * Math.PI / 180);
      sumY += Math.sin(value * Math.PI / 180);
    }
    let mean = Math.atan2(sumY / degrees.length, sumX / degrees.length) * 180 / Math.PI;
    if (mean < 0) mean += 360;
    return mean;
  }

  // src/flow/RosterGeometrySource.ts
  var RosterGeometrySource = class {
    constructor(config, log) {
      this.config = config;
      this.log = log;
    }
    resolved;
    derived;
    attempted = false;
    /**
     * The geometry to use, or undefined when neither source can supply one.
     *
     * Undefined is a real answer and callers must stop on it. Guessing a strip geometry means
     * reading one titan's health off another titan's card.
     */
    async forFrame(screenshot) {
      if (this.resolved) return this.resolved;
      const configured = this.config.coordinates.teamSelect.roster;
      if (!this.attempted) {
        this.attempted = true;
        const measured = (await deriveRosterGeometry(screenshot)).geometry;
        this.derived = measured && { ...measured, selectedTickShape: configured.selectedTickShape };
        if (this.derived) this.reportDrift(this.derived, configured);
      }
      if (this.config.calibrated) {
        this.resolved = configured;
        return this.resolved;
      }
      if (this.derived) {
        this.resolved = { ...this.derived, elementBadge: configured.elementBadge };
        this.log("Roster geometry measured from the screen; no calibrated config to prefer.");
        return this.resolved;
      }
      return void 0;
    }
    /**
     * Reports how far the measurement sits from the configured numbers.
     *
     * Worth logging rather than silently preferring one: a large disagreement means either the
     * config is stale or the derivation has been fooled, and both are things to know about
     * before a run spends attempts.
     */
    reportDrift(derived, configured) {
      const differences = [];
      const compare = (name, a, b) => {
        if (Math.abs(a - b) > DRIFT_WORTH_MENTIONING) {
          differences.push(`${name} ${a.toFixed(4)} vs ${b.toFixed(4)} configured`);
        }
      };
      compare("firstCardCenterX", derived.firstCardCenterX, configured.firstCardCenterX);
      compare("cardSpacingX", derived.cardSpacingX, configured.cardSpacingX);
      compare("healthBar.y", derived.healthBar.y, configured.healthBar.y);
      compare("portraitArt.centerY", derived.portraitArt.centerY, configured.portraitArt.centerY);
      if (derived.visibleCardCount !== configured.visibleCardCount) {
        differences.push(
          `${derived.visibleCardCount} cards vs ${configured.visibleCardCount} configured`
        );
      }
      if (differences.length > 0) {
        this.log(`  differs from the config: ${differences.join(", ")}`);
      }
    }
  };
  var DRIFT_WORTH_MENTIONING = 4e-3;

  // src/flow/RunEnded.ts
  var RUN_ENDING_VOCABULARY = {
    aborted: {
      headline: "RUN ABORTED.",
      summary: "The run met something it could not read or could not act on, and stopped rather than guessing. The frame it stopped on is the evidence.",
      frameLabel: "abort"
    },
    declined: {
      headline: "RUN DECLINED.",
      summary: "A rule this run was given stopped it on purpose. Nothing is broken and nothing was pressed; the frame below is what the rule read.",
      frameLabel: "declined"
    }
  };
  function vocabularyFor(ending) {
    return RUN_ENDING_VOCABULARY[ending];
  }
  var RunEndedError = class extends Error {
    constructor(ending, message, framePath) {
      super(message);
      this.ending = ending;
      this.framePath = framePath;
      this.name = "RunEndedError";
    }
    get headline() {
      return vocabularyFor(this.ending).headline;
    }
    get summary() {
      return vocabularyFor(this.ending).summary;
    }
    /**
     * The whole thing a host should print, composed once here rather than at each host.
     *
     * There are three hosts and they used to phrase this themselves — the Node console said "Run
     * stopped on purpose rather than guessing", the panel said "Stopped on purpose", the phone said
     * "RUN ABORTED." — so the same event reached three people in three shapes. Composing it here is
     * what makes the word the same wherever it is read.
     */
    get announcement() {
      return `${this.headline} ${this.summary}
${this.message}`;
    }
  };
  function frameLabelFor(ending) {
    return vocabularyFor(ending).frameLabel;
  }
  function unsettledResultFrameLabel(battleNumber, look) {
    return `result_unsettled_battle${battleNumber}_look${look}`;
  }
  function unsettledTeamFrameLabel(battleNumber) {
    return `teamstrength_battle${battleNumber}`;
  }

  // src/vision/health.ts
  var HEALTH_GREEN_HUE_MIN = 70;
  var HEALTH_GREEN_HUE_MAX = 165;
  var HEALTH_MIN_SATURATION2 = 0.3;
  var HEALTH_MIN_VALUE2 = 0.2;
  async function readHealthFraction(screenshot, barBox) {
    const pixels = await cropToRgb(screenshot, barBox);
    if (pixels.width === 0) return 0;
    let filledColumns = 0;
    for (let x = 0; x < pixels.width; x += 1) {
      if (columnIsFilled(pixels, x)) filledColumns += 1;
    }
    return filledColumns / pixels.width;
  }
  function columnIsFilled(pixels, x) {
    for (let y = 0; y < pixels.height; y += 1) {
      const hsv = pixelAt(pixels, x, y);
      const isGreen = hsv.hue >= HEALTH_GREEN_HUE_MIN && hsv.hue <= HEALTH_GREEN_HUE_MAX && hsv.saturation >= HEALTH_MIN_SATURATION2 && hsv.value >= HEALTH_MIN_VALUE2;
      if (isGreen) return true;
    }
    return false;
  }
  function healthBarBoxForCard(index, geometry) {
    const centerX = geometry.firstCardCenterX + index * geometry.cardSpacingX;
    return {
      x: centerX - geometry.healthBar.halfWidth,
      y: geometry.healthBar.y - geometry.healthBar.thickness / 2,
      w: geometry.healthBar.halfWidth * 2,
      h: geometry.healthBar.thickness
    };
  }

  // src/vision/teamSlots.ts
  var MARKER_GOLD = { hueMin: 25, hueMax: 55, minSaturation: 0.35, minValue: 0.4 };
  var ARENA_SEARCH_AREA = { x: 0.04, y: 0.25, w: 0.42, h: 0.3 };
  async function findEmptyTeamSlots(screenshot, slotCenters, shape) {
    const blobs = await findColorBlobs(screenshot, MARKER_GOLD, {
      minPixels: shape.minPixels,
      searchArea: ARENA_SEARCH_AREA
    });
    const markers = blobs.filter(
      (blob) => blob.pixelCount <= shape.maxPixels && blob.aspect >= shape.minAspect && blob.aspect <= shape.maxAspect && blob.fillRatio >= shape.minFillRatio && blob.fillRatio <= shape.maxFillRatio
    );
    const empty = [];
    for (const [index, center] of slotCenters.entries()) {
      const hasMarkerBlob = markers.some(
        (blob) => distanceBetween(blob.center, center) <= shape.positionTolerance
      );
      if (!hasMarkerBlob) continue;
      const coverage = goldCoverage(screenshot, center, shape.coverageBox);
      if (coverage >= shape.minGoldCoverage && coverage <= shape.maxGoldCoverage) {
        empty.push(index);
      }
    }
    return empty;
  }
  function goldCoverage(screenshot, center, box) {
    const pixels = cropToRgb(screenshot, {
      x: center.x - box.w / 2,
      y: center.y - box.h / 2,
      w: box.w,
      h: box.h
    });
    const total = pixels.width * pixels.height;
    if (total === 0) return 0;
    let gold = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const colour = pixelAt(pixels, x, y);
        if (colour.hue >= MARKER_GOLD.hueMin && colour.hue <= MARKER_GOLD.hueMax && colour.saturation >= MARKER_GOLD.minSaturation && colour.value >= MARKER_GOLD.minValue) {
          gold += 1;
        }
      }
    }
    return gold / total;
  }
  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // src/flow/DungeonRunner.ts
  var MIN_ELEMENT_CONFIDENCE = 0.55;
  var PANEL_AREA_RIGHT_EDGE = 0.72;
  var BATTLE_ATTEMPTS_WITHOUT_DELAY = 200;
  var MAX_CHAINED_SAVE_POINT_DIALOGS = 2;
  var GATE_SETTLE_TOLERANCE = 0.01;
  var EMPTY_SLOT_CONFIRMATIONS = 3;
  var UNDERSTRENGTH_CONFIRMATIONS = 4;
  var UNDERSTRENGTH_SETTLE_MS = 700;
  var MAX_UNSETTLED_TEAM_FRAMES = 4;
  var DEAD_HEALTH_THRESHOLD = 0.02;
  var CASUALTY_READ_ATTEMPTS = 3;
  var CASUALTY_SETTLE_MS = 700;
  var MAX_UNSETTLED_RESULT_FRAMES = 3;
  var NO_BATTLE_YET = -1;
  var MAX_STUCK_ROUNDS = 3;
  function describeEmptySlots(empty, checked) {
    if (empty.length === 0) return `none of the ${checked} checked shows an empty marker`;
    const names = empty.map((slot) => `slot ${slot}`);
    const named = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return empty.length === 1 ? `${named} of the ${checked} checked still shows its empty marker` : `${named} of the ${checked} checked still show their empty markers`;
  }
  function describeTickCount(fielded, required) {
    if (fielded === void 0) return "the roster strip could not be read";
    return `${fielded} of ${required} titans ticked in the roster`;
  }
  function namesCards(indexes) {
    if (indexes.length === 0) return "no cards";
    if (indexes.length === 1) return `card ${indexes[0]}`;
    return `cards ${indexes.slice(0, -1).join(", ")} and ${indexes[indexes.length - 1]}`;
  }
  function shortTeamRemedy(strip, requiredTitans, stripShowsEveryone) {
    const fillIt = "Fill the team and run again, or set strategy.team.allowIncompleteTeam if that is what you meant.";
    if (!strip || strip.dead.length === 0) return fillIt;
    const { cards, dead } = strip;
    const living = cards - dead.length;
    const died = `The strip says what happened: of the ${cards} cards it is showing, counting from the left, ${namesCards(dead)} ${dead.length === 1 ? "has" : "have"} no health bar left - which is how this game draws a titan that died. The game drops a dead titan from the team and puts nobody in its place.`;
    let whatIsLeft;
    if (living >= requiredTitans) {
      whatIsLeft = `${living} of the ${cards} still have health, so a full team of ${requiredTitans} can still be put together by hand: add whichever of them the game left out, and run again.`;
    } else if (stripShowsEveryone) {
      whatIsLeft = `Only ${living} of the ${cards} still have health, and this floor draws every titan that could be fielded on it, so there is no full team of ${requiredTitans} to arrange for this room today. A dead titan cannot be fielded again until it is revived.`;
    } else {
      whatIsLeft = `Only ${living} of the ${cards} in view still have health, and this floor's strip scrolls, so whether ${requiredTitans} living titans remain cannot be read from here. Fill the team by hand before running again.`;
    }
    return `${died} ${whatIsLeft} Setting strategy.team.allowIncompleteTeam would fight every remaining room a titan short rather than fix that.`;
  }
  var STILL_ASSEMBLING_PHRASE = "still assembling";
  function stripRefusalFrom(diagnostics) {
    return diagnostics.includes(STILL_ASSEMBLING_PHRASE) ? "stillAssembling" : "tooFewLivingTitans";
  }
  function teamHealthLine(fielded, benched) {
    const readings = fielded.map(
      ({ index, health }) => health <= DEAD_HEALTH_THRESHOLD ? `card ${index} DEAD` : `card ${index} ${Math.round(health * 100)}%`
    );
    return `  team: ${readings.join(", ")}${describeBenchedCards(benched)}`;
  }
  function describeBenchedCards(benched) {
    if (!benched.measured) {
      const because = benched.why === "stillAssembling" ? "the screen is still being drawn" : "too few titans are still alive to draw the bars it is measured from";
      return ` (the strip could not be measured on this frame - ${because} - so no card outside the team is called dead)`;
    }
    const { dead } = benched;
    if (dead.length === 0) return "";
    return ` (${namesCards(dead)} ${dead.length === 1 ? "is" : "are"} DEAD and not in the team)`;
  }
  function looksDisagree(one, other) {
    return one.fielded !== other.fielded || one.empty.length !== other.empty.length;
  }
  var TeamSettle = class {
    constructor(first, later, fieldedOnArrival) {
      this.first = first;
      this.later = later;
      this.fieldedOnArrival = fieldedOnArrival;
    }
    get looks() {
      return [this.first, ...this.later];
    }
    /** The reading acted on: the last one taken, which is the most settled one available. */
    get settled() {
      return this.later.at(-1) ?? this.first;
    }
    /**
     * Whether anything about the team changed between readings that were meant to agree.
     *
     * Covers both halves of the same event: a count that moved while the settle was running, and a
     * count that had already moved between the frame the loop arrived with and the first of these.
     * Neither is an error - it is the screen being drawn - which is why this drives a log line and a
     * kept frame and never a refusal. The handoff document proposed refusing on exactly this
     * contradiction; implemented that way it would have aborted the healthy run that prompted all of
     * it. This is a settle detector, not a safety check.
     */
    get screenWasMoving() {
      const settled = this.settled;
      if (this.looks.some((look) => looksDisagree(look, settled))) return true;
      return this.fieldedOnArrival !== void 0 && this.fieldedOnArrival !== settled.fielded;
    }
    /** Whether the settled reading positively says a slot is empty, rather than merely failing to fill one. */
    get sawAnEmptySlot() {
      return this.settled.empty.length > 0;
    }
    /**
     * The frame worth keeping: the first that disagreed with where the screen ended up.
     *
     * The same choice {@link DungeonRunner.keepUnsettledResultFrame} makes and for the same reason - a
     * picture of the screen after it settled is not a picture of the problem, and by the time a second
     * photograph could be taken the team has finished assembling. When nothing disagreed there is only
     * one screen to photograph, and it is the one the decision was read from.
     */
    get frameWorthKeeping() {
      const settled = this.settled;
      const moved = this.looks.find((look) => looksDisagree(look, settled));
      return (moved ?? settled).frame;
    }
    /**
     * The line, or none when there was one look and it agreed with everything before it.
     *
     * Silent in the ordinary case on purpose: four battles in five read a full team on the first look,
     * and a line saying so on every one of them would bury the ones worth reading.
     *
     * Says nothing about *why* there is no arrival count to compare against. Two things produce that -
     * a healing swap between the two readings, and a strip the arrival frame could not be measured on -
     * and naming one of them here is how a log line starts asserting something it did not check.
     *
     * Worded as the phone words it, down to the arrow between the counts. A triager holding a bundle
     * from each client should be reading one sentence about one event, and the size of a full team is
     * left out of it because the wait lines above and the refusal below both already carry that.
     */
    report() {
      if (this.later.length === 0 && !this.screenWasMoving) return void 0;
      const trail = this.looks.map((look) => `${look.fielded ?? "?"}/${look.empty.length}`).join(" -> ");
      const looks = this.later.length === 0 ? "read once" : `read ${this.looks.length} times ${UNDERSTRENGTH_SETTLE_MS}ms apart`;
      const arrival = this.fieldedOnArrival === void 0 ? "with no comparable count from the frame the run arrived with" : `against ${this.fieldedOnArrival} tick(s) on the frame the run arrived with`;
      const moved = this.screenWasMoving ? " The screen was still being drawn, so the last of those is what was acted on." : "";
      return `  ${looks} in case the game was still assembling the team; ticks/markers went ${trail}, ${arrival}.${moved}`;
    }
  };
  function describeCasualties(detection) {
    const { battleCasualties, state } = detection;
    return battleCasualties ? battleCasualties.diagnostics : `the last look found ${state}, which carries no casualty reading`;
  }
  function assertEveryVerdictHandled(verdict) {
    throw new Error(`unhandled casualty verdict ${JSON.stringify(verdict)}`);
  }
  var DungeonRunner = class {
    constructor(session, config, log, portraits, shouldStop = () => false) {
      this.session = session;
      this.config = config;
      this.log = log;
      this.portraits = portraits;
      this.shouldStop = shouldStop;
      this.detector = new ScreenDetector(config);
      this.optionSelector = new BattleOptionSelector(
        config.strategy.elementPriority,
        MIN_ELEMENT_CONFIDENCE
      );
      this.healingSlot = new HealingSlotSelector(config.strategy.healing);
      this.rosterGeometry = new RosterGeometrySource(config, log);
    }
    detector;
    optionSelector;
    healingSlot;
    rosterGeometry;
    lastChosenElement;
    lastScreenshot;
    templates;
    /** Frames kept for {@link MAX_UNSETTLED_RESULT_FRAMES}, counted for this run only. */
    unsettledResultFramesKept = 0;
    /** Frames kept for {@link MAX_UNSETTLED_TEAM_FRAMES}, counted for this run only. */
    unsettledTeamFramesKept = 0;
    /**
     * Which battle's casualty verdict has already been reached, or {@link NO_BATTLE_YET} before any.
     *
     * A verdict is a fact about a *battle*, not about a frame, and this loop sees one battle's result
     * dialog more than once as a matter of routine: the dialog animates in, a click that lands while
     * it is arriving is ignored, and the next read finds the same dialog again. Three battles in a
     * hundred were counted twice that way before `resultAlreadyCounted` existed, and the same
     * repeated sighting was still getting a second casualty reading long after the counting was fixed.
     *
     * **The phone is where that came due.** On 2026-09-08 an Android run read battle 7 of 25 as
     * `noneDead`, collected and counted it, and then met {@link stopIfATitanDied} again on a dialog
     * whose reward cards were still flying across the status row. Three unreadable readings later -
     * the last two of them a save point - the run stopped at 7 of 25. This client has the identical
     * shape and only luck between it and the same stop.
     *
     * Deliberately *not* `resultAlreadyCounted`. That flag is cleared by any screen that is not a
     * result, so a save point read between two looks at one dialog re-arms it; `battlesStarted` only
     * moves when a room is entered, which is exactly when a new verdict becomes owed. The sentinel
     * matters too: a dialog left on screen by a previous session is met at `battlesStarted === 0`,
     * belongs to nobody's count, and must still be read before it is dismissed.
     */
    casualtyVerdictDecidedFor = NO_BATTLE_YET;
    /** Kept on the instance so an abort can report how far the run got. */
    summary = {
      battlesStarted: 0,
      battlesCompleted: 0,
      battlesWon: 0,
      battlesLost: 0,
      stoppedBecause: "not started"
    };
    /**
     * The roster strip's geometry, measured from the screen where possible.
     *
     * Only the healing swap needs it. Every other screen the runner acts on is located by
     * colour, which is why the rest of a run works on any device without a single number of its
     * own — and why a run may start on a config whose roster block has never been measured.
     */
    async geometryFor(screenshot) {
      const geometry = await this.rosterGeometry.forFrame(screenshot);
      if (!geometry) {
        throw await this.abort(
          "The roster strip could not be measured from the screen, and this config's roster geometry is not marked as calibrated. The healing swap needs one or the other; everything else in the run is located by colour and needs neither."
        );
      }
      return geometry;
    }
    // ---------------------------------------------------------------- retrying
    /**
     * Tries an operation until it produces a result, waiting between attempts.
     *
     * `undefined` means "not yet"; anything else is the answer. This is the only
     * place a delay is applied, so waiting behaviour is defined once instead of
     * being re-guessed at each call site.
     */
    async retry(operation, attempts = this.config.timing.retryAttempts) {
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const result = await operation();
        if (result !== void 0) return result;
        if (attempt < attempts) await this.session.wait(this.config.timing.retryDelayMs);
      }
      return void 0;
    }
    /** Screenshots and classifies the current screen, remembering the frame. */
    async look() {
      const screenshot = await this.session.screenshot();
      this.lastScreenshot = screenshot;
      return this.detector.detect(screenshot);
    }
    /** Retries until the screen is one the runner understands. */
    async lookUntilRecognised() {
      return this.retry(async () => {
        const detection = await this.look();
        return detection.state === "unknown" ? void 0 : detection;
      });
    }
    /**
     * Retries until the screen is no longer the one just acted on.
     *
     * Returns false if it never changed, which the caller treats as the click not
     * having landed — worth retrying, not worth escalating on its own.
     */
    async waitForScreenToLeave(state) {
      const changed = await this.retry(async () => {
        const detection = await this.look();
        return detection.state !== state ? true : void 0;
      });
      return changed === true;
    }
    // -------------------------------------------------------------------- loop
    async run() {
      const summary = this.summary;
      summary.stoppedBecause = "reached the configured battle limit";
      let stuckRounds = 0;
      let resultAlreadyCounted = false;
      while (true) {
        if (this.shouldStop()) {
          summary.stoppedBecause = "stop was requested";
          return summary;
        }
        const detection = await this.lookUntilRecognised();
        if (!detection) {
          throw await this.abort(
            "Screen stayed unrecognised across every retry. Either the game showed a popup the runner does not know about, or the window size changed and the search regions no longer line up."
          );
        }
        const { state, diagnostics, actionPoint } = detection;
        if (state !== "battleResult") resultAlreadyCounted = false;
        if (summary.battlesStarted >= this.config.limits.maxBattles && (state === "dungeonMap" || state === "battleChoice")) {
          return summary;
        }
        switch (state) {
          case "dungeonMap": {
            const gate = await this.settledGate(actionPoint);
            if (!gate) {
              continue;
            }
            this.log(`Opening the next room (gate at x=${gate.x.toFixed(3)}, y=${gate.y.toFixed(3)}).`);
            await this.click(gate);
            break;
          }
          case "savePoint": {
            const orb = this.requireActionPoint(actionPoint, "the Activate orb", diagnostics);
            this.log("Save point reached; activating.");
            await this.click(orb);
            await this.collectSavePointLoot();
            break;
          }
          case "battleChoice":
            this.log(
              `--- Battle ${summary.battlesStarted + 1} of ${this.config.limits.maxBattles} (${summary.battlesCompleted} resolved so far) ---`
            );
            await this.chooseBattle(detection);
            summary.battlesStarted += 1;
            break;
          case "teamSelect": {
            const autoBattle = this.requireActionPoint(actionPoint, "the Auto Battle button", diagnostics);
            await this.fieldTeamAndFight(autoBattle);
            break;
          }
          case "battleResult": {
            if (this.config.safety.captureBattleResults !== false) {
              const saved = await this.session.saveScreenshot("result", this.lastScreenshot);
              if (saved) this.log(`  battle result frame saved to ${saved}`);
            }
            const result = await this.stopIfATitanDied(detection);
            const ok = this.requireActionPoint(
              result.actionPoint,
              "the victory OK button",
              result.diagnostics
            );
            await this.click(ok);
            if (resultAlreadyCounted) {
              this.log("  the same result screen again; dismissing it without counting it twice.");
            } else {
              resultAlreadyCounted = true;
              summary.battlesCompleted += 1;
              if (result.battleWon === true) summary.battlesWon += 1;
              else if (result.battleWon === false) summary.battlesLost += 1;
              const outcome = result.battleWon === void 0 ? "resolved, outcome unreadable" : result.battleWon ? "WON" : "LOST";
              this.log(
                `Battle ${outcome}. ${summary.battlesCompleted} of ${this.config.limits.maxBattles} resolved (${summary.battlesWon} won, ${summary.battlesLost} lost).`
              );
              if (result.battleWon === void 0) {
                this.log(`  neither signal could be trusted: ${result.diagnostics}`);
              }
            }
            break;
          }
          case "noFieldableTeam":
            summary.stoppedBecause = `no titan left that can fight \u2014 the day's attempts are spent (${diagnostics})`;
            this.log(
              `Stopping: every action button on team select is dimmed, so nothing can be fielded. ${summary.battlesCompleted} battles fought.`
            );
            return summary;
          default:
            throw await this.abort(`Unhandled screen ${state} (${diagnostics}).`);
        }
        if (await this.waitForScreenToLeave(state)) {
          stuckRounds = 0;
          continue;
        }
        stuckRounds += 1;
        this.log(`  screen still showing ${state} after acting; retrying (${stuckRounds}/${MAX_STUCK_ROUNDS}).`);
        if (stuckRounds >= MAX_STUCK_ROUNDS) {
          throw await this.abort(
            `Clicked ${state} ${MAX_STUCK_ROUNDS} times with no change. The click is probably landing in the wrong place.`
          );
        }
      }
      return summary;
    }
    // ------------------------------------------------------------------ screens
    /**
     * Reads every offered panel and attacks the best one.
     *
     * Each panel's emblem is located relative to its own Attack button rather than
     * from a fixed coordinate, so the one-panel (centred) and two-panel layouts
     * are handled by the same code with no special case.
     */
    async chooseBattle(detection) {
      const screenshot = this.lastScreenshot;
      if (!screenshot) {
        throw await this.abort("No frame was kept from the screen that was classified.");
      }
      const attackButtons = detection.actionButtons.filter((blob) => blob.center.y > 0.7 && blob.center.x < PANEL_AREA_RIGHT_EDGE).sort((a, b) => a.center.x - b.center.x);
      if (attackButtons.length === 0) {
        throw await this.abort("On the battle-choice screen but no Attack button could be located.");
      }
      const options = [];
      for (const [index2, button2] of attackButtons.entries()) {
        const side = attackButtons.length === 1 ? "single" : index2 === 0 ? "left" : "right";
        const reading = await readBattleOption(
          screenshot,
          side,
          emblemBoxAboveAttackButton(button2.center)
        );
        this.log(`  ${side}: ${reading.element} (confidence ${reading.confidence.toFixed(2)}, ${reading.diagnostics})`);
        options.push(reading);
      }
      let chosen;
      try {
        chosen = this.optionSelector.select(options);
      } catch (error) {
        throw await this.abort(error instanceof Error ? error.message : String(error));
      }
      this.lastChosenElement = chosen.element;
      this.log(`Choosing ${chosen.element} (${chosen.side}).`);
      const index = chosen.side === "right" ? attackButtons.length - 1 : 0;
      await this.click(attackButtons[index].center);
    }
    async fieldTeamAndFight(autoBattle) {
      await this.logTeamHealth();
      const swapped = this.lastChosenElement === "mix";
      const fieldedOnArrival = swapped ? void 0 : await this.countFieldedCardsOn(this.lastScreenshot);
      if (swapped) {
        await this.placeHealingTitan();
      }
      await this.refuseUnderstrengthTeam(fieldedOnArrival);
      this.log("Starting auto battle.");
      await this.click(autoBattle);
      await this.waitForBattleToFinish();
    }
    /**
     * Stops the run rather than fighting with an incomplete team.
     *
     * An understrength team does not merely lose the battle it is sent into. The
     * titans that survive it are damaged or dead for the rest of the day, so the
     * next fight is entered weaker still - one run fought with three titans, lost
     * them all, and the remaining titans then died in the following battle, which
     * spent a day's attempts on two losses. A stopped run costs a restart; this
     * costs the day.
     *
     * @param fieldedOnArrival the tick count off the frame the loop arrived with, when nothing has
     *   moved the team since. Undefined means there is nothing to compare against, not that nothing
     *   was fielded.
     */
    async refuseUnderstrengthTeam(fieldedOnArrival) {
      const { centers } = this.config.coordinates.teamSelect.emptySlots;
      const { requiredTitans, allowIncompleteTeam } = this.config.strategy.team;
      const settle = await this.settledTeamStrength(requiredTitans, fieldedOnArrival);
      const { fielded, empty } = settle.settled;
      const report = settle.report();
      if (report) this.log(report);
      if (fielded !== void 0 && fielded >= requiredTitans) {
        this.log(`  ${fielded} titans are ticked in the roster; the team is full.`);
      } else if (empty.length > 0) {
        if (!allowIncompleteTeam) {
          throw await this.decline(
            `The team is short of ${requiredTitans}: ${describeEmptySlots(empty, centers.length)}, and ${describeTickCount(fielded, requiredTitans)}, after ${UNDERSTRENGTH_CONFIRMATIONS} readings ${UNDERSTRENGTH_SETTLE_MS}ms apart (the marker count is a majority across ${EMPTY_SLOT_CONFIRMATIONS} frames taken back to back, the first of them being the frame kept below - the one the ticks were counted on). Fielding an understrength team loses the battle and the titans with it, so nothing was clicked. ` + await this.remedyForAShortTeam(settle.settled.frame, requiredTitans)
          );
        }
        this.log(
          `  ${empty.length} team slot(s) are empty, short of ${requiredTitans}, but incomplete teams are allowed; going in anyway.`
        );
      }
      await this.keepUnsettledTeamFrame(settle);
    }
    /**
     * What to do about a short team, which depends on whether a titan is dead rather than absent.
     *
     * The phone's `DungeonRunner.remedyForAShortTeam` in TypeScript, and it carries the whole of that
     * function's reasoning because the two messages describe one event to one person. §3.6: a bundle
     * from a phone and one from a browser that describe the same event differently is the divergence
     * the house rule exists to prevent. This one used to end "Fill the team and run again, or set
     * strategy.team.allowIncompleteTeam if that is what you meant", which is the same advice the phone
     * gave, and after a death it is advice to do something the game will not permit until the titan is
     * revived. That sentence is why a user filed a bug report about a rule that was working perfectly.
     *
     * The game drops a dead titan from the team and puts nobody in its place, but leaves its card on
     * the strip with an empty health bar and the word DEAD across it. So the strip is asked directly,
     * over every card it draws rather than only the fielded ones.
     *
     * ## Naming the death is not the same as knowing the day is over
     *
     * The count of living cards is in the message because leaving it out was nearly the second version
     * of the same bug. Replaying this reading over the 89 team selects in two phone bundles: 21 frames
     * carry a card with no health bar, six of them are refusals, and all six draw six cards of which
     * **five still have health** while four are ticked. Saying the day was over would have sent a
     * player away from a run that was one click from continuing.
     *
     * A living count that reaches `requiredTitans` is sound on any floor, because a scrolling strip can
     * only hide titans and never invent them. The opposite claim is not, which is why the shortfall
     * branch asks whether this floor draws every titan that could be fielded first.
     *
     * ## Why the geometry is measured here and not taken from {@link rosterGeometry}
     *
     * `visibleCardCount` means two different things in the two sources: derived, it is how many cards
     * this screen *draws*; configured, it is how many the strip can hold. This message counts cards, so
     * only the first answers its question — and on this client the difference is not academic.
     * {@link RosterGeometrySource.forFrame} prefers the calibrated config and caches it, so an
     * element-restricted floor drawing six cards would be read through a ten-card geometry, and the
     * four health-bar boxes past the end of the strip find no green and report four titans dead that do
     * not exist. Measured on bundle A's battle 27, that is exactly what happens: cards 6, 7, 8 and 9
     * are named as casualties on a six-card strip.
     *
     * The sentence itself is {@link shortTeamRemedy}'s, and the split is not tidiness. No capture in
     * this client's corpus can reach the death branch end to end: the only team select with a dead card
     * on it is `..._live_teamSelect_deadMoloch.png`, and sweeping the shipped marker reading over every
     * centre of that whole frame at 0.01 intervals finds nowhere at all that scores as a chevron - which
     * is precisely why the settle pair uses it as its *no marker* half. So a run cannot be made to
     * refuse on the one frame that has a death on it, and the wording would otherwise ship with nothing
     * exercising it. Measuring here and composing there lets the three sentences be pinned directly.
     * The phone has no such gap; its `TeamSettleTest` reaches the branch with a real fixture.
     *
     * @param frame the frame the settled tick count was read from - the same frame {@link endRun} is
     *   about to file as `declined_`, so the card numbers here and the picture agree.
     */
    async remedyForAShortTeam(frame, requiredTitans) {
      if (!frame) return shortTeamRemedy(void 0, requiredTitans, false);
      const geometry = (await deriveRosterGeometry(frame)).geometry;
      if (!geometry) return shortTeamRemedy(void 0, requiredTitans, false);
      const cards = geometry.visibleCardCount;
      const dead = [];
      for (let index = 0; index < cards; index += 1) {
        const health = await readHealthFraction(frame, healthBarBoxForCard(index, geometry));
        if (health <= DEAD_HEALTH_THRESHOLD) dead.push(index);
      }
      const stripShowsEveryone = this.lastChosenElement !== void 0 && this.lastChosenElement !== "mix";
      return shortTeamRemedy({ cards, dead }, requiredTitans, stripShowsEveryone);
    }
    /**
     * Reads the team's strength until it stops changing, and hands back what it settled on.
     *
     * Stops the moment a reading comes back full, because the game fills slots and never empties them:
     * full is where assembly ends, so a full reading is settled by construction and cannot become less
     * full without this run clicking something. That keeps the whole cost off the four battles in five
     * that read full on the first look. {@link UNDERSTRENGTH_CONFIRMATIONS} carries the measurement.
     *
     * Every other answer is looked at again, including a short count with no marker beside it. That
     * used to return immediately, and it was the one remaining place a single frame decided to fight:
     * a chevron occluded by an arriving titan reads as no chevron, and this method exists precisely
     * because a frame taken during assembly cannot be believed. It costs the waits on a mixed floor,
     * where a scrolling strip reports the same lower bound every time and nothing is ever going to
     * change its mind - about 2.1s on the roughly one battle in five that is not full on arrival.
     *
     * A look that produces no frame does not end the settle. It costs a wait like any other look, so
     * a single failed capture cannot skip the guard.
     *
     * {@link shouldStop} is deliberately not consulted, where the phone's twin does consult its own
     * flag. Cutting the settle short leaves a half-settled reading to be acted on, and acting on one
     * can refuse a team for being short when all that happened is that somebody pressed Stop - a false
     * alarm about the one rule this repository already sends people chasing imaginary bugs over. This
     * client honours a stop between loop iterations and nowhere else, the whole settle is 2.1s, and
     * the battle wait after it is far longer.
     */
    async settledTeamStrength(requiredTitans, fieldedOnArrival) {
      const { centers } = this.config.coordinates.teamSelect.emptySlots;
      const first = await this.lookAtTheTeam(requiredTitans);
      const later = [];
      for (let attempt = 1; attempt < UNDERSTRENGTH_CONFIRMATIONS; attempt += 1) {
        const previous = later.at(-1) ?? first;
        if (previous.fielded !== void 0 && previous.fielded >= requiredTitans) break;
        this.log(
          `  the team reads short (${describeTickCount(previous.fielded, requiredTitans)}, ${describeEmptySlots(previous.empty, centers.length)}); the screen may still be assembling, so waiting ${UNDERSTRENGTH_SETTLE_MS}ms and looking again (${attempt} of ${UNDERSTRENGTH_CONFIRMATIONS - 1}).`
        );
        await this.session.wait(UNDERSTRENGTH_SETTLE_MS);
        later.push(await this.lookAtTheTeam(requiredTitans));
      }
      return new TeamSettle(first, later, fieldedOnArrival);
    }
    /**
     * One reading of the team: the ticks first, and the markers only if the ticks fall short.
     *
     * Count the in-team ticks first, because a tick proves something the arena markers only suggest.
     * A card that has scrolled out of the strip takes its tick with it, so this can undercount - but
     * nothing gives an unfielded card a tick, so it can never overcount. That makes "enough ticks" a
     * proof the team is full, and the marker check is only needed when it falls short.
     *
     * Which matters because the marker check keeps being wrong in the expensive direction for a
     * player: it has stopped full teams on an earth floor, on a mixed one, and at three different
     * slots, every time because titan armour is gold and the arena is full of it. The ticks are not
     * close - measured on a full team, fielded cards score 0.190-0.198 and the rest score 0.000.
     *
     * So a full tick count short-circuits before the markers are consulted, exactly as the phone's
     * reading does, and a look that reads full carries no marker count at all rather than a stale one.
     */
    async lookAtTheTeam(requiredTitans) {
      let frame;
      try {
        frame = await this.session.screenshot();
        this.lastScreenshot = frame;
      } catch {
        return { fielded: void 0, empty: [], frame: void 0 };
      }
      const fielded = await this.countFieldedCardsOn(frame);
      if (fielded !== void 0 && fielded >= requiredTitans) return { fielded, empty: [], frame };
      return { fielded, empty: await this.emptySlotsAgreedAcrossFrames(frame), frame };
    }
    /**
     * How many roster cards carry the in-team tick on a given frame, or undefined if the strip
     * could not be read at all.
     *
     * The two are worth telling apart even though both fall through to the marker
     * check, because they say different things about a run that stopped here: a
     * count means the strip was read and the ticks were not there, while undefined
     * means the strip itself was not on screen yet - which is what a half-drawn
     * team-select screen looks like.
     *
     * Takes the frame rather than capturing one, so the same count can be made on the frame the loop
     * arrived with and on a fresh one and the two compared. A capture of its own would have made them
     * two readings of two screens, which is not a comparison of anything.
     */
    async countFieldedCardsOn(screenshot) {
      if (!screenshot) return void 0;
      try {
        const geometry = await this.rosterGeometry.forFrame(screenshot);
        if (!geometry) return void 0;
        let fielded = 0;
        for (let index = 0; index < geometry.visibleCardCount; index += 1) {
          if (await isCardFielded(screenshot, index, geometry)) fielded += 1;
        }
        return fielded;
      } catch {
        return void 0;
      }
    }
    /**
     * Writes down the health of every titan about to fight.
     *
     * This client logged **nothing** about health outside the healing swap, and the swap runs only on
     * a mixed floor and reads only its two candidates - so a browser run's log carried no health
     * record at all on an element-restricted floor, which is most of them. A titan wearing down was
     * invisible until the battle it died in. The state behind the v0.5 request is the case: on the
     * phone a titan entered a room at 24% health, read and logged, with no rule at any level; here
     * that fact would simply not have existed.
     *
     * Reading only. Nothing decides anything on these numbers, which is why it is allowed to give up
     * quietly - no frame, no readable strip, nothing fielded, or a reading that threw is a missing log
     * line and never a reason to interrupt a run. No capture either: it reads {@link lastScreenshot},
     * the frame the detector has just classified.
     *
     * ## Why it arrives now and not with the phone's
     *
     * `healthBar.halfWidth` in `config/chrome.json` was 0.0256 - a 92px box around a 75px bar - so
     * every health reading this client made under-read by about 18 points and a titan at full health
     * reported 80-82%. Shipped then, this line would have printed numbers that quietly contradicted
     * the healing decision logged beside it, which reads through the same configured box. The number
     * is true now, so the line is worth having.
     *
     * ## Only the fielded cards, and the dead card that is therefore missing
     *
     * `team:` has to go on meaning the titans about to fight. But the game **drops a dead titan from
     * the team** and puts nobody in its place, so the one card worth naming is exactly the one a
     * fielded-only list skips - which made the phone's `DEAD` branch very nearly unreachable in a
     * dungeon until it was found. So the strip's own cards are scanned and a dead one is named beside
     * the team rather than inside it.
     *
     * ## Two sources, and which supplies what
     *
     * Positions and ticks come from {@link RosterGeometrySource}, the same geometry every other
     * reading in this client uses. That is not interchangeable with a measured one here: the in-team
     * tick is confirmed against `selectedTickShape`, and **a tick template is a crop**, so it only
     * matches through the geometry it was cut with. Measured on
     * `2026-08-07T18-39-51-944Z_calibrate_teamSelect.png`, the configured geometry finds three ticks
     * and a derived one finds none - the same trap that broke two runs on portraits.
     *
     * The **card count** comes from the frame, and only that. Configured, `visibleCardCount` is how
     * many cards the strip can *hold*; derived, it is how many this screen *draws*, and the benched
     * clause needs the second because it is backed by an absence: a health-bar box past the end of the
     * strip finds no green whatever happened there. Read through the configured count, one bundle's
     * six-card strip reports `cards 6, 7, 8 and 9 are DEAD` - measured, not hypothesised. So when the
     * derivation refuses, the claim is dropped and the line says which refusal it was; it is never
     * replaced by a fallback that lets a card index outrun the strip.
     *
     * The two are not free to disagree quietly: `RosterGeometrySource` already reports any drift
     * between the measured layout and the configured one when the run starts.
     *
     * ## It deliberately does not seed the settle
     *
     * The phone's twin returns its fielded count and that count becomes `TeamSettle`'s
     * arrival-vs-settled comparison. Here it returns nothing, and {@link fieldTeamAndFight} goes on
     * taking its own count through {@link countFieldedCardsOn}. The reason is the refusal above: this
     * line is bounded by a derivation that genuinely refuses - a screen still assembling is precisely
     * when it refuses - so a seed sourced from here would go undefined on exactly the frames the
     * settle detector exists to notice, and the settle would lose its arrival comparison to make room
     * for a log line. The phone has no such choice to make, because its geometry source falls back
     * instead of refusing and its count is therefore always there.
     *
     * Nor is it cross-checked against that count. Both would be `isCardFielded` over one frame through
     * one geometry, which is one signal read twice; §3.4 wants two signals that can fail differently,
     * and comparing a measurement with itself asserts nothing.
     */
    async logTeamHealth() {
      const frame = this.lastScreenshot;
      if (!frame) return;
      try {
        const geometry = await this.rosterGeometry.forFrame(frame);
        if (!geometry) return;
        const measured = await deriveRosterGeometry(frame);
        const cards = measured.geometry?.visibleCardCount ?? geometry.visibleCardCount;
        const fielded = [];
        const benchedDead = [];
        for (let index = 0; index < cards; index += 1) {
          const health = await readHealthFraction(frame, healthBarBoxForCard(index, geometry));
          if (await this.isCardSelected(frame, index, geometry)) fielded.push({ index, health });
          else if (health <= DEAD_HEALTH_THRESHOLD) benchedDead.push(index);
        }
        if (fielded.length === 0) return;
        this.log(
          teamHealthLine(
            fielded,
            measured.geometry ? { measured: true, dead: benchedDead } : { measured: false, why: stripRefusalFrom(measured.diagnostics) }
          )
        );
      } catch {
      }
    }
    /**
     * Keeps the team select a fight was started on, when the reading behind it was not clean.
     *
     * A frame the settle actually read, never a fresh capture - §3.2, and the reason this is worth
     * keeping at all: by the time a second photograph could be taken the screen has finished
     * assembling, and a picture of a settled team says nothing about a decision made on an unsettled
     * one. Which of the looks is worth the megabytes is {@link TeamSettle.frameWorthKeeping}'s to
     * decide.
     *
     * Only for a battle that is about to be fought; a refusal's frame is kept by {@link endRun} under
     * the `declined_` label instead. See {@link MAX_UNSETTLED_TEAM_FRAMES} for the two conditions and
     * where the number came from.
     *
     * Silent when the cap is spent or the host has no filesystem: the in-page host saves nothing, and
     * a run there should not claim to have kept a frame it did not.
     */
    async keepUnsettledTeamFrame(settle) {
      if (!settle.screenWasMoving && !settle.sawAnEmptySlot) return;
      if (this.unsettledTeamFramesKept >= MAX_UNSETTLED_TEAM_FRAMES) return;
      const frame = settle.frameWorthKeeping;
      if (!frame) return;
      this.unsettledTeamFramesKept += 1;
      const path = await this.session.saveScreenshot(
        unsettledTeamFrameLabel(this.summary.battlesStarted),
        frame
      );
      if (path === void 0) return;
      const why = settle.screenWasMoving ? "the team was still being assembled when it was read" : "it was fought on a reading that saw an empty slot";
      this.log(`  kept the team select this fight was started on at ${path}, because ${why}.`);
    }
    /**
     * The slots that read as empty on most of several frames, rather than on one.
     *
     * A marker is static UI and reads the same on every frame. The artwork around
     * it is not: a run stopped on a mixed floor insisting a slot was empty while
     * five titans stood on the field, and the slot in question was the one Moloch
     * occupies - lantern first, flames animating. A flame is gold, and on some
     * frames it happened to be marker-sized, marker-shaped, and to cover the slot
     * by as much as a marker does. Re-measuring the very same screen a minute
     * later found nothing there at all.
     *
     * So the reading is voted on. A flicker carries one frame out of three; a
     * marker carries all three. Majority rather than unanimity, because both kinds
     * of mistake are on the table: demanding unanimity would let one bad frame
     * hide a genuinely empty slot, and that is the expensive direction.
     *
     * The first ballot is the frame the caller already has - the one the ticks were counted on -
     * rather than a fresh capture of the same screen. A look that flags a slot therefore costs three
     * captures instead of four, and one that flags nothing costs the tick frame alone instead of two.
     * It also makes the kept frame genuinely one of the frames voted on, which is what the evidence
     * chain wanted all along.
     *
     * That is not a shortcut past the animation this vote exists to catch. What has to differ between
     * ballots is the moment they were taken, and reusing the frame in hand widens the first interval
     * rather than narrowing it: the tick count runs between that capture and this one, so ballot one
     * now sits a whole roster reading further from ballot two than the discarded capture did.
     * Measured on this machine at the browser's 1800x875, that reading is 1-7ms of work on top of an
     * interval a capture already dominates. Every later interval is untouched.
     *
     * ## The extra frames do not become {@link lastScreenshot}, and that is the fix to a real bug
     *
     * They used to, one after another, and the last ballot was therefore the frame {@link endRun}
     * filed as `declined_….png` when this rule stopped a run. So a triager opened the kept frame
     * beside a message quoting a tick count read from a *different* capture and a marker count that is
     * a majority across three more, and nothing anywhere said so. The saved frame matched neither half
     * of the sentence it was filed as evidence for, and the mismatch is invisible: every one of these
     * frames is the same team select a few hundred milliseconds apart, so the frame looks like it
     * corresponds and usually nearly does.
     *
     * {@link TeamLook} had already settled which frame is the one worth keeping and why - the tick
     * frame, because the marker half has no single frame to name - and this path was the one place
     * that ruling was not honoured. A ballot in a vote is not a frame any decision is attributed to,
     * so it does not get to claim the name; the one exception is the frame that already holds it on
     * the ticks' account.
     *
     * @param inHand the frame the ticks were counted on, cast as the first ballot.
     */
    async emptySlotsAgreedAcrossFrames(inHand) {
      const { centers, marker } = this.config.coordinates.teamSelect.emptySlots;
      const readSlots = (frame) => findEmptyTeamSlots(frame, centers, marker);
      const first = await readSlots(inHand);
      if (first.length === 0) return [];
      const votes = /* @__PURE__ */ new Map();
      const tally = (slots) => {
        for (const slot of slots) votes.set(slot, (votes.get(slot) ?? 0) + 1);
      };
      tally(first);
      for (let round = 1; round < EMPTY_SLOT_CONFIRMATIONS; round += 1) {
        tally(await readSlots(await this.session.screenshot()));
      }
      const majority = Math.ceil(EMPTY_SLOT_CONFIRMATIONS / 2);
      const agreed = [];
      const flickered = [];
      for (const [slot, count] of [...votes.entries()].sort((a, b) => a[0] - b[0])) {
        if (count >= majority) agreed.push(slot);
        else flickered.push(`slot ${slot}: ${count}/${EMPTY_SLOT_CONFIRMATIONS}`);
      }
      if (flickered.length > 0) {
        this.log(
          `  ignoring ${flickered.length} slot(s) that only looked empty on some frames (${flickered.join(", ")}); animated artwork reads differently frame to frame, a marker does not.`
        );
      }
      return agreed;
    }
    /**
     * Puts the candidate that needs healing into the rotating team slot.
     *
     * A full team cannot be swapped with one click: the outgoing titan has to be
     * deselected first, and only then can the incoming one be added. Clicking the
     * incoming titan against a full team does nothing at all.
     *
     * ## One slot, and it returns nothing - both deliberate, and the phone's twin does neither
     *
     * It fills **one** slot rather than going on until the team is five. §3.7 gives the bot exactly
     * one slot to exchange and forbids it the other four, so a second placement would be the bot
     * picking a team - and there is no rule that could decide it, because `HealingPolicy.candidates`
     * is an order of preference for one slot rather than a pool to draw a team from.
     *
     * It returns nothing, where the phone's twin now returns what it read on its way past. That is not
     * drift: {@link fieldTeamAndFight} sets out why this client's post-swap reading cannot lose the
     * evidence the phone's lost, so there is nothing for a pre-swap reading to rescue. Taking one
     * anyway would cost a capture and a roster scan on every mixed floor to answer a question the
     * check after the swap has already answered.
     */
    async placeHealingTitan() {
      if (this.config.strategy.healing.candidates.length === 0) {
        this.log("  Healing swap is off: no candidates are configured. Leaving the team as it is.");
        return;
      }
      const screenshot = await this.session.screenshot();
      this.lastScreenshot = screenshot;
      const geometry = await this.geometryFor(screenshot);
      const candidates = await this.readCandidateStatuses(screenshot, geometry);
      const choice = this.healingSlot.select(candidates);
      if (!choice) {
        this.log("Every healing candidate is dead; leaving the team as the game arranged it.");
        return;
      }
      const { titan, reason } = choice;
      this.log(`Healing slot: ${titan} (${reason}).`);
      const incomingIndex = candidates.find((one) => one.name === titan).rosterIndex;
      if (await this.isCardSelected(screenshot, incomingIndex, geometry)) {
        this.log(`${titan} is already in the team; leaving the roster alone.`);
        return;
      }
      let outgoing;
      for (const one of candidates) {
        if (one.name === titan) continue;
        if (await this.isCardSelected(screenshot, one.rosterIndex, geometry)) {
          outgoing = one;
          break;
        }
      }
      const outgoingIndex = outgoing?.rosterIndex;
      if (outgoing && outgoingIndex !== void 0) {
        this.log(`Freeing the healing slot held by ${outgoing.name} (card ${outgoingIndex}).`);
        await this.clickRosterCard(outgoingIndex, geometry);
        const removed = await this.retry(async () => {
          const shot = await this.session.screenshot();
          return await this.isCardSelected(shot, outgoingIndex, geometry) ? void 0 : true;
        });
        if (!removed) {
          throw await this.abort(
            `Clicked ${outgoing.name}'s card ${outgoingIndex} to free the healing slot, but they are still in the team.`
          );
        }
      }
      this.log(`Adding ${titan} to the team.`);
      await this.clickRosterCard(incomingIndex, geometry);
      const added = await this.retry(async () => {
        const shot = await this.session.screenshot();
        return await this.isCardSelected(shot, incomingIndex, geometry) ? true : void 0;
      });
      if (!added) {
        throw await this.abort(
          `Clicked ${titan}'s roster card at index ${incomingIndex} but it did not become selected. ` + (outgoingIndex !== void 0 ? "The healing slot was freed first, so either the click missed or the roster shifted between reading it and clicking." : "No other candidate was in the team, so no slot was freed. Some titan outside the rotation holds the last place, and adding to a full team does nothing.")
        );
      }
    }
    /**
     * After activating a save point the game offers a loot dialog with one button.
     *
     * A missing dialog is not treated as fatal. The overwhelmingly likely cause is
     * that this save point was already spent — its orb lingers on screen for a
     * moment after collecting, long enough to be recognised and clicked a second
     * time. Clicking a spent save point does nothing, so the run can simply carry
     * on; a genuine loop is caught by the stuck-round counter instead.
     */
    async collectSavePointLoot() {
      const collect = await this.retry(async () => {
        const shot = await this.session.screenshot();
        const buttons = await findActionButtons(shot);
        return buttons.find((blob) => blob.center.y > 0.6);
      });
      if (!collect) {
        this.log("No Collect dialog appeared; treating this save point as already spent.");
        return;
      }
      this.log("Collecting save-point loot.");
      await this.click(collect.center);
      for (let extra = 0; extra < MAX_CHAINED_SAVE_POINT_DIALOGS; extra += 1) {
        const another = await this.retry(async () => {
          const shot = await this.session.screenshot();
          const buttons = await findActionButtons(shot);
          return buttons.find((blob) => blob.center.y > 0.6);
        });
        if (!another) break;
        this.log("Another save-point dialog; collecting that too.");
        await this.click(another.center);
      }
      const cleared = await this.retry(async () => {
        const { state } = await this.look();
        return state === "savePoint" ? void 0 : true;
      });
      if (!cleared) this.log("  save point still on screen after collecting; continuing anyway.");
    }
    /**
     * Waits for the battle to reach a screen the runner can act on.
     *
     * Given more attempts than other steps because a battle's length is set by the
     * game, not by us.
     */
    async waitForBattleToFinish() {
      const delay = this.config.timing.retryDelayMs;
      const attempts = delay > 0 ? Math.max(1, Math.round(this.config.timing.battleTimeoutMs / delay)) : BATTLE_ATTEMPTS_WITHOUT_DELAY;
      const finished = await this.retry(async () => {
        const { state } = await this.look();
        return state === "battleResult" || state === "dungeonMap" || state === "battleChoice" ? state : void 0;
      }, attempts);
      if (!finished) {
        throw await this.abort("Battle never reached a recognised end screen.");
      }
    }
    /**
     * Hands the game back, untouched, when the result dialog says a titan died.
     *
     * A death costs the day rather than the battle. A dead titan cannot be fielded again until it is
     * revived, so every fight after one is entered a titan short - which is the very cost
     * {@link refuseUnderstrengthTeam} exists to refuse, arriving by a different road. The difference
     * is that an understrength team can be seen on team select and refused before anything is spent,
     * while a death happens inside a battle this runner only ever sees the result of.
     *
     * What to do about it is not a decision this bot has any business making: reviving costs
     * resources, a rearranged team may well be worth fighting on with, and some days the right answer
     * is to keep the remaining attempts for tomorrow. So the run stops with nothing on the dialog
     * pressed - not OK, and not the Retry beside it - and the player arrives to the game exactly as
     * the battle left it.
     *
     * Off unless asked for, and when it is off this returns the detection it was given without taking
     * so much as another screenshot: a run that never wanted this behaves exactly as it did before,
     * whatever the casualty row happens to say.
     *
     * The four verdicts are branched over exhaustively rather than with an `else`, so a fifth answer
     * from the reading cannot arrive here and be quietly treated as "look again". `Casualties.kt`'s
     * enum gets that from the compiler; this side gets it from {@link assertEveryVerdictHandled}.
     *
     * **Only one of the two refusals is settled.** An unreadable row is transient - a dialog
     * photographed while it is still animating into place has its status row somewhere the reading
     * does not look, which is measured on a fifth of all battles - so it is looked at again up to
     * {@link CASUALTY_READ_ATTEMPTS} times.
     * A frame shape outside the one the lattice was measured on is not transient at all; it belongs to
     * the screen, so settling would spend {@link CASUALTY_SETTLE_MS} twice per battle to reach the same
     * answer and then stop with a message saying the row "could not be read", which is true and sends
     * whoever reads it looking for a rendering fault that does not exist. That one stops on the first
     * dialog, and says what it actually found.
     *
     * **Once per battle, and that bound lives here rather than at the call site.** The loop meets one
     * battle's result dialog more than once as a matter of routine — the click is ignored while the
     * dialog animates, and the next read finds it again — and the duplicate is only recognised further
     * down, after the click, where the *tally* is decided. So a battle that already had a verdict was
     * getting a second one taken off a dialog the game was busy animating away: a reading with nothing
     * to gain and a run to lose. Keeping the scope here is what stops the caller having to know that a
     * casualty verdict is a fact about a battle — it hands over a detection and gets back the detection
     * to act on, exactly as before. {@link casualtyVerdictDecidedFor} has the run that proved it.
     *
     * @returns the reading the caller should act on, which is a later one than it passed in whenever
     *   the first was unreadable and a re-read settled it.
     */
    async stopIfATitanDied(detection) {
      if (this.config.safety.stopWhenTitanDies !== true) return detection;
      if (this.casualtyVerdictDecidedFor === this.summary.battlesStarted) return detection;
      let current = detection;
      let firstUnreadableDialog;
      const keptDialogs = [];
      for (let attempt = 1; attempt <= CASUALTY_READ_ATTEMPTS; attempt += 1) {
        const casualties = current.battleCasualties;
        if (casualties) {
          switch (casualties.verdict) {
            case "noneDead":
              this.casualtyVerdictDecidedFor = this.summary.battlesStarted;
              this.log(
                `  all ${casualties.fielded} titans that fought came out alive; collecting the result.`
              );
              return current;
            // The one branch here that is a decision rather than a difficulty. The row was read, both
            // signals agreed, the rule fired as designed and the dialog was left alone - so it is
            // declined, not aborted. The first time this fired on a live account it announced itself
            // as `RUN ABORTED.` with an `abort_` frame beside it, and the owner read a working feature
            // as a crash.
            case "someDead":
              throw await this.decline(
                `A titan died in that battle: of the ${casualties.fielded} that fought, ${casualties.dead} came out dead and ${casualties.alive} alive (${casualties.diagnostics}). Nothing on the dialog was clicked - not OK, and not the Retry beside it - so the game is exactly as the battle left it and whether to revive, retry or stop for the day is yours to decide. A dead titan cannot be fielded again until it is revived, so carrying on would enter every remaining battle a titan short. Turn safety.stopWhenTitanDies off - in the page it is the "Stop running when a titan dies" switch - if you would rather it collected the result and fought on.`
              );
            // No settle, and no second look. Waiting is right for a dialog still animating into place
            // and wrong here: this frame's shape belongs to the window, not to the moment, so three
            // readings 700ms apart - two waits, 1.4 seconds - would be spent on every battle to
            // rediscover the same fact and then stop saying the row "could not be read", which is true
            // and sends whoever reads it hunting for a rendering fault that is not there. The figure
            // used to be written here as 2.1 seconds, which counted a wait after the last reading that
            // the loop does not take.
            //
            // Aborted and not declined, which is the closest call of the four. Nothing is wrong with
            // the *game* here, but the reading cannot be done at all on this screen and the message
            // asks for the one capture that would fix that - a fault in the reading layer, with a
            // named owner and a next step, which is exactly what an abort is for.
            case "unsupportedFrameShape":
              throw await this.abort(
                `This screen is a shape the casualty reading has never been measured on, so the result was refused rather than guessed at: ${casualties.diagnostics}. The team lattice is placed from the height of the game's own picture, and ${MAX_FRAME_ASPECT} is the ceiling on shapes that reading has been measured on - the widest real capture here is 2.2222 - so past it nothing has measured where the cards are drawn, and the reading refuses rather than answer "nobody died" about a battle that may have killed a titan. Looking again cannot help - a shape belongs to the screen and not to the moment, so every dialog this run meets will be the same - which is why nothing was clicked, nothing was waited out, and the dialog is still on screen. What would fix it is a result-dialog capture from a screen this shape: the gate is there because no such frame exists in either corpus, not because the dialog is unreadable in principle, so send one in and the reading can be measured on it. Until then, either give the game a screen nearer 2:1 - this run is reading ${this.session.describe()} - or turn safety.stopWhenTitanDies off to have results collected unread.`
              );
            // The one verdict a second look can genuinely change, which is why it is the only one that
            // falls through to the settle below.
            //
            // The frame is remembered on the way past, because by the time the refusal below is
            // reached {@link lastScreenshot} has moved on to whatever the last look found — and on
            // the Android run that prompted this, that was a save point.
            case "unreadable":
              firstUnreadableDialog ??= this.lastScreenshot;
              break;
            default:
              assertEveryVerdictHandled(casualties.verdict);
          }
        } else {
          firstUnreadableDialog ??= this.lastScreenshot;
        }
        if (attempt === CASUALTY_READ_ATTEMPTS) break;
        const keptPath = await this.keepUnsettledResultFrame(this.summary.battlesStarted, attempt);
        if (keptPath) keptDialogs.push(keptPath);
        const kept = keptPath ? ` Kept the frame it read at ${keptPath}.` : "";
        this.log(
          `  cannot yet tell whether a titan died (${describeCasualties(current)}); the dialog is probably still animating in, so waiting ${CASUALTY_SETTLE_MS}ms and looking again (${attempt} of ${CASUALTY_READ_ATTEMPTS - 1}).${kept}`
        );
        await this.session.wait(CASUALTY_SETTLE_MS);
        current = await this.look();
      }
      const alsoKept = keptDialogs.length === 0 ? "" : ` The later look(s) at the same dialog are at ${keptDialogs.join(", ")}, and may show a different screen if the game had moved on by then.`;
      throw await this.abort(
        `Could not tell whether a titan died: ${CASUALTY_READ_ATTEMPTS} readings ${CASUALTY_SETTLE_MS}ms apart all came back unreadable (${describeCasualties(current)}). Clicking OK would dismiss a result nobody has read, which is the one thing safety.stopWhenTitanDies is on to prevent, so nothing was clicked and the dialog is still on screen. The frame saved beside this message is the one the *first* of those readings was taken from: if it shows a team the status row is plainly legible under, the reading is at fault and the frame belongs in the fixtures.${alsoKept} Turn safety.stopWhenTitanDies off to have the run collect the result and carry on regardless.`,
        firstUnreadableDialog
      );
    }
    /**
     * Keeps the frame that fired a casualty settle, up to {@link MAX_UNSETTLED_RESULT_FRAMES} a run.
     *
     * Under a label of its own, deliberately. `safety.captureBattleResults` already writes the first
     * frame of every result dialog, but it writes all of them as `result`, so the one transient in a
     * run of twenty-five is not findable among the other twenty-four; and it is an option, so on a run
     * with it off nothing keeps the transient at all. These frames answer a different question from
     * that feature's - what the reading saw when it could not decide, or decided wrongly - and a
     * question deserves its own filename.
     *
     * {@link lastScreenshot} - the frame the reading was actually taken from - and never a fresh
     * capture, per §3.2. The settle resolves in under a second, measured on this very screen, so by
     * the time a second photograph could be taken the dialog has settled and a picture of the screen
     * after the problem is not a picture of the problem.
     *
     * The name comes from {@link unsettledResultFrameLabel} rather than from a template literal here,
     * because a word that leaves this repository in a diagnostics zip is agreed in one place. Written
     * at this call site it drifted from the phone's name for the same event, and the doc on that
     * function is the ruling that settled which one survives.
     *
     * Returns where the frame landed, and undefined when nothing was written: the cap is spent, no
     * screenshot has arrived, or the host has no filesystem — the in-page host saves nothing, and a
     * settle there should still say it waited.
     *
     * **The caller builds the sentence, not this function.** It used to hand back the finished words
     * so the wait and the frame it kept would read as one event, and they still do — but a refusal
     * that names the frames it did not attach needs the paths themselves, and a sentence is not a
     * path. The wording moved up a level unchanged.
     *
     * @param battleNumber the battle whose dialog this is, so a triager can pair it with the run log.
     * @param look which reading of that dialog it was, because one battle can settle twice and the
     *   pair is worth more than either frame alone - it is the same dialog 700ms apart.
     */
    async keepUnsettledResultFrame(battleNumber, look) {
      if (this.unsettledResultFramesKept >= MAX_UNSETTLED_RESULT_FRAMES) return void 0;
      const frame = this.lastScreenshot;
      if (!frame) return void 0;
      this.unsettledResultFramesKept += 1;
      return this.session.saveScreenshot(unsettledResultFrameLabel(battleNumber, look), frame);
    }
    // ------------------------------------------------------------------ reading
    /**
     * Finds both tanks by portrait and reads their health.
     *
     * Positions are resolved per screen rather than pinned in config: the roster
     * re-sorts as titans level up, and a stale index means reading one titan's
     * health and clicking a different one's card.
     */
    async readCandidateStatuses(screenshot, geometry) {
      const templates = await this.candidateTemplates();
      const matches = await locateTitans(screenshot, geometry, templates);
      const statuses = [];
      for (const [name, match] of matches) {
        const margin = match.runnerUpDistance - match.distance;
        const tooFar = match.distance > this.config.strategy.healing.maxPortraitDistance;
        const ambiguous = margin < this.config.strategy.healing.minPortraitMargin;
        if (tooFar || ambiguous) {
          throw await this.abort(
            `Could not confidently find ${name} in the roster. Closest card was index ${match.index} at distance ${match.distance.toFixed(3)}, with the next best at ${match.runnerUpDistance.toFixed(3)} (margin ${margin.toFixed(3)}). ` + (ambiguous ? "No card stands out, which is what it looks like when the titan is not in this roster at all." : "Nothing matched closely enough; the artwork may have changed and the template may need regenerating.")
          );
        }
        const health = await readHealthFraction(
          screenshot,
          healthBarBoxForCard(match.index, geometry)
        );
        const isDead = health <= DEAD_HEALTH_THRESHOLD;
        this.log(
          `${name}: card ${match.index} (match ${match.distance.toFixed(3)}), ` + (isDead ? "DEAD" : `health ${(health * 100).toFixed(0)}%`)
        );
        statuses.push({ name, health, rosterIndex: match.index, isDead });
      }
      return statuses;
    }
    /**
     * Portrait templates for the titans the healing slot may choose between, loaded once.
     *
     * Filtered by the candidate list rather than taken whole, because the two are allowed to differ: a
     * config can name a portrait for every titan on the account and still rotate only two of them.
     * Locating a titan that is not a candidate would abort a mixed floor for failing to find somebody
     * the run was never going to field.
     */
    async candidateTemplates() {
      if (this.templates) return this.templates;
      const loaded = /* @__PURE__ */ new Map();
      for (const name of this.config.strategy.healing.candidates) {
        const signature = await this.portraits.signatureFor(name);
        if (signature) loaded.set(name, signature);
      }
      this.templates = loaded;
      return loaded;
    }
    /** Whether a card carries the in-team tick. The reading itself lives in the vision layer. */
    async isCardSelected(screenshot, index, geometry) {
      return isCardFielded(screenshot, index, geometry);
    }
    /**
     * Clicks, and writes down where.
     *
     * A log of decisions without actions is half a record: a run once ended having apparently
     * stopped itself, and the log could say what it had decided to do but not where it had put its
     * finger, so whether a click had gone somewhere unintended was unanswerable.
     */
    async click(point) {
      this.log(`    click (${point.x.toFixed(3)}, ${point.y.toFixed(3)})`);
      await this.session.click(point);
    }
    async clickRosterCard(index, geometry) {
      await this.click({
        x: rosterCardCenterX(index, geometry),
        y: geometry.portraitCenterY
      });
    }
    /**
     * Re-reads the gate until two consecutive looks agree on where it is.
     *
     * The map slides between rooms, so a single reading can be a frame from
     * mid-animation and the click would land where the gate used to be.
     */
    async settledGate(first) {
      if (!first) return void 0;
      let previous = first;
      let leftTheMap = false;
      const settled = await this.retry(async () => {
        const detection = await this.look();
        if (detection.state !== "dungeonMap" || !detection.actionPoint) {
          if (detection.state !== "unknown") leftTheMap = true;
          return void 0;
        }
        const moved = Math.hypot(
          detection.actionPoint.x - previous.x,
          detection.actionPoint.y - previous.y
        );
        previous = detection.actionPoint;
        if (moved <= GATE_SETTLE_TOLERANCE) return detection.actionPoint;
        this.log(`  map still scrolling (gate moved ${moved.toFixed(3)}), waiting...`);
        return void 0;
      }, this.config.timing.gateSettleAttempts);
      if (!settled && !leftTheMap) {
        throw await this.abort("The gate never stopped moving; the map may be stuck animating.");
      }
      return settled;
    }
    requireActionPoint(point, what, diagnostics) {
      if (!point) {
        throw new RunEndedError("aborted", `Could not locate ${what} on screen (${diagnostics}).`);
      }
      return point;
    }
    /**
     * Ends the run because something is wrong: a screen that could not be read, or an act that had no
     * effect.
     *
     * Every one of these has a fault behind it that somebody could fix, which is what the frame is
     * kept for. {@link decline} is the other ending and the two are not degrees of the same thing —
     * see {@link RunEnding}.
     *
     * @param evidence the frame this message is about, when that is not simply the last one looked at.
     *   Almost every abort here fires on the screenshot it has just read and leaves this undefined; the
     *   casualty settle is the exception, because it looks again before it gives up. See
     *   {@link endRun}.
     */
    async abort(message, evidence) {
      return this.endRun("aborted", message, evidence);
    }
    /**
     * Ends the run because a rule said not to act, with nothing wrong and nothing pressed.
     *
     * Two rules reach here, and they are the same rule arriving from opposite sides of a battle:
     * {@link refuseUnderstrengthTeam} sees the cost coming and refuses before anything is spent,
     * while the death branch of {@link stopIfATitanDied} sees it after the fact and hands the game
     * back untouched. In both the reading worked; what the run declined to do was press the button.
     *
     * The frame is kept for the same reason an abort's is — §3.2 wants the exact frame that was
     * looked at — but it answers a different question, so it is filed under a different label.
     */
    async decline(message) {
      return this.endRun("declined", message);
    }
    /**
     * Composes a run-ending error, keeping the exact frame the message is about.
     *
     * §3.2: never a fresh capture. The map animates while it scrolls and a result dialog animates
     * while it arrives, so a re-capture here would file a different moment than the one the message
     * describes, and the evidence would contradict the reading it was meant to explain.
     *
     * **The last screenshot taken is the default and not the rule.** §3.2 asks for the frame that was
     * *analysed*, and those are the same frame only while the caller stops on the reading it has just
     * taken. A step that looks again before giving up — {@link stopIfATitanDied} is the one — leaves
     * {@link lastScreenshot} pointing at the look that came last rather than the one that failed. The
     * phone put a save-point screen in a bundle under `abort_` that way. Such a caller passes its own.
     *
     * `safety.saveScreenshotOnAbort` gates both endings despite its name. Renaming a config key is a
     * change to `config/chrome.json`, `config/android.json` and the Android parser at once, which is
     * a wider change than the vocabulary this belongs to; what it means is "keep the frame when a run
     * ends early", and it always did.
     */
    async endRun(ending, message, evidence) {
      const progress = `Stopped after ${this.summary.battlesCompleted} of ${this.config.limits.maxBattles} battles resolved (${this.summary.battlesWon} won, ${this.summary.battlesLost} lost, ${this.summary.battlesStarted} started).`;
      if (!this.config.safety.saveScreenshotOnAbort) {
        return new RunEndedError(ending, `${message}
${progress}`);
      }
      const path = await this.session.saveScreenshot(
        frameLabelFor(ending),
        evidence ?? this.lastScreenshot
      );
      if (!path) return new RunEndedError(ending, `${message}
${progress}`);
      return new RunEndedError(ending, `${message}
${progress}
Frame saved to ${path}`, path);
    }
  };
  function rosterCardCenterX(index, geometry) {
    return geometry.firstCardCenterX + index * geometry.cardSpacingX;
  }

  // src/vision/present.ts
  function presentCanvasAsViewport(canvas, viewport, canvasArea) {
    const target = boxToPixels(canvasArea, viewport.width, viewport.height);
    const data = new Uint8Array(viewport.width * viewport.height * 4);
    const scaleX = canvas.width / target.width;
    const scaleY = canvas.height / target.height;
    for (let y = 0; y < target.height; y += 1) {
      const startY = Math.floor(y * scaleY);
      const endY = Math.max(startY + 1, Math.min(canvas.height, Math.ceil((y + 1) * scaleY)));
      for (let x = 0; x < target.width; x += 1) {
        const startX = Math.floor(x * scaleX);
        const endX = Math.max(startX + 1, Math.min(canvas.width, Math.ceil((x + 1) * scaleX)));
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let sourceY = startY; sourceY < endY; sourceY += 1) {
          const row = sourceY * canvas.width;
          for (let sourceX = startX; sourceX < endX; sourceX += 1) {
            const from = (row + sourceX) * 4;
            red += canvas.data[from] ?? 0;
            green += canvas.data[from + 1] ?? 0;
            blue += canvas.data[from + 2] ?? 0;
            count += 1;
          }
        }
        const to = ((target.top + y) * viewport.width + target.left + x) * 4;
        data[to] = Math.round(red / count);
        data[to + 1] = Math.round(green / count);
        data[to + 2] = Math.round(blue / count);
        data[to + 3] = 255;
      }
    }
    return { data, width: viewport.width, height: viewport.height };
  }
  var ASPECT_TOLERANCE = 0.02;
  function canvasHasCalibratedShape(canvas, viewport, canvasArea) {
    const calibrated = boxToPixels(canvasArea, viewport.width, viewport.height);
    return Math.abs(canvas.width / canvas.height - calibrated.width / calibrated.height) <= ASPECT_TOLERANCE;
  }

  // src/session/BrowserGameSession.ts
  var FRAME_TIMEOUT_MS = 2e4;
  var BrowserGameSession = class {
    constructor(canvas, calibratedViewport, canvasArea, betweenClicksMs, notice = () => void 0) {
      this.canvas = canvas;
      this.calibratedViewport = calibratedViewport;
      this.canvasArea = canvasArea;
      this.betweenClicksMs = betweenClicksMs;
      this.notice = notice;
    }
    gl;
    /** Resolvers waiting for the next painted frame. */
    pending = [];
    hooked = false;
    contextWatched = false;
    describe() {
      const { width, height } = this.calibratedViewport;
      return `the page this script is running in (canvas ${this.canvas.width}x${this.canvas.height}, presented as ${width}x${height})`;
    }
    async open() {
      const gl = this.canvas.getContext("webgl2", { preserveDrawingBuffer: true }) ?? this.canvas.getContext("webgl2");
      if (!gl) throw new Error("The game canvas has no WebGL2 context to read.");
      this.gl = gl;
      this.hookAnimationFrame();
      this.watchForContextLoss();
      return true;
    }
    /**
     * Says so when the game loses its drawing context.
     *
     * Without this, a game that has crashed looks exactly like a game in a hidden
     * tab: frames simply stop arriving, and the only account of it is a timeout
     * twenty seconds later that cannot tell the two apart. The distinction matters
     * because one of them is fixed by looking at the tab and the other is not.
     */
    watchForContextLoss() {
      if (this.contextWatched) return;
      this.contextWatched = true;
      this.canvas.addEventListener("webglcontextlost", () => {
        this.notice(
          "The game lost its WebGL context. It has crashed or been reset by the browser, and no further frames can be read until the page is reloaded."
        );
      });
      this.canvas.addEventListener("webglcontextrestored", () => {
        this.notice("The game's WebGL context came back.");
      });
    }
    async close() {
      this.pending = [];
    }
    /**
     * Reads pixels back immediately after the game has drawn.
     *
     * A WebGL drawing buffer is cleared once it has been composited, so a read at
     * an arbitrary moment comes back blank or stale. The only reliable window is
     * inside the animation-frame callback, straight after the game's own draw, so
     * the hook below wraps `requestAnimationFrame` and the read happens there.
     */
    async screenshot() {
      if (!this.gl) throw new Error("BrowserGameSession.open() must be called before use.");
      await this.waitUntilPainting();
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          this.pending = this.pending.filter((waiting) => waiting !== resolve);
          reject(
            new Error(
              `The page stopped painting for ${FRAME_TIMEOUT_MS / 1e3}s. Chrome suspends animation frames for tabs that are hidden or fully covered, and the game cannot be read while it is not drawing.`
            )
          );
        }, FRAME_TIMEOUT_MS);
        this.pending.push((frame) => {
          window.clearTimeout(timer);
          resolve(frame);
        });
        window.requestAnimationFrame(() => void 0);
      });
    }
    /**
     * Waits for the tab to be visible, because a hidden one does not paint.
     *
     * Chrome suspends `requestAnimationFrame` entirely for hidden tabs, so the
     * read never fires and the run stops dead with nothing in the log. Pausing is
     * better than failing: switching tabs for a minute is an ordinary thing to do,
     * and the run picks up where it left off.
     *
     * The Playwright backend has no such problem because it launches Chrome with
     * the backgrounding flags turned off. A userscript cannot ask for those, so
     * the tab genuinely has to stay visible for an unattended run.
     */
    async waitUntilPainting() {
      if (!document.hidden) return;
      this.notice("Paused: this tab is hidden and Chrome stops painting hidden tabs. Bring it back to resume.");
      await new Promise((resolve) => {
        const onChange = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", onChange);
          resolve();
        };
        document.addEventListener("visibilitychange", onChange);
      });
      this.notice("Tab visible again; resuming.");
    }
    /**
     * Clicks a point given as fractions of the viewport.
     *
     * Mouse and touch events both, because the client is built for both and takes
     * whichever it sees first; sending only mouse events works on desktop layouts
     * and silently does nothing on the touch ones.
     */
    async click(point) {
      const area = this.canvasArea;
      const withinCanvasX = (point.x - area.x) / area.w;
      const withinCanvasY = (point.y - area.y) / area.h;
      const bounds = this.canvas.getBoundingClientRect();
      const clientX = bounds.left + withinCanvasX * bounds.width;
      const clientY = bounds.top + withinCanvasY * bounds.height;
      this.fireMouse("mousedown", clientX, clientY, 1);
      this.fireTouch("touchstart", clientX, clientY);
      await this.wait(30);
      this.fireMouse("mouseup", clientX, clientY, 0);
      this.fireMouse("click", clientX, clientY, 0);
      this.fireTouch("touchend", clientX, clientY);
      await this.wait(this.betweenClicksMs);
    }
    async wait(milliseconds) {
      await new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }
    async isGameLoaded() {
      return this.canvas.width > 800 && this.canvas.height > 400;
    }
    /**
     * The drawing buffer's size, not the window's.
     *
     * Deliberately the buffer: it is what `readPixels` addresses and what the game
     * lays its interface out in, so it stays put when the window is resized or the
     * page is zoomed. The Chrome backend has to police the window size for exactly
     * the reason this one does not.
     */
    get viewport() {
      return this.calibratedViewport;
    }
    /**
     * Whether the canvas is the *shape* the constants were measured against.
     *
     * Shape rather than size, and that is the point. The screenshot backends have
     * to insist on an exact window size, because the header above the canvas is a
     * fixed number of pixels and so occupies a different fraction of every
     * differently sized window. Here the header is not in the picture at all: the
     * canvas is scaled into the rectangle it occupied at calibration, so any
     * window whose canvas has this aspect ratio reproduces the calibrated layout.
     * That is what lets somebody else run this without measuring anything.
     */
    matchesCalibratedViewport() {
      return canvasHasCalibratedShape(this.canvas, this.calibratedViewport, this.canvasArea);
    }
    /** No filesystem in a page, so nothing is written and the caller is told so. */
    async saveScreenshot() {
      return void 0;
    }
    hookAnimationFrame() {
      if (this.hooked) return;
      this.hooked = true;
      const original = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => original((time) => {
        try {
          callback(time);
        } finally {
          this.drainPendingReads();
        }
      });
    }
    /** Runs inside the animation frame, where the drawing buffer is still valid. */
    drainPendingReads() {
      if (this.pending.length === 0 || !this.gl) return;
      const waiting = this.pending;
      this.pending = [];
      const width = this.canvas.width;
      const height = this.canvas.height;
      const raw = new Uint8Array(width * height * 4);
      this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, raw);
      const canvasFrame = { data: flipVertically(raw, width, height), width, height };
      const frame = presentCanvasAsViewport(canvasFrame, this.calibratedViewport, this.canvasArea);
      for (const resolve of waiting) resolve(frame);
    }
    fireMouse(type, clientX, clientY, buttons) {
      this.canvas.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX, clientY, button: 0, buttons })
      );
    }
    fireTouch(type, clientX, clientY) {
      const touch = { identifier: 1, target: this.canvas, clientX, clientY, pageX: clientX, pageY: clientY };
      const event = new Event(type, { bubbles: true, cancelable: true });
      const active = type === "touchend" ? [] : [touch];
      event["touches"] = active;
      event["targetTouches"] = active;
      event["changedTouches"] = [touch];
      this.canvas.dispatchEvent(event);
    }
  };
  function flipVertically(source, width, height) {
    const rowBytes = width * 4;
    const flipped = new Uint8Array(source.length);
    for (let y = 0; y < height; y += 1) {
      const from = (height - 1 - y) * rowBytes;
      flipped.set(source.subarray(from, from + rowBytes), y * rowBytes);
    }
    return flipped;
  }

  // src/vision/portraitLibrary.ts
  var PrecomputedPortraits = class {
    signatures;
    constructor(entries) {
      this.signatures = new Map(
        Object.entries(entries).map(([name, values]) => [name, Float32Array.from(values)])
      );
    }
    async signatureFor(name) {
      return this.signatures.get(name);
    }
  };

  // src/domain/types.ts
  var ELEMENTS = ["water", "earth", "mix", "fire"];

  // src/strategy/elementRanking.ts
  function completeRanking(stored, fallback = ELEMENTS) {
    const ranked = [];
    for (const name of stored ?? []) {
      const element = ELEMENTS.find((candidate) => candidate === name);
      if (element && !ranked.includes(element)) ranked.push(element);
    }
    for (const element of [...fallback, ...ELEMENTS]) {
      if (!ranked.includes(element)) ranked.push(element);
    }
    return ranked;
  }
  function promote(ranking, element) {
    return swap(ranking, element, -1);
  }
  function demote(ranking, element) {
    return swap(ranking, element, 1);
  }
  function swap(ranking, element, by) {
    const moved = [...ranking];
    const from = moved.indexOf(element);
    const to = from + by;
    if (from < 0 || to < 0 || to >= moved.length) return moved;
    moved[from] = moved[to];
    moved[to] = element;
    return moved;
  }

  // src/userscript/panel.ts
  var MAX_LOG_LINES = 200;
  var PANEL_WIDTH_PX = 330;
  function createPanel(handlers, version, journal) {
    const root = document.createElement("div");
    root.style.cssText = [
      "position:fixed",
      "top:8px",
      "left:8px",
      "z-index:2147483647",
      `width:${PANEL_WIDTH_PX}px`,
      "font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace",
      "color:#e8e8ea",
      "background:rgba(18,18,22,0.92)",
      "border:1px solid #3a3a44",
      "border-radius:8px",
      "box-shadow:0 4px 16px rgba(0,0,0,0.45)",
      "overflow:hidden"
    ].join(";");
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:8px;padding:7px 9px;background:#23232b;border-bottom:1px solid #3a3a44";
    const title = document.createElement("strong");
    title.textContent = "Dungeon";
    title.style.cssText = "font-weight:600;letter-spacing:0.02em";
    const versionLabel = document.createElement("span");
    versionLabel.textContent = version;
    versionLabel.title = "Script version";
    versionLabel.style.cssText = "flex:1;opacity:0.5;font-size:11px";
    const startButton = button("Run");
    const stopButton = button("Stop");
    stopButton.disabled = true;
    const exportButton = button("Logs");
    exportButton.title = "Save a zip of the log, the settings and the screen, for a bug report";
    exportButton.addEventListener("click", () => {
      void (async () => {
        const wasLabel = exportButton.textContent;
        exportButton.disabled = true;
        exportButton.textContent = "\u2026";
        try {
          const saved = await handlers.exportDiagnostics(journal.lines());
          panel.log(`Diagnostics saved as ${saved}.`);
        } catch (error) {
          panel.log(
            `Could not save diagnostics: ${error instanceof Error ? error.message : String(error)}`
          );
        } finally {
          exportButton.disabled = false;
          exportButton.textContent = wasLabel;
        }
      })();
    });
    const collapseButton = button("\u2013");
    let collapsed = false;
    const applyCollapsed = () => {
      priority.style.display = collapsed ? "none" : "";
      options.style.display = collapsed ? "none" : "";
      healing.style.display = collapsed ? "none" : "";
      output.style.display = collapsed ? "none" : "";
      collapseButton.textContent = collapsed ? "+" : "\u2013";
      collapseButton.title = collapsed ? "Show the panel" : "Collapse to the title bar";
      root.style.width = collapsed ? "auto" : `${PANEL_WIDTH_PX}px`;
    };
    startButton.addEventListener("click", () => handlers.start());
    stopButton.addEventListener("click", () => handlers.stop());
    header.append(title, versionLabel, exportButton, collapseButton, startButton, stopButton);
    const priority = document.createElement("div");
    priority.style.cssText = "padding:6px 9px;border-bottom:1px solid #3a3a44";
    const priorityLabel = document.createElement("div");
    priorityLabel.textContent = "Room priority";
    priorityLabel.style.cssText = "opacity:0.65;margin-bottom:4px;letter-spacing:0.02em";
    priority.appendChild(priorityLabel);
    const rows = document.createElement("div");
    priority.appendChild(rows);
    const renderRanking = () => {
      const ranking = handlers.ranking();
      rows.textContent = "";
      ranking.forEach((element, index) => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:6px;padding:1px 0";
        const rank = document.createElement("span");
        rank.textContent = `${index + 1}.`;
        rank.style.cssText = "opacity:0.5;width:14px";
        const name = document.createElement("span");
        name.textContent = element;
        name.style.cssText = `flex:1;color:${ELEMENT_COLOURS[element]}`;
        const up = smallButton("\u25B2", index === 0);
        const down = smallButton("\u25BC", index === ranking.length - 1);
        up.addEventListener("click", () => {
          handlers.onRankingChange(promote(handlers.ranking(), element));
          renderRanking();
        });
        down.addEventListener("click", () => {
          handlers.onRankingChange(demote(handlers.ranking(), element));
          renderRanking();
        });
        row.append(rank, name, up, down);
        rows.appendChild(row);
      });
    };
    renderRanking();
    const options = document.createElement("div");
    options.style.cssText = "padding:6px 9px;border-bottom:1px solid #3a3a44";
    const renderToggles = () => {
      options.textContent = "";
      for (const toggle of handlers.toggles()) {
        const row = document.createElement("label");
        row.title = toggle.title;
        row.style.cssText = "display:flex;align-items:center;gap:6px;padding:1px 0;cursor:pointer";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = toggle.checked;
        box.style.cssText = "margin:0;accent-color:#7aa2d8";
        box.addEventListener("change", () => {
          toggle.onChange(box.checked);
          renderToggles();
        });
        const text = document.createElement("span");
        text.textContent = toggle.label;
        row.append(box, text);
        options.appendChild(row);
      }
    };
    renderToggles();
    const healing = document.createElement("div");
    healing.style.cssText = "padding:6px 9px;border-bottom:1px solid #3a3a44";
    const healingLabel = document.createElement("div");
    healingLabel.textContent = "Healing titans";
    healingLabel.style.cssText = "opacity:0.65;margin-bottom:4px;letter-spacing:0.02em";
    const healingRows = document.createElement("div");
    const chooseButton = button("Choose from roster");
    chooseButton.style.marginTop = "4px";
    chooseButton.style.width = "100%";
    const picker = document.createElement("div");
    picker.style.cssText = "display:none;margin-top:5px";
    const renderHealing = () => {
      const titans = handlers.healingTitans();
      healingRows.textContent = "";
      if (titans.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "Nobody chosen \u2014 the swap is skipped.";
        empty.style.cssText = "opacity:0.55;padding:1px 0";
        healingRows.appendChild(empty);
      }
      titans.forEach((titan, index) => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:6px;padding:1px 0";
        row.style.opacity = titan.inRotation ? "1" : "0.5";
        row.title = titan.inRotation ? "Competes for the healing slot" : "Named, but outside the rotation \u2014 move it up to use it";
        const face = document.createElement("img");
        face.src = titan.thumbnail;
        face.style.cssText = "width:22px;height:30px;border-radius:3px;object-fit:cover";
        const name = document.createElement("span");
        name.textContent = titan.name;
        name.style.flex = "1";
        const up = smallButton("\u25B2", index === 0);
        const down = smallButton("\u25BC", index === titans.length - 1);
        const drop = smallButton("\xD7", false);
        up.addEventListener("click", () => reorder(index, -1));
        down.addEventListener("click", () => reorder(index, 1));
        drop.addEventListener("click", () => {
          const kept = titans.filter((_, at) => at !== index);
          handlers.onHealingTitansChange(kept);
          renderHealing();
        });
        row.append(face, name, up, down, drop);
        healingRows.appendChild(row);
      });
    };
    const reorder = (from, by) => {
      const titans = [...handlers.healingTitans()];
      const to = from + by;
      if (to < 0 || to >= titans.length) return;
      const moved = titans[from];
      titans[from] = titans[to];
      titans[to] = moved;
      handlers.onHealingTitansChange(titans);
      renderHealing();
    };
    chooseButton.addEventListener("click", () => {
      void openPicker();
    });
    const openPicker = async () => {
      picker.textContent = "";
      picker.style.display = "block";
      picker.textContent = "Reading the roster\u2026";
      const result = await handlers.readRoster();
      picker.textContent = "";
      if ("problem" in result) {
        const problem = document.createElement("div");
        problem.textContent = result.problem;
        problem.style.cssText = "opacity:0.7;padding:2px 0";
        picker.appendChild(problem);
        return;
      }
      const hint = document.createElement("div");
      hint.textContent = "Click a titan to add it. You will be asked what to call it.";
      hint.style.cssText = "opacity:0.6;margin-bottom:4px";
      picker.appendChild(hint);
      const strip = document.createElement("div");
      strip.style.cssText = "display:flex;flex-wrap:wrap;gap:4px";
      for (const card of result.cards) {
        const choice = document.createElement("img");
        choice.src = card.thumbnail;
        choice.title = `Card ${card.index} \u2014 ${Math.round(card.health * 100)}% health`;
        choice.style.cssText = "width:30px;height:41px;border-radius:3px;object-fit:cover;cursor:pointer;border:1px solid #4a4a56";
        choice.addEventListener("click", () => {
          const name = window.prompt("What do you call this titan?", `Card ${card.index}`);
          if (name === null || name.trim().length === 0) return;
          card.choose(name.trim());
          renderHealing();
          picker.style.display = "none";
        });
        strip.appendChild(choice);
      }
      picker.appendChild(strip);
    };
    renderHealing();
    healing.append(healingLabel, healingRows, chooseButton, picker);
    const output = document.createElement("div");
    output.style.cssText = "max-height:260px;overflow-y:auto;padding:7px 9px;white-space:pre-wrap;word-break:break-word";
    const showLine = (text) => {
      const line = document.createElement("div");
      line.textContent = text;
      line.style.cssText = "padding:1px 0;border-bottom:1px solid rgba(255,255,255,0.04)";
      output.appendChild(line);
      while (output.childElementCount > MAX_LOG_LINES) output.firstElementChild?.remove();
      output.scrollTop = output.scrollHeight;
    };
    for (const line of journal.lines().slice(-MAX_LOG_LINES)) showLine(line);
    collapseButton.addEventListener("click", () => {
      collapsed = !collapsed;
      applyCollapsed();
    });
    root.append(header, priority, healing, options, output);
    document.body.appendChild(root);
    applyCollapsed();
    const panel = {
      log(message) {
        showLine(journal.append(message));
      },
      setRunning(running) {
        startButton.disabled = running;
        stopButton.disabled = !running;
        title.textContent = running ? "Dungeon \u2014 running" : "Dungeon";
        for (const control of Array.from(rows.querySelectorAll("button"))) control.disabled = running;
        for (const box of Array.from(options.querySelectorAll("input"))) box.disabled = running;
        for (const control of Array.from(healing.querySelectorAll("button"))) control.disabled = running;
        healing.style.opacity = running ? "0.45" : "1";
        rows.style.opacity = running ? "0.45" : "1";
        options.style.opacity = running ? "0.45" : "1";
      }
    };
    return panel;
  }
  var ELEMENT_COLOURS = {
    water: "#6fb7e8",
    earth: "#7fc47f",
    mix: "#c79ae0",
    fire: "#e8946f"
  };
  function smallButton(label, disabled) {
    const element = button(label);
    element.disabled = disabled;
    element.style.padding = "0 5px";
    element.style.lineHeight = "1.3";
    return element;
  }
  function button(label) {
    const element = document.createElement("button");
    element.textContent = label;
    element.style.cssText = [
      "font:inherit",
      "padding:2px 10px",
      "color:#e8e8ea",
      "background:#33333d",
      "border:1px solid #4a4a56",
      "border-radius:5px",
      "cursor:pointer"
    ].join(";");
    return element;
  }

  // src/userscript/runLog.ts
  var STORAGE_KEY = "hwa-dungeon.journal";
  var MAX_JOURNAL_LINES = 5e3;
  var PERSIST_DELAY_MS = 1e3;
  function openRunLog(version) {
    const lines = readStored();
    const carried = lines.length;
    let persistHandle;
    const persistSoon = () => {
      if (persistHandle !== void 0) return;
      persistHandle = window.setTimeout(() => {
        persistHandle = void 0;
        writeStored(lines);
      }, PERSIST_DELAY_MS);
    };
    const persistNow = () => {
      if (persistHandle !== void 0) window.clearTimeout(persistHandle);
      persistHandle = void 0;
      writeStored(lines);
    };
    window.addEventListener("pagehide", persistNow);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) persistNow();
    });
    const log = {
      append(message) {
        const line = `${timeOfDay()} ${message}`;
        lines.push(line);
        if (lines.length > MAX_JOURNAL_LINES) lines.splice(0, lines.length - MAX_JOURNAL_LINES);
        persistSoon();
        return line;
      },
      lines: () => lines,
      clear() {
        lines.length = 0;
        persistNow();
      }
    };
    log.append(`\u2014\u2014 page loaded, script ${version} \u2014\u2014`);
    if (carried > 0) {
      log.append(`   ${carried} lines above are from before this page was loaded.`);
    }
    return log;
  }
  function timeOfDay() {
    const now = /* @__PURE__ */ new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  function readStored() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored === null ? void 0 : JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((line) => typeof line === "string");
    } catch {
      return [];
    }
  }
  function writeStored(lines) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(lines.slice(Math.floor(lines.length / 2)))
        );
      } catch {
      }
    }
  }

  // src/userscript/zip.ts
  function buildZip(entries) {
    const chunks = [];
    const directory = [];
    let offset = 0;
    for (const entry of entries) {
      const name = new TextEncoder().encode(entry.name);
      const crc = crc32(entry.bytes);
      const size = entry.bytes.length;
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 67324752, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, 0, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, size, true);
      localView.setUint32(22, size, true);
      localView.setUint16(26, name.length, true);
      localView.setUint16(28, 0, true);
      local.set(name, 30);
      chunks.push(local, entry.bytes);
      const central = new Uint8Array(46 + name.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 33639248, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, size, true);
      centralView.setUint32(24, size, true);
      centralView.setUint16(28, name.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      central.set(name, 46);
      directory.push(central);
      offset += local.length + size;
    }
    const directoryBytes = directory.reduce((total2, part) => total2 + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 101010256, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, directoryBytes, true);
    endView.setUint32(16, offset, true);
    const parts = [...chunks, ...directory, end];
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const flat = new Uint8Array(total);
    let at = 0;
    for (const part of parts) {
      flat.set(part, at);
      at += part.length;
    }
    return new Blob([flat.buffer], { type: "application/zip" });
  }
  var CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
      }
      table[index] = value >>> 0;
    }
    return table;
  })();
  function crc32(bytes) {
    let crc = 4294967295;
    for (const byte of bytes) {
      crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
    }
    return (crc ^ 4294967295) >>> 0;
  }

  // src/userscript/diagnostics.ts
  function buildDiagnosticsBundle(input) {
    const text = (value) => new TextEncoder().encode(value);
    const entries = [
      { name: "about.txt", bytes: text(describe2(input)) },
      { name: "log.txt", bytes: text(`${input.logLines.join("\n")}
`) },
      { name: "settings.json", bytes: text(`${JSON.stringify(input.settings, null, 2)}
`) }
    ];
    if (input.frame) {
      const png = frameToPng(input.frame);
      if (png) entries.push({ name: "screen.png", bytes: png });
    }
    input.titans.forEach((titan, index) => {
      const bytes = dataUrlToBytes(titan.thumbnail);
      if (bytes) entries.push({ name: `titans/${index + 1}-${safeName(titan.name)}.png`, bytes });
    });
    return buildZip(entries);
  }
  function describe2(input) {
    const lines = [
      `HWA dungeon userscript ${input.version}`,
      `exported            ${(/* @__PURE__ */ new Date()).toISOString()}`,
      `page                ${window.location.href}`,
      `user agent          ${window.navigator.userAgent}`,
      `window              ${window.innerWidth}x${window.innerHeight} at dpr ${window.devicePixelRatio}`,
      `canvas              ${input.canvas ? `${input.canvas.width}x${input.canvas.height}` : "not found"}`,
      `frame presented as  ${input.frame ? `${input.frame.width}x${input.frame.height}` : "could not be read"}`,
      "",
      "Healing titans, in preference order. Only the first few compete for the slot;",
      "each portrait is in titans/ so the faces can be checked against the roster."
    ];
    if (input.titans.length === 0) {
      lines.push("  (nobody chosen - the healing swap is skipped)");
    } else {
      input.titans.forEach((titan, index) => {
        const crop = titan.capturedWith;
        lines.push(
          `  ${index + 1}. ${titan.name}  cut with w=${crop.w} h=${crop.h} centerY=${crop.centerY}`
        );
      });
    }
    lines.push("", "Settings as stored:", JSON.stringify(input.settings, null, 2), "");
    return lines.join("\n");
  }
  function frameToPng(frame) {
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const context = canvas.getContext("2d");
    if (!context) return void 0;
    const image = context.createImageData(frame.width, frame.height);
    image.data.set(frame.data);
    context.putImageData(image, 0, 0);
    return dataUrlToBytes(canvas.toDataURL("image/png"));
  }
  function dataUrlToBytes(dataUrl) {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return void 0;
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  function safeName(name) {
    return name.replace(/[^a-z0-9-_]/gi, "_").slice(0, 40) || "titan";
  }
  function downloadBundle(bundle, version) {
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
    const fileName = `hwa-dungeon-${version}-${stamp}.zip`;
    const url = URL.createObjectURL(bundle);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1e4);
    return fileName;
  }

  // src/userscript/rosterCapture.ts
  async function captureRosterCards(frame, geometry) {
    const cards = [];
    for (let index = 0; index < geometry.visibleCardCount; index += 1) {
      const box = portraitBoxForCard(index, geometry);
      const signature = portraitSignature(frame, box);
      const pixels = cropToRgb(frame, box);
      if (pixels.width === 0 || pixels.height === 0) continue;
      cards.push({
        index,
        signature: Array.from(signature, (value) => Number(value.toFixed(3))),
        thumbnail: toDataUrl(pixels),
        health: await readHealthFraction(frame, healthBarBoxForCard(index, geometry))
      });
    }
    return cards;
  }
  function toDataUrl(pixels) {
    const canvas = document.createElement("canvas");
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const context = canvas.getContext("2d");
    if (!context) return "";
    const image = context.createImageData(pixels.width, pixels.height);
    for (let index = 0; index < pixels.width * pixels.height; index += 1) {
      image.data[index * 4] = pixels.data[index * 3] ?? 0;
      image.data[index * 4 + 1] = pixels.data[index * 3 + 1] ?? 0;
      image.data[index * 4 + 2] = pixels.data[index * 3 + 2] ?? 0;
      image.data[index * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
  }

  // src/userscript/healingRoster.ts
  var TITANS_IN_ROTATION = 2;
  var STORAGE_KEY2 = "hwa-dungeon.healingTitans";
  function loadCalibratedTitans() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY2);
      const parsed = stored === null ? [] : JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter(isCalibratedTitan) : [];
    } catch {
      return [];
    }
  }
  function saveCalibratedTitans(titans) {
    try {
      window.localStorage.setItem(STORAGE_KEY2, JSON.stringify(titans));
    } catch {
    }
  }
  function candidatesOf(titans) {
    return titans.slice(0, TITANS_IN_ROTATION).map((titan) => titan.name);
  }
  function signaturesOf(titans) {
    const signatures = {};
    for (const titan of titans) signatures[titan.name] = [...titan.signature];
    return signatures;
  }
  function staleAgainst(titans, crop) {
    return titans.some(
      (titan) => titan.capturedWith.w !== crop.w || titan.capturedWith.h !== crop.h || titan.capturedWith.centerY !== crop.centerY
    );
  }
  function isCalibratedTitan(value) {
    if (typeof value !== "object" || value === null) return false;
    const titan = value;
    return typeof titan.name === "string" && titan.name.length > 0 && Array.isArray(titan.signature) && titan.signature.length > 0 && typeof titan.thumbnail === "string" && typeof titan.capturedWith === "object" && titan.capturedWith !== null;
  }

  // src/userscript/priorityStore.ts
  var STORAGE_KEY3 = "hwa-dungeon.elementPriority";
  var HEALING_KEY = "hwa-dungeon.healingSwap";
  var FULL_TEAM_KEY = "hwa-dungeon.requireFullTeam";
  var STOP_ON_DEATH_KEY = "hwa-dungeon.stopWhenTitanDies";
  function loadRanking(fallback) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY3);
      const parsed = stored === null ? void 0 : JSON.parse(stored);
      return completeRanking(Array.isArray(parsed) ? parsed : void 0, fallback);
    } catch {
      return completeRanking(void 0, fallback);
    }
  }
  function saveRanking(ranking) {
    try {
      window.localStorage.setItem(STORAGE_KEY3, JSON.stringify(ranking));
    } catch {
    }
  }
  function loadHealingSwapEnabled() {
    return readFlag(HEALING_KEY, true);
  }
  function saveHealingSwapEnabled(enabled) {
    writeFlag(HEALING_KEY, enabled);
  }
  function loadRequireFullTeam() {
    return readFlag(FULL_TEAM_KEY, true);
  }
  function saveRequireFullTeam(required) {
    writeFlag(FULL_TEAM_KEY, required);
  }
  function loadStopWhenTitanDies() {
    return readFlag(STOP_ON_DEATH_KEY, false);
  }
  function saveStopWhenTitanDies(stop) {
    writeFlag(STOP_ON_DEATH_KEY, stop);
  }
  function readFlag(key, fallback) {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return fallback;
      const parsed = JSON.parse(stored);
      return typeof parsed === "boolean" ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  function writeFlag(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
  }

  // src/flow/waitForDungeonScreen.ts
  async function waitForDungeonScreen(session, config, log) {
    const detector = new ScreenDetector(config);
    const deadline = Date.now() + config.timing.readyTimeoutMs;
    let lastReport = 0;
    while (Date.now() < deadline) {
      if (await session.isGameLoaded()) {
        const { state } = await detector.detect(await session.screenshot());
        if (state !== "unknown") return state;
      }
      const remaining = Math.round((deadline - Date.now()) / 1e3);
      if (remaining < lastReport - 15 || lastReport === 0) {
        log(`  still waiting, ${remaining}s left...`);
        lastReport = remaining;
      }
      await session.wait(2e3);
    }
    return void 0;
  }

  // src/userscript/main.ts
  var SCRIPT_VERSION = true ? "0.13.0" : "dev";
  var CANVAS_TIMEOUT_MS = 6e4;
  var CANVAS_POLL_MS = 500;
  var MIN_GAME_CANVAS = { width: 800, height: 400 };
  async function main() {
    const canvasElement = await waitForGameCanvas();
    if (!canvasElement) return;
    const settings = chrome_default.session.chrome;
    if (!settings) throw new Error("config.session.chrome is missing; it carries the calibrated viewport.");
    let stopRequested = false;
    let ranking = loadRanking(chrome_default.strategy.elementPriority);
    let healingSwap = loadHealingSwapEnabled();
    let healingTitans = loadCalibratedTitans();
    let requireFullTeam = loadRequireFullTeam();
    let stopWhenTitanDies = loadStopWhenTitanDies();
    const journal = openRunLog(SCRIPT_VERSION);
    const panel = createPanel({
      start: () => {
        stopRequested = false;
        void run();
      },
      stop: () => {
        stopRequested = true;
        panel.log("Stop requested; the run will end after the step in progress.");
      },
      ranking: () => ranking,
      onRankingChange: (updated) => {
        ranking = [...updated];
        saveRanking(ranking);
      },
      healingTitans: () => healingTitans.map((titan, index) => ({
        name: titan.name,
        thumbnail: titan.thumbnail,
        inRotation: index < TITANS_IN_ROTATION
      })),
      onHealingTitansChange: (rows) => {
        const byName = new Map(healingTitans.map((titan) => [titan.name, titan]));
        healingTitans = rows.map((row) => byName.get(row.name)).filter((titan) => titan !== void 0);
        saveCalibratedTitans(healingTitans);
      },
      readRoster: async () => {
        const roster = base.coordinates.teamSelect.roster;
        try {
          await session.open();
          const frame = await session.screenshot();
          const cards = await captureRosterCards(frame, roster);
          if (cards.length === 0) {
            return { problem: "No roster cards could be read from this screen." };
          }
          return {
            cards: cards.map((card) => ({
              index: card.index,
              thumbnail: card.thumbnail,
              health: card.health,
              choose: (name) => {
                healingTitans = [
                  ...healingTitans.filter((titan) => titan.name !== name),
                  {
                    name,
                    signature: card.signature,
                    thumbnail: card.thumbnail,
                    capturedWith: {
                      w: roster.portraitArt.w,
                      h: roster.portraitArt.h,
                      centerY: roster.portraitArt.centerY
                    }
                  }
                ];
                saveCalibratedTitans(healingTitans);
              }
            }))
          };
        } catch (error) {
          return {
            problem: `Could not read the roster: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      },
      exportDiagnostics: async (logLines) => {
        let frame;
        let canvas;
        try {
          await session.open();
          frame = await session.screenshot();
          canvas = { width: canvasElement.width, height: canvasElement.height };
        } catch {
        }
        const bundle = buildDiagnosticsBundle({
          version: SCRIPT_VERSION,
          logLines,
          titans: healingTitans,
          // Every switch a run obeys, because the bundle is labelled "Settings as stored:" and a
          // list that leaves one out is not that. This one earns its place twice over: the run it
          // most often has to explain is one that halted with the dialog still on screen and nothing
          // clicked, and whether that was the rule working or the runner stuck is unanswerable
          // without knowing the rule was on.
          settings: {
            roomPriority: ranking,
            healingSwap,
            requireFullTeam,
            stopWhenTitanDies,
            healingTitans: healingTitans.map((titan) => titan.name)
          },
          frame,
          canvas
        });
        return downloadBundle(bundle, SCRIPT_VERSION);
      },
      toggles: () => [
        {
          label: "Swap in a hurt titan on mixed floors",
          title: "Off leaves the team exactly as you arranged it. It also removes the only step that needs the roster strip, so a run cannot stop for want of measuring it.",
          checked: healingSwap,
          onChange: (checked) => {
            healingSwap = checked;
            saveHealingSwapEnabled(checked);
          }
        },
        {
          label: "Refuse to fight without a full team",
          title: "On is the safe rule: an understrength fight costs the day rather than the battle, because the titans that survive it are hurt or dead for the rest of it. Off fights with whatever is fielded.",
          checked: requireFullTeam,
          onChange: (checked) => {
            requireFullTeam = checked;
            saveRequireFullTeam(checked);
          }
        },
        {
          label: "Stop running when a titan dies",
          title: "On ends the run on the result dialog without touching it - neither OK nor Retry - so you can revive before anything else is spent, at the cost of the attempts left unused until you come back. Off clicks OK and fights on a titan short.",
          checked: stopWhenTitanDies,
          onChange: (checked) => {
            stopWhenTitanDies = checked;
            saveStopWhenTitanDies(checked);
          }
        }
      ]
    }, SCRIPT_VERSION, journal);
    const log = (message) => {
      panel.log(message);
      console.log(`[dungeon] ${message}`);
    };
    const base = chrome_default;
    const session = new BrowserGameSession(
      canvasElement,
      settings.viewport,
      chrome_default.coordinates.teamSelect.canvasArea,
      chrome_default.timing.betweenClicksMs,
      (message) => log(message)
    );
    async function run() {
      panel.setRunning(true);
      try {
        await session.open();
        log(`Connected to ${session.describe()}.`);
        if (!session.matchesCalibratedViewport()) {
          const { width, height } = session.viewport;
          const wanted = settings.viewport;
          log(
            `Refusing to run: the drawing buffer is ${width}x${height}, whose shape does not match the ${wanted.width}x${wanted.height} these coordinates were measured against. At another aspect ratio the game re-lays out its interface and every click would land somewhere else.`
          );
          return;
        }
        log("Looking for a dungeon screen. Open Guild -> Dungeon if the game is elsewhere.");
        const ready = await waitForDungeonScreen(session, chrome_default, log);
        if (!ready) {
          log(
            "No dungeon screen appeared. This starts from the guild dungeon and does not navigate there itself, so open Guild -> Dungeon and press Run again."
          );
          return;
        }
        log(`Dungeon screen found (${ready}). Starting the run.`);
        log(`Room priority: ${ranking.join(" > ")}.`);
        const electing = candidatesOf(healingTitans);
        log(
          `Healing swap ${healingSwap && electing.length > 0 ? `on for ${electing.join(", ")}` : "off"}; ${requireFullTeam ? "a full team is required" : "incomplete teams are allowed"}; ${stopWhenTitanDies ? "a titan dying stops the run" : "the run continues after a titan dies"}.`
        );
        if (healingSwap && electing.length === 0) {
          log(
            "  Nobody is chosen for the healing slot, so the swap is skipped. Pick your titans with 'Choose from roster' on a team-select screen."
          );
        }
        if (staleAgainst(healingTitans, base.coordinates.teamSelect.roster.portraitArt)) {
          log(
            "  Some chosen portraits were cut with an older crop and will not match. Choose them from the roster again."
          );
        }
        const runner = new DungeonRunner(
          session,
          {
            ...base,
            strategy: {
              ...base.strategy,
              elementPriority: ranking,
              healing: {
                ...base.strategy.healing,
                // Whoever this browser was told about, and nobody otherwise. The
                // config's own list is the reference account's and is deliberately
                // not used here: electing a titan cannot be derived from pixels, so
                // a default would be a guess about whose account this is.
                candidates: healingSwap ? candidatesOf(healingTitans) : []
              },
              team: { ...base.strategy.team, allowIncompleteTeam: !requireFullTeam }
            },
            safety: { ...base.safety, stopWhenTitanDies }
          },
          log,
          new PrecomputedPortraits(signaturesOf(healingTitans)),
          () => stopRequested
        );
        const summary = await runner.run();
        log(
          `Finished: ${summary.battlesCompleted} battles resolved (${summary.battlesWon} won, ${summary.battlesLost} lost). Stopped because ${summary.stoppedBecause}.`
        );
      } catch (error) {
        if (error instanceof RunEndedError) {
          log(error.announcement);
        } else {
          log(`Unexpected failure: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      } finally {
        panel.setRunning(false);
      }
    }
  }
  async function waitForGameCanvas() {
    const deadline = Date.now() + CANVAS_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const canvas = Array.from(document.querySelectorAll("canvas")).find(
        (candidate) => candidate.width > MIN_GAME_CANVAS.width && candidate.height > MIN_GAME_CANVAS.height
      );
      if (canvas) return canvas;
      await new Promise((resolve) => window.setTimeout(resolve, CANVAS_POLL_MS));
    }
    console.warn("[dungeon] No game canvas appeared; the script will not start.");
    return void 0;
  }
  void main();
})();
