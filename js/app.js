(function () {
  "use strict";

  var FALLBACK_LOAD_NOTE = "the words for this page did not load. you can refresh and try again.";
  var REQUIRED_PROMPTS = [
    "What's a smell that takes you back?",
    "Tell me about a place you loved.",
    "What song makes you want to move?"
  ];

  var settings = window.HelloWorldStorage.getSettings();
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var copy = null;
  var lines = [];
  var reduceMotion = false;
  var paused = false;
  var introDone = false;
  var pendingStart = false;
  var typing = null;
  var barSettled = false;

  function $(id) {
    return document.getElementById(id);
  }

  function prefersReducedMotion() {
    return settings.reduceMotion === true || motionQuery.matches;
  }

  function applyEnvironment() {
    var size = settings.textSize || "default";
    document.documentElement.setAttribute("data-text-size", size);
    document.documentElement.setAttribute("data-contrast", settings.highContrast ? "high" : "default");
    reduceMotion = prefersReducedMotion();
    document.documentElement.setAttribute("data-motion", reduceMotion ? "reduce" : "no-preference");
    document.documentElement.setAttribute("data-paused", paused ? "true" : "false");
    return reduceMotion;
  }

  function charDelay() {
    if (settings.readingSpeed === "slow") {
      return 68;
    }
    if (settings.readingSpeed === "fast") {
      return 16;
    }
    return 34;
  }

  function lineGap() {
    if (settings.readingSpeed === "slow") {
      return 800;
    }
    if (settings.readingSpeed === "fast") {
      return 240;
    }
    return 480;
  }

  function makeLine(text) {
    var p = document.createElement("p");
    p.className = "chat-line";
    p.textContent = text;
    return p;
  }

  function showAllLines() {
    var log = $("chat-log");
    log.replaceChildren();
    lines.forEach(function (line) {
      log.appendChild(makeLine(line));
    });
    $("typing-line").textContent = "";
  }

  function appendLine(text) {
    $("chat-log").appendChild(makeLine(text));
  }

  function finishIntro() {
    if (introDone) {
      return;
    }
    introDone = true;
    pendingStart = false;
    window.HelloWorldStorage.markWelcomeSeen();
    $("typing-line").textContent = "";
    $("skip").hidden = true;
    $("begin").hidden = false;
    $("screen-welcome").setAttribute("data-intro", "done");
  }

  function settleLoadingBar() {
    barSettled = true;
    if (!copy) {
      return;
    }
    var bar = $("loading-bar");
    bar.setAttribute("aria-valuenow", "99");
    bar.setAttribute("aria-valuetext", copy.shell.loadingValueText);
    bar.setAttribute("aria-hidden", "false");
  }

  function createTyper() {
    var lineIndex = 0;
    var charIndex = 0;
    var timer = null;
    var stopped = false;

    function clearTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function paint(text) {
      var line = $("typing-line");
      line.textContent = "";
      if (!text) {
        return;
      }
      var span = document.createElement("span");
      span.textContent = text;
      var caret = document.createElement("span");
      caret.className = "caret";
      line.append(span, caret);
    }

    function showCaret() {
      var line = $("typing-line");
      line.textContent = "";
      var caret = document.createElement("span");
      caret.className = "caret";
      line.append(caret);
    }

    function step() {
      if (stopped || paused || introDone) {
        return;
      }
      if (lineIndex >= lines.length) {
        finishIntro();
        return;
      }
      var full = lines[lineIndex];
      if (charIndex < full.length) {
        charIndex += 1;
        paint(full.slice(0, charIndex));
        timer = window.setTimeout(step, charDelay());
        return;
      }
      appendLine(full);
      paint("");
      lineIndex += 1;
      charIndex = 0;
      if (lineIndex >= lines.length) {
        finishIntro();
        return;
      }
      timer = window.setTimeout(function () {
        if (stopped || paused || introDone) {
          return;
        }
        showCaret();
        timer = window.setTimeout(step, charDelay());
      }, lineGap());
    }

    return {
      start: function () {
        if (stopped || paused || introDone) {
          return;
        }
        $("screen-welcome").setAttribute("data-intro", "typing");
        $("skip").hidden = false;
        showCaret();
        timer = window.setTimeout(step, charDelay());
      },
      pause: clearTimer,
      resume: function () {
        if (stopped || introDone) {
          return;
        }
        if (charIndex === 0 && lineIndex < lines.length) {
          showCaret();
        }
        step();
      },
      stop: function () {
        stopped = true;
        clearTimer();
        paint("");
      }
    };
  }

  function startTyping() {
    typing = createTyper();
    typing.start();
  }

  function playIntro() {
    var seen = window.HelloWorldStorage.hasSeenWelcome();
    if (reduceMotion || seen) {
      showAllLines();
      finishIntro();
      return;
    }
    if (paused) {
      pendingStart = true;
      $("skip").hidden = false;
      return;
    }
    startTyping();
  }

  function applyCopy() {
    document.title = copy.meta.documentTitle;
    $("draft-badge").textContent = copy.shell.draftBadge;
    $("draft-badge").hidden = false;
    $("pause-stop").textContent = copy.shell.pauseStop;
    $("pause-stop").hidden = false;
    $("skip-link").textContent = copy.shell.skipToContent;
    $("skip-link").hidden = false;
    $("welcome-title").textContent = copy.welcome.title;
    $("skip").textContent = copy.welcome.skip;
    $("begin").textContent = copy.welcome.begin;
    $("chat-log").setAttribute("aria-label", copy.welcome.introLabel);
    $("loading-bar").setAttribute("aria-label", copy.shell.loadingLabel);
    $("screen-welcome").hidden = false;
  }

  function showLoadNote(message) {
    var note = $("load-note");
    note.textContent = message || FALLBACK_LOAD_NOTE;
    note.hidden = false;
    document.title = "hello world companion";
  }

  function togglePause() {
    if (!copy) {
      return;
    }
    paused = !paused;
    document.documentElement.setAttribute("data-paused", paused ? "true" : "false");
    $("pause-stop").setAttribute("aria-pressed", paused ? "true" : "false");
    var note = $("pause-note");
    if (paused) {
      note.hidden = false;
      note.textContent = copy.shell.pausedNote;
      $("pause-stop").setAttribute("aria-describedby", "pause-note");
      if (typing) {
        typing.pause();
      }
      return;
    }
    $("pause-stop").removeAttribute("aria-describedby");
    note.hidden = true;
    note.textContent = "";
    if (introDone) {
      return;
    }
    if (pendingStart) {
      pendingStart = false;
      startTyping();
      return;
    }
    if (typing) {
      typing.resume();
    }
  }

  function onSkip() {
    if (introDone) {
      return;
    }
    pendingStart = false;
    if (typing) {
      typing.stop();
    }
    showAllLines();
    finishIntro();
    $("begin").focus();
  }

  function onBegin() {
    if (!copy) {
      return;
    }
    $("next-label").textContent = copy.nextPlaceholder.label;
    $("next-note").textContent = copy.nextPlaceholder.note;
    $("screen-next").hidden = false;
    $("begin").setAttribute("aria-expanded", "true");
    $("next-label").focus();
  }

  function bind() {
    $("pause-stop").addEventListener("click", togglePause);
    $("skip").addEventListener("click", onSkip);
    $("begin").addEventListener("click", onBegin);
    $("loading-fill").addEventListener("animationend", settleLoadingBar);
    motionQuery.addEventListener("change", function () {
      var wasReduced = reduceMotion;
      applyEnvironment();
      if (reduceMotion) {
        settleLoadingBar();
      }
      if (!wasReduced && reduceMotion && copy && !introDone) {
        pendingStart = false;
        if (typing) {
          typing.stop();
        }
        showAllLines();
        finishIntro();
      }
    });
  }

  function stringList(value) {
    return Array.isArray(value) && value.every(function (item) {
      return typeof item === "string" && item.length > 0;
    });
  }

  function validCopy(value) {
    if (!value || !value.meta || !value.shell || !value.welcome || !value.nextPlaceholder) {
      return false;
    }
    if (typeof value.meta.documentTitle !== "string") {
      return false;
    }
    if (!stringList(value.welcome.lines) || value.welcome.lines.length !== 3) {
      return false;
    }
    var shellKeys = ["draftBadge", "pauseStop", "pausedNote", "loadingLabel", "loadingValueText", "skipToContent"];
    var welcomeKeys = ["title", "introLabel", "skip", "begin"];
    var nextKeys = ["label", "note"];
    var i;
    for (i = 0; i < shellKeys.length; i += 1) {
      if (typeof value.shell[shellKeys[i]] !== "string") {
        return false;
      }
    }
    for (i = 0; i < welcomeKeys.length; i += 1) {
      if (typeof value.welcome[welcomeKeys[i]] !== "string") {
        return false;
      }
    }
    for (i = 0; i < nextKeys.length; i += 1) {
      if (typeof value.nextPlaceholder[nextKeys[i]] !== "string") {
        return false;
      }
    }
    return typeof value.loadNote === "string";
  }

  function validPrompts(value) {
    if (!Array.isArray(value) || value.length < 12) {
      return false;
    }
    var texts = [];
    var ok = value.every(function (item) {
      if (!item || typeof item.id !== "string" || typeof item.theme !== "string" || typeof item.text !== "string") {
        return false;
      }
      texts.push(item.text);
      return item.id.length > 0 && item.theme.length > 0 && item.text.length > 0;
    });
    if (!ok) {
      return false;
    }
    return REQUIRED_PROMPTS.every(function (prompt) {
      return texts.indexOf(prompt) !== -1;
    });
  }

  function validSoundscapes(value) {
    if (!Array.isArray(value) || value.length !== 4) {
      return false;
    }
    return value.every(function (item) {
      if (!item) {
        return false;
      }
      var fields = ["title", "file", "theme", "caption", "credit", "license"];
      return fields.every(function (field) {
        return typeof item[field] === "string" && item[field].length > 0;
      });
    });
  }

  function loadJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error("load");
      }
      return response.json();
    });
  }

  function start() {
    applyEnvironment();
    bind();
    if (reduceMotion) {
      settleLoadingBar();
    } else {
      window.setTimeout(function () {
        if (!barSettled) {
          settleLoadingBar();
        }
      }, 3200);
    }

    Promise.all([
      loadJson("content/copy.json"),
      loadJson("content/prompts.json"),
      loadJson("content/soundscapes.json")
    ]).then(function (loaded) {
      var nextCopy = loaded[0];
      var prompts = loaded[1];
      var soundscapes = loaded[2];
      if (!validCopy(nextCopy) || !validPrompts(prompts) || !validSoundscapes(soundscapes)) {
        showLoadNote(nextCopy && nextCopy.loadNote);
        return;
      }
      copy = nextCopy;
      lines = copy.welcome.lines.slice();
      applyCopy();
      if (reduceMotion || barSettled) {
        settleLoadingBar();
      }
      playIntro();
    }).catch(function () {
      showLoadNote(FALLBACK_LOAD_NOTE);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
