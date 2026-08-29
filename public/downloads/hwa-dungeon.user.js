// ==UserScript==
// @name         Hero Wars Alliance — Guild Dungeon
// @namespace    https://github.com/pollingerMaxi/hwa-auto-dungeon
// @version      0.7.0
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
          "//marker": "Measured on real markers across both empty frames: 93-119 pixels, aspect 1.06-1.31, fill 0.33-0.47. The bounds sit outside that spread with room to spare, while still excluding the nearest artwork blob on the full-team frame (83px, aspect 1.07, fill 0.40) - which position alone would also have rejected, since it sits 0.12 from the closest slot.",
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
            "//goldCoverage": "A BAND, and the band is the point. A marker is a fixed glyph on empty floor and always covers about the same share of its box: 0.165 to 0.200 measured over eight slots across two rooms that look nothing alike. An occupied slot misses the band from one side or the other - a titan standing on the marker hides it and scores 0.000 to 0.025, while one in gold armour scores 0.273 to 0.311, MORE gold than the marker itself. Treating more gold as more marker-like is what stopped a run on an earth floor, where the whole team is green and gold.",
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
          healthBar: { y: 0.9668, halfWidth: 0.0256, thickness: 9e-3 },
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
      captureBattleResults: true
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
        const hsv = pixelAt(pixels, x, y);
        const brightEnough = hsv.value > TICK_MIN_VALUE && hsv.saturation < TICK_MAX_SATURATION;
        const rightColour = hsv.hue >= TICK_HUE_MIN && hsv.hue <= TICK_HUE_MAX && hsv.saturation >= TICK_MIN_SATURATION;
        if (brightEnough && rightColour) cream += 1;
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
  async function bannerGoldFraction(screenshot) {
    const pixels = await cropToRgb(screenshot, RESULT_BANNER);
    let gold = 0;
    let total = 0;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const { hue, saturation, value } = pixelAt(pixels, x, y);
        if (hue >= VICTORY_GOLD.hueMin && hue <= VICTORY_GOLD.hueMax && saturation >= VICTORY_GOLD.minSaturation && value >= VICTORY_GOLD.minValue) {
          gold += 1;
        }
        total += 1;
      }
    }
    return total === 0 ? 0 : gold / total;
  }
  var ScreenDetector = class {
    constructor(config) {
      this.config = config;
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
      const attackButtons = actionButtons.filter((blob) => blob.center.y > 0.7 && blob.center.x < 0.9);
      const dialogBlues = await findColorBlobs(screenshot, DIALOG_BLUE, {
        minPixels: 60,
        searchArea: LOWER_BAND
      });
      if (attackButtons.length === 1 && dialogBlues.length >= 1) {
        const ok = attackButtons[0];
        const gold = await bannerGoldFraction(screenshot);
        return {
          state: "battleResult",
          diagnostics: `${diagnostics} dialogBlue=${dialogBlues.length} bannerGold=${gold.toFixed(3)}`,
          actionPoint: ok.center,
          actionButtons,
          battleWon: gold >= VICTORY_GOLD_MIN
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
  var TICK_MIN_VALUE2 = 0.75;
  var TICK_MAX_SATURATION2 = 0.35;
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
  async function deriveRosterGeometry(screenshot) {
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
    const frameWidth = barFrameWidth(pixels, health, background);
    if (frameWidth === void 0) {
      return refuse(notes, "could not measure the bar frame's width");
    }
    notes.push(`frame ${frameWidth.toFixed(1)}px, background hue ${background.hue.toFixed(0)}`);
    const anchorCentre = health.lattice.origin + frameWidth / 2;
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
    const tick = findTick(
      pixels,
      strip.firstCentre,
      pitch,
      strip.count,
      frameWidth,
      Math.round(tile.bottom - tileHeight * TICK_SEARCH_SHARE_OF_TILE),
      tile.bottom
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
        halfWidth: frameWidth / 2 / pixels.width,
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
  function refuse(notes, detail) {
    const measured = notes.length === 0 ? "" : `${notes.join("; ")}; `;
    return {
      diagnostics: `${measured}${detail}. The strip is anchored on the titans' health bars, and a dead titan draws none at all - so a roster with fewer than three living titans in it cannot be measured, and the configured geometry has to stand in.`
    };
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
  function barFrameWidth(pixels, band, background) {
    const row = Math.round((band.top + band.bottom) / 2);
    const widths = [];
    for (const run of band.lattice.runs) {
      let start = run.start;
      let end = run.end;
      while (start - 1 >= 0 && !isBackground(hsvAt(pixels, start - 1, row), background)) start -= 1;
      while (end + 1 < pixels.width && !isBackground(hsvAt(pixels, end + 1, row), background)) end += 1;
      const width = end - start + 1;
      if (width < band.lattice.pitch) widths.push(width);
    }
    return widths.length === 0 ? void 0 : median(widths);
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
  function findTick(pixels, firstCentre, pitch, cardCount, frameWidth, searchTopRow, healthTop) {
    const searchTop = Math.max(0, searchTopRow);
    const found = [];
    for (let index = 0; index < cardCount; index += 1) {
      const centre = firstCentre + index * pitch;
      const left = Math.round(centre);
      const right = Math.min(pixels.width - 1, Math.round(centre + pitch / 2));
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let count = 0;
      for (let y = searchTop; y < healthTop; y += 1) {
        for (let x = left; x <= right; x += 1) {
          const pixel = hsvAt(pixels, x, y);
          if (pixel.value <= TICK_MIN_VALUE2 || pixel.saturation >= TICK_MAX_SATURATION2) continue;
          count += 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      const area = (maxX - minX + 1) * (maxY - minY + 1);
      if (count < 80 || area <= 0 || count / area < 0.3) continue;
      found.push({
        dx: (minX + maxX) / 2 - centre,
        centreY: (minY + maxY) / 2,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        top: minY
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
  var DEAD_HEALTH_THRESHOLD = 0.02;
  var MAX_STUCK_ROUNDS = 3;
  var RunAbortedError = class extends Error {
    constructor(message, screenshotPath) {
      super(message);
      this.screenshotPath = screenshotPath;
      this.name = "RunAbortedError";
    }
  };
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
        const { state, diagnostics, actionPoint, battleWon } = detection;
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
            const ok = this.requireActionPoint(actionPoint, "the victory OK button", diagnostics);
            await this.click(ok);
            if (resultAlreadyCounted) {
              this.log("  the same result screen again; dismissing it without counting it twice.");
            } else {
              resultAlreadyCounted = true;
              summary.battlesCompleted += 1;
              if (battleWon === true) summary.battlesWon += 1;
              else if (battleWon === false) summary.battlesLost += 1;
              const outcome = battleWon === void 0 ? "resolved, outcome unreadable" : battleWon ? "WON" : "LOST";
              this.log(
                `Battle ${outcome}. ${summary.battlesCompleted} of ${this.config.limits.maxBattles} resolved (${summary.battlesWon} won, ${summary.battlesLost} lost).`
              );
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
      if (this.lastChosenElement === "mix") {
        await this.placeHealingTitan();
      }
      await this.refuseUnderstrengthTeam();
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
     */
    async refuseUnderstrengthTeam() {
      const { centers, marker } = this.config.coordinates.teamSelect.emptySlots;
      const { requiredTitans, allowIncompleteTeam } = this.config.strategy.team;
      const empty = await this.emptySlotsAgreedAcrossFrames();
      if (empty.length === 0) return;
      if (allowIncompleteTeam) {
        this.log(
          `  ${empty.length} team slot(s) are empty, short of ${requiredTitans}, but incomplete teams are allowed; going in anyway.`
        );
        return;
      }
      throw await this.abort(
        `${empty.length} team slot(s) are still empty (slots ${empty.join(", ")} of ${centers.length} checked), short of ${requiredTitans}. Fielding an understrength team loses the battle and the titans with it, so nothing was clicked. Fill the team and run again, or set strategy.team.allowIncompleteTeam if that is what you meant.`
      );
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
     * Extra frames are only taken when the first one reports something, so the
     * ordinary case - a full team, nothing flagged - still costs a single frame.
     */
    async emptySlotsAgreedAcrossFrames() {
      const { centers, marker } = this.config.coordinates.teamSelect.emptySlots;
      const readSlots = async () => {
        const frame = await this.session.screenshot();
        this.lastScreenshot = frame;
        return findEmptyTeamSlots(frame, centers, marker);
      };
      const first = await readSlots();
      if (first.length === 0) return [];
      const votes = /* @__PURE__ */ new Map();
      const tally = (slots) => {
        for (const slot of slots) votes.set(slot, (votes.get(slot) ?? 0) + 1);
      };
      tally(first);
      for (let round = 1; round < EMPTY_SLOT_CONFIRMATIONS; round += 1) {
        tally(await readSlots());
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
        throw new RunAbortedError(`Could not locate ${what} on screen (${diagnostics}).`);
      }
      return point;
    }
    async abort(message) {
      const progress = `Stopped after ${this.summary.battlesCompleted} of ${this.config.limits.maxBattles} battles resolved (${this.summary.battlesWon} won, ${this.summary.battlesLost} lost, ${this.summary.battlesStarted} started).`;
      if (!this.config.safety.saveScreenshotOnAbort) {
        return new RunAbortedError(`${message}
${progress}`);
      }
      const path = await this.session.saveScreenshot("abort", this.lastScreenshot);
      if (!path) return new RunAbortedError(`${message}
${progress}`);
      return new RunAbortedError(`${message}
${progress}
Screenshot saved to ${path}`, path);
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
    describe() {
      const { width, height } = this.calibratedViewport;
      return `the page this script is running in (canvas ${this.canvas.width}x${this.canvas.height}, presented as ${width}x${height})`;
    }
    async open() {
      const gl = this.canvas.getContext("webgl2", { preserveDrawingBuffer: true }) ?? this.canvas.getContext("webgl2");
      if (!gl) throw new Error("The game canvas has no WebGL2 context to read.");
      this.gl = gl;
      this.hookAnimationFrame();
      return true;
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
  function createPanel(handlers) {
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
    title.style.cssText = "flex:1;font-weight:600;letter-spacing:0.02em";
    const startButton = button("Run");
    const stopButton = button("Stop");
    stopButton.disabled = true;
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
    header.append(title, collapseButton, startButton, stopButton);
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
    collapseButton.addEventListener("click", () => {
      collapsed = !collapsed;
      applyCollapsed();
    });
    root.append(header, priority, healing, options, output);
    document.body.appendChild(root);
    applyCollapsed();
    return {
      log(message) {
        const line = document.createElement("div");
        line.textContent = message;
        line.style.cssText = "padding:1px 0;border-bottom:1px solid rgba(255,255,255,0.04)";
        output.appendChild(line);
        while (output.childElementCount > MAX_LOG_LINES) output.firstElementChild?.remove();
        output.scrollTop = output.scrollHeight;
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
  var STORAGE_KEY = "hwa-dungeon.healingTitans";
  function loadCalibratedTitans() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored === null ? [] : JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter(isCalibratedTitan) : [];
    } catch {
      return [];
    }
  }
  function saveCalibratedTitans(titans) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(titans));
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
  var STORAGE_KEY2 = "hwa-dungeon.elementPriority";
  var HEALING_KEY = "hwa-dungeon.healingSwap";
  var FULL_TEAM_KEY = "hwa-dungeon.requireFullTeam";
  function loadRanking(fallback) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY2);
      const parsed = stored === null ? void 0 : JSON.parse(stored);
      return completeRanking(Array.isArray(parsed) ? parsed : void 0, fallback);
    } catch {
      return completeRanking(void 0, fallback);
    }
  }
  function saveRanking(ranking) {
    try {
      window.localStorage.setItem(STORAGE_KEY2, JSON.stringify(ranking));
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
  var CANVAS_TIMEOUT_MS = 6e4;
  var CANVAS_POLL_MS = 500;
  var MIN_GAME_CANVAS = { width: 800, height: 400 };
  async function main() {
    const canvas = await waitForGameCanvas();
    if (!canvas) return;
    const settings = chrome_default.session.chrome;
    if (!settings) throw new Error("config.session.chrome is missing; it carries the calibrated viewport.");
    let stopRequested = false;
    let ranking = loadRanking(chrome_default.strategy.elementPriority);
    let healingSwap = loadHealingSwapEnabled();
    let healingTitans = loadCalibratedTitans();
    let requireFullTeam = loadRequireFullTeam();
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
        }
      ]
    });
    const log = (message) => {
      panel.log(message);
      console.log(`[dungeon] ${message}`);
    };
    const base = chrome_default;
    const session = new BrowserGameSession(
      canvas,
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
          `Healing swap ${healingSwap && electing.length > 0 ? `on for ${electing.join(", ")}` : "off"}; ${requireFullTeam ? "a full team is required" : "incomplete teams are allowed"}.`
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
            }
          },
          log,
          new PrecomputedPortraits(signaturesOf(healingTitans)),
          () => stopRequested
        );
        const summary = await runner.run();
        log(
          `Finished: ${summary.battlesCompleted} battles completed of ${summary.battlesStarted} started. Stopped because ${summary.stoppedBecause}.`
        );
      } catch (error) {
        if (error instanceof RunAbortedError) {
          log(`Stopped on purpose rather than guessing: ${error.message}`);
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
