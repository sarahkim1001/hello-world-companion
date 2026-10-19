(function () {
  "use strict";

  var copy = null;
  var prompts = [];
  var soundscapes = [];
  var samples = [];
  var getSettings = function () { return {}; };
  var getPaused = function () { return false; };
  var commitSettings = function () { return {}; };
  var showWelcome = function () {};
  var hideWelcome = function () {};

  var audio = new Audio();
  var resumeAudio = false;
  var canvas = null;
  var drawing = false;
  var undoStack = [];
  var canvasDirty = false;
  var activePointer = null;

  var current = "welcome";
  var returnTo = "welcome";
  var captionOpen = true;
  var promptListOpen = false;

  var eyesTimer = null;
  var eyesRunning = false;
  var eyesDone = false;
  var eyesLeftMs = 0;
  var eyesEndsAt = 0;

  var visit = {
    soundId: "",
    promptIndex: 0,
    theme: "",
    themeTouched: false,
    words: "",
    brush: "large",
    draftId: "",
    share: ""
  };

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (!attrs) {
      return node;
    }
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === undefined || value === null) {
        return;
      }
      if (key === "className") {
        node.className = value;
      } else if (key === "text") {
        node.textContent = value;
      } else if (key === "hidden") {
        node.hidden = Boolean(value);
      } else {
        node.setAttribute(key, value);
      }
    });
    return node;
  }

  function localPath(path, prefix) {
    if (typeof path !== "string") {
      return "";
    }
    if (path.indexOf("..") !== -1 || path.indexOf("://") !== -1 || path.indexOf("//") === 0) {
      return "";
    }
    if (path.indexOf(prefix) !== 0) {
      return "";
    }
    return path;
  }

  function fill(template, map) {
    if (window.HelloWorldWeek) {
      return window.HelloWorldWeek.fill(template, map);
    }
    return template;
  }

  function currentPrompt() {
    return prompts[visit.promptIndex] || prompts[0];
  }

  function findSound(id) {
    for (var i = 0; i < soundscapes.length; i += 1) {
      if (soundscapes[i].id === id) {
        return soundscapes[i];
      }
    }
    return null;
  }

  function button(id, text, className) {
    return el("button", {
      type: "button",
      id: id,
      className: className || "button",
      text: text
    });
  }

  function mount(screenName, node, focusId) {
    var root = $("screen-root");
    root.replaceChildren(node);
    root.hidden = false;
    root.setAttribute("data-screen", screenName);
    var target = focusId ? $(focusId) : null;
    if (!target) {
      target = $("flow-title");
    }
    if (target && typeof target.focus === "function") {
      target.focus();
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start" });
      }
    }
    var settingsButton = $("open-settings");
    if (settingsButton) {
      settingsButton.setAttribute("aria-pressed", screenName === "settings" ? "true" : "false");
    }
  }

  function statusNode(text) {
    return el("p", {
      id: "flow-status",
      className: "status",
      role: "status",
      text: text || ""
    });
  }

  function setStatus(text) {
    var node = $("flow-status");
    if (node) {
      node.textContent = text || "";
    }
  }

  function navRow(backName, continueName, continueLabel) {
    var row = el("div", { className: "actions" });
    if (backName) {
      var back = button("flow-back", copy.nav.back);
      back.addEventListener("click", function () {
        open(backName === "return" ? returnTo : backName);
      });
      row.appendChild(back);
    }
    if (continueName) {
      var next = button("flow-continue", continueLabel || copy.nav.continue);
      next.addEventListener("click", function () {
        if (continueName === "save-response") {
          saveResponse();
          return;
        }
        open(continueName);
      });
      row.appendChild(next);
    }
    return row;
  }

  function screenWrap(title, focusLater) {
    var wrap = el("div", {});
    var heading = el("h1", { id: "flow-title", tabindex: "-1", text: title });
    wrap.appendChild(heading);
    wrap.focusLater = focusLater;
    return wrap;
  }

  function stopAudio() {
    resumeAudio = false;
    audio.pause();
  }

  function holdEyes() {
    if (!eyesRunning) {
      return;
    }
    eyesLeftMs = Math.max(0, eyesEndsAt - Date.now());
    window.clearTimeout(eyesTimer);
    eyesTimer = null;
  }

  function eyesTick() {
    if (!eyesRunning || getPaused()) {
      return;
    }
    var left = eyesEndsAt - Date.now();
    if (left <= 0) {
      eyesLeftMs = 0;
      eyesRunning = false;
      eyesDone = true;
      paintEyes();
      setStatus(copy.eyes.done);
      return;
    }
    eyesLeftMs = left;
    paintEyes();
    eyesTimer = window.setTimeout(eyesTick, 250);
  }

  function releaseEyes() {
    if (!eyesRunning) {
      return;
    }
    eyesEndsAt = Date.now() + eyesLeftMs;
    window.clearTimeout(eyesTimer);
    eyesTick();
  }

  function eyesSeconds() {
    var speed = getSettings().readingSpeed;
    if (speed === "slow") {
      return 40;
    }
    if (speed === "fast") {
      return 15;
    }
    return 25;
  }

  function paintEyes() {
    var count = $("eyes-count");
    var unit = $("eyes-unit");
    var done = $("eyes-done");
    var start = $("eyes-start");
    var shown = eyesRunning || eyesDone ? Math.ceil(eyesLeftMs / 1000) : eyesSeconds();
    if (count) {
      count.textContent = String(shown);
    }
    if (unit) {
      unit.textContent = eyesRunning || eyesDone ? copy.eyes.secondsLeft : copy.eyes.seconds;
    }
    if (done) {
      done.hidden = !eyesDone;
    }
    if (start) {
      start.textContent = eyesDone || eyesRunning ? copy.eyes.again : copy.eyes.start;
    }
  }

  function startEyes() {
    if (getPaused()) {
      return;
    }
    eyesDone = false;
    eyesLeftMs = eyesSeconds() * 1000;
    eyesEndsAt = Date.now() + eyesLeftMs;
    eyesRunning = true;
    window.clearTimeout(eyesTimer);
    paintEyes();
    setStatus(copy.eyes.started);
    eyesTick();
  }

  function paperColor() {
    return "#fffdf8";
  }

  function inkColor() {
    var color = window.getComputedStyle(document.body).color;
    return color || "#161513";
  }

  function prepareCanvas() {
    canvas = el("canvas", {
      id: "draw-canvas",
      className: "draw-canvas",
      "aria-label": "draw"
    });
    canvas.width = 900;
    canvas.height = 560;
    clearCanvasBitmap();
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function clearCanvasBitmap() {
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = paperColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function pointerPos(event) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = rect.width ? canvas.width / rect.width : 1;
    var scaleY = rect.height ? canvas.height / rect.height : 1;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  function pushUndo() {
    try {
      undoStack.push(canvas.toDataURL("image/png"));
    } catch (err) {
      return;
    }
    if (undoStack.length > 20) {
      undoStack.shift();
    }
  }

  function drawStored(url) {
    var img = new Image();
    img.onload = function () {
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = paperColor();
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = url;
  }

  function undo() {
    if (!undoStack.length) {
      setStatus(copy.respond.nothingToUndo);
      return;
    }
    var url = undoStack.pop();
    drawStored(url);
    if (!undoStack.length) {
      canvasDirty = false;
    }
    setStatus(copy.respond.undone);
  }

  function onPointerDown(event) {
    if (!canvas || event.button > 0) {
      return;
    }
    event.preventDefault();
    pushUndo();
    drawing = true;
    activePointer = event.pointerId;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (err) {
      // The stroke still follows the pointer when capture is unavailable.
    }
    var ctx = canvas.getContext("2d");
    var point = pointerPos(event);
    ctx.strokeStyle = inkColor();
    ctx.lineWidth = visit.brush === "larger" ? 56 : 36;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + 0.01, point.y + 0.01);
    ctx.stroke();
    canvasDirty = true;
  }

  function onPointerMove(event) {
    if (!drawing || event.pointerId !== activePointer) {
      return;
    }
    event.preventDefault();
    var ctx = canvas.getContext("2d");
    var point = pointerPos(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function onPointerUp(event) {
    if (!drawing || (activePointer !== null && event.pointerId !== activePointer)) {
      return;
    }
    drawing = false;
    activePointer = null;
  }

  function addPhoto(file) {
    if (!file || file.type.indexOf("image/") !== 0) {
      setStatus(copy.respond.photoType);
      return;
    }
    if (file.size > 8000000) {
      setStatus(copy.respond.photoLarge);
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        pushUndo();
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = paperColor();
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        var width = img.width * scale;
        var height = img.height * scale;
        ctx.drawImage(img, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        canvasDirty = true;
        setStatus(copy.respond.photoAdded);
      };
      img.onerror = function () {
        setStatus(copy.respond.photoType);
      };
      img.src = String(reader.result);
    };
    reader.onerror = function () {
      setStatus(copy.respond.photoType);
    };
    reader.readAsDataURL(file);
  }

  function cleanTag(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 40);
  }

  function knownThemes() {
    var seen = {};
    var list = [];
    prompts.forEach(function (item) {
      if (item.theme && !seen[item.theme]) {
        seen[item.theme] = true;
        list.push(item.theme);
      }
    });
    return list;
  }

  function canvasImage() {
    if (!canvasDirty) {
      return "";
    }
    try {
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch (err) {
      return "";
    }
  }

  function upsertDrawing(record) {
    var list = window.HelloWorldStorage.getDrawings().filter(function (item) {
      return item.id !== record.id;
    });
    list.push(record);
    return window.HelloWorldStorage.saveDrawings(list);
  }

  function saveResponse() {
    var theme = cleanTag(visit.theme);
    if (!theme) {
      setStatus(copy.respond.needTag);
      var field = $("theme-input");
      if (field) {
        field.focus();
      }
      return;
    }
    visit.theme = theme;
    if (!visit.draftId) {
      visit.draftId = "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    }
    var prompt = currentPrompt();
    var record = {
      id: visit.draftId,
      createdAt: Date.now(),
      promptId: prompt ? prompt.id : "",
      promptText: prompt ? prompt.text : "",
      soundId: visit.soundId || "",
      theme: theme,
      words: visit.words || "",
      image: canvasImage(),
      share: visit.share || ""
    };
    var existing = window.HelloWorldStorage.getDrawings().filter(function (item) {
      return item.id === record.id;
    })[0];
    if (existing) {
      record.createdAt = existing.createdAt;
      if (!record.share) {
        record.share = existing.share || "";
      }
    }
    if (!record.image && record.share === "leave") {
      record.share = "";
      visit.share = "";
    }
    if (!upsertDrawing(record)) {
      setStatus(copy.respond.saveFailed);
      return;
    }
    open("save");
  }

  function renderSound(focusId) {
    var wrap = screenWrap(copy.sound.title);
    wrap.appendChild(el("p", { className: "note", text: copy.sound.driving }));
    var field = el("fieldset", {});
    field.appendChild(el("legend", { text: copy.sound.legend }));
    soundscapes.forEach(function (item) {
      var label = el("label", { className: "choice" });
      var input = el("input", { type: "radio", name: "sound", value: item.id, id: "sound-" + item.id });
      if (visit.soundId === item.id) {
        input.checked = true;
      }
      input.addEventListener("change", function () {
        stopAudio();
        visit.soundId = item.id;
        renderSound("sound-" + item.id);
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(item.title));
      field.appendChild(label);
    });
    wrap.appendChild(field);

    var selected = findSound(visit.soundId);
    var actions = el("div", { className: "actions" });
    var play = button("sound-play", copy.sound.play);
    play.addEventListener("click", function () {
      var item = findSound(visit.soundId);
      if (!item) {
        setStatus(copy.sound.needChoice);
        return;
      }
      if (getPaused()) {
        return;
      }
      var src = localPath(item.file, "audio/");
      if (!src) {
        setStatus(copy.sound.playFailed);
        return;
      }
      audio.src = src;
      resumeAudio = false;
      audio.play().then(function () {
        setStatus(copy.sound.playing);
      }).catch(function () {
        setStatus(copy.sound.playFailed);
      });
    });
    var stop = button("sound-stop", copy.sound.stopSound);
    stop.addEventListener("click", function () {
      stopAudio();
      setStatus(copy.sound.stopped);
    });
    var captionButton = button("sound-caption", captionOpen ? copy.sound.hideCaption : copy.sound.showCaption);
    captionButton.setAttribute("aria-pressed", captionOpen ? "true" : "false");
    captionButton.addEventListener("click", function () {
      captionOpen = !captionOpen;
      renderSound("sound-caption");
    });
    actions.appendChild(play);
    actions.appendChild(stop);
    actions.appendChild(captionButton);
    wrap.appendChild(actions);

    var caption = el("div", { id: "sound-transcript", hidden: !captionOpen || !selected });
    if (selected) {
      caption.appendChild(el("h2", { text: copy.sound.captionLabel }));
      caption.appendChild(el("p", { text: selected.caption }));
      caption.appendChild(el("p", { text: copy.sound.creditLabel + ": " + selected.credit }));
      caption.appendChild(el("p", { text: copy.sound.licenseLabel + ": " + selected.license }));
    }
    wrap.appendChild(caption);
    wrap.appendChild(statusNode(""));
    wrap.appendChild(navRow("welcome", "prompt"));
    mount("sound", wrap, focusId);
  }

  function renderPrompt(focusId) {
    var prompt = currentPrompt();
    var wrap = screenWrap(copy.prompt.title);
    var quote = el("p", {
      id: "prompt-text",
      className: "prompt-text",
      "aria-live": "polite",
      text: prompt ? prompt.text : ""
    });
    wrap.appendChild(quote);
    var actions = el("div", { className: "actions" });
    var another = button("prompt-another", copy.prompt.another);
    another.addEventListener("click", function () {
      visit.promptIndex = (visit.promptIndex + 1) % prompts.length;
      if (!visit.themeTouched) {
        visit.theme = currentPrompt().theme;
      }
      renderPrompt("prompt-another");
    });
    var choose = button("prompt-choose", copy.prompt.chooseForMe);
    choose.addEventListener("click", function () {
      if (prompts.length > 1) {
        var nextIndex = visit.promptIndex;
        var guard = 0;
        while (nextIndex === visit.promptIndex && guard < 8) {
          nextIndex = Math.floor(Math.random() * prompts.length);
          guard += 1;
        }
        visit.promptIndex = nextIndex;
      }
      if (!visit.themeTouched) {
        visit.theme = currentPrompt().theme;
      }
      renderPrompt("prompt-choose");
    });
    var mine = button("prompt-mine", copy.prompt.illChoose);
    mine.setAttribute("aria-expanded", promptListOpen ? "true" : "false");
    mine.addEventListener("click", function () {
      promptListOpen = true;
      renderPrompt("prompt-mine");
    });
    actions.appendChild(another);
    actions.appendChild(choose);
    actions.appendChild(mine);
    wrap.appendChild(actions);
    if (promptListOpen) {
      var listLabel = el("h2", { id: "prompt-list-label", text: copy.prompt.listLabel });
      var list = el("div", { className: "stack", role: "group", "aria-labelledby": "prompt-list-label" });
      wrap.appendChild(listLabel);
      prompts.forEach(function (item, index) {
        var choice = button("prompt-" + item.id, item.text);
        if (index === visit.promptIndex) {
          choice.setAttribute("aria-pressed", "true");
        }
        choice.addEventListener("click", function () {
          visit.promptIndex = index;
          if (!visit.themeTouched) {
            visit.theme = item.theme;
          }
          renderPrompt("prompt-" + item.id);
        });
        list.appendChild(choice);
      });
      wrap.appendChild(list);
    }
    wrap.appendChild(statusNode(""));
    wrap.appendChild(navRow("sound", "eyes"));
    mount("prompt", wrap, focusId);
  }

  function renderEyes(focusId) {
    var wrap = screenWrap(copy.eyes.title);
    wrap.appendChild(el("p", { text: copy.eyes.note }));
    var time = el("p", { className: "timer-readout" });
    time.appendChild(el("span", { id: "eyes-count", text: String(eyesSeconds()) }));
    time.appendChild(document.createTextNode(" "));
    time.appendChild(el("span", { id: "eyes-unit", text: copy.eyes.seconds }));
    wrap.appendChild(time);
    var done = el("p", { id: "eyes-done", text: copy.eyes.done, hidden: !eyesDone });
    wrap.appendChild(done);
    var actions = el("div", { className: "actions" });
    var start = button("eyes-start", eyesDone || eyesRunning ? copy.eyes.again : copy.eyes.start);
    start.addEventListener("click", startEyes);
    actions.appendChild(start);
    wrap.appendChild(actions);
    wrap.appendChild(statusNode(""));
    wrap.appendChild(navRow("prompt", "respond"));
    mount("eyes", wrap, focusId);
    paintEyes();
  }

  function renderRespond(focusId) {
    if (!visit.themeTouched) {
      visit.theme = currentPrompt().theme;
    }
    canvas.setAttribute("aria-label", copy.respond.drawLabel);
    var wrap = screenWrap(copy.respond.title);
    wrap.appendChild(el("h2", { text: copy.respond.drawLabel }));
    wrap.appendChild(el("p", { text: copy.respond.drawHelp }));
    wrap.appendChild(canvas);
    var tools = el("div", { className: "actions" });
    var brush = button("brush-large", copy.respond.brush);
    brush.setAttribute("aria-pressed", visit.brush === "large" ? "true" : "false");
    brush.addEventListener("click", function () {
      visit.brush = "large";
      renderRespond("brush-large");
    });
    var larger = button("brush-larger", copy.respond.largerBrush);
    larger.setAttribute("aria-pressed", visit.brush === "larger" ? "true" : "false");
    larger.addEventListener("click", function () {
      visit.brush = "larger";
      renderRespond("brush-larger");
    });
    var undoButton = button("draw-undo", copy.respond.undo);
    undoButton.addEventListener("click", undo);
    tools.appendChild(brush);
    tools.appendChild(larger);
    tools.appendChild(undoButton);
    wrap.appendChild(tools);

    wrap.appendChild(el("h2", { id: "photo-label", text: copy.respond.photoLabel }));
    wrap.appendChild(el("p", { text: copy.respond.photoHelp }));
    var photo = el("input", {
      id: "photo-input",
      className: "file-input",
      type: "file",
      accept: "image/*",
      "aria-labelledby": "photo-label"
    });
    photo.addEventListener("change", function () {
      var file = photo.files && photo.files[0];
      if (file) {
        addPhoto(file);
      }
    });
    wrap.appendChild(photo);

    wrap.appendChild(el("h2", { id: "words-label", text: copy.respond.wordsLabel }));
    wrap.appendChild(el("p", { text: copy.respond.wordsHint }));
    var words = el("textarea", { id: "words-input", "aria-labelledby": "words-label", maxlength: "2000" });
    words.value = visit.words;
    words.addEventListener("input", function () {
      visit.words = words.value;
    });
    wrap.appendChild(words);

    wrap.appendChild(el("h2", { id: "theme-label", text: copy.respond.themeLabel }));
    wrap.appendChild(el("p", { text: copy.respond.themeHelp }));
    var theme = el("input", {
      id: "theme-input",
      type: "text",
      "aria-labelledby": "theme-label",
      maxlength: "40",
      autocomplete: "off"
    });
    theme.value = visit.theme;
    theme.addEventListener("input", function () {
      visit.themeTouched = true;
      visit.theme = theme.value;
    });
    wrap.appendChild(theme);
    var tags = el("div", { className: "actions" });
    knownThemes().forEach(function (tag) {
      var tagButton = button("tag-" + tag, tag);
      if (cleanTag(visit.theme) === tag) {
        tagButton.setAttribute("aria-pressed", "true");
      }
      tagButton.addEventListener("click", function () {
        visit.themeTouched = true;
        visit.theme = tag;
        renderRespond("tag-" + tag);
      });
      tags.appendChild(tagButton);
    });
    wrap.appendChild(tags);
    var useTag = button("use-tag", copy.respond.useTag);
    useTag.addEventListener("click", function () {
      visit.themeTouched = true;
      visit.theme = cleanTag($("theme-input").value);
      if (!visit.theme) {
        setStatus(copy.respond.needTag);
        return;
      }
      setStatus(fill(copy.respond.tagSet, { theme: visit.theme }));
    });
    wrap.appendChild(useTag);
    wrap.appendChild(statusNode(""));
    wrap.appendChild(navRow("eyes", "save-response"));
    mount("respond", wrap, focusId);
  }

  function currentDraft() {
    return window.HelloWorldStorage.getDrawings().filter(function (item) {
      return item.id === visit.draftId;
    })[0] || null;
  }

  function renderSave(focusId) {
    var draft = currentDraft();
    var wrap = screenWrap(copy.save.title);
    if (!draft) {
      wrap.appendChild(el("p", { text: copy.save.missing }));
      wrap.appendChild(navRow("respond", ""));
      mount("save", wrap, focusId);
      return;
    }
    visit.share = draft.share || "";
    wrap.appendChild(el("h2", { text: copy.save.previewLabel }));
    if (draft.image) {
      var image = el("img", {
        className: "preview-image",
        alt: copy.gallery.drawingAlt,
        src: draft.image
      });
      wrap.appendChild(image);
    } else {
      wrap.appendChild(el("p", { text: copy.save.noPreview }));
    }
    if (draft.words) {
      wrap.appendChild(el("h2", { text: copy.gallery.wordsLabel }));
      wrap.appendChild(el("p", { text: draft.words }));
    }
    wrap.appendChild(el("p", { text: copy.save.wordsPrivate }));
    wrap.appendChild(el("p", { className: "note", text: copy.save.shareRule }));
    var pair = el("div", { className: "pair" });
    var leave = button("choice-leave", copy.save.leave);
    var keep = button("choice-keep", copy.save.keep);
    leave.setAttribute("aria-pressed", visit.share === "leave" ? "true" : "false");
    keep.setAttribute("aria-pressed", visit.share === "keep" ? "true" : "false");
    leave.addEventListener("click", function () {
      chooseShare("leave");
    });
    keep.addEventListener("click", function () {
      chooseShare("keep");
    });
    pair.appendChild(leave);
    pair.appendChild(keep);
    wrap.appendChild(pair);
    var message = copy.save.noneYet;
    if (visit.share === "leave") {
      message = draft.image ? copy.save.leftNote : copy.save.noDrawingLeave;
    } else if (visit.share === "keep") {
      message = copy.save.keptNote;
    }
    wrap.appendChild(statusNode(message));
    wrap.appendChild(navRow("respond", "gallery"));
    mount("save", wrap, focusId);
  }

  function chooseShare(choice) {
    var draft = currentDraft();
    if (!draft) {
      setStatus(copy.save.missing);
      return;
    }
    if (choice === "leave" && !draft.image) {
      draft.share = "";
      visit.share = "";
      upsertDrawing(draft);
      renderSave("choice-leave");
      setStatus(copy.save.noDrawingLeave);
      return;
    }
    draft.share = choice;
    visit.share = choice;
    if (!upsertDrawing(draft)) {
      setStatus(copy.respond.saveFailed);
      return;
    }
    renderSave(choice === "leave" ? "choice-leave" : "choice-keep");
  }

  function renderGallery(focusId) {
    var wrap = screenWrap(copy.gallery.title);
    var list = window.HelloWorldStorage.getDrawings().slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
    if (!list.length) {
      wrap.appendChild(el("p", { text: copy.gallery.empty }));
    }
    list.forEach(function (item) {
      var article = el("article", { className: "gallery-item" });
      var heading = el("h2", { id: "drawing-" + item.id, tabindex: "-1", text: copy.gallery.tagLabel + ": " + item.theme });
      article.appendChild(heading);
      if (item.image) {
        article.appendChild(el("img", {
          className: "preview-image",
          alt: copy.gallery.drawingAlt,
          src: item.image
        }));
      }
      var shareText = copy.gallery.unspecified;
      if (item.share === "leave") {
        shareText = copy.gallery.left;
      } else if (item.share === "keep") {
        shareText = copy.gallery.taken;
      }
      article.appendChild(el("p", { text: shareText }));
      if (item.words) {
        article.appendChild(el("h3", { text: copy.gallery.wordsLabel }));
        article.appendChild(el("p", { text: item.words }));
      }
      if (item.share === "leave") {
        var take = button("take-" + item.id, copy.gallery.takeBack);
        take.addEventListener("click", function () {
          item.share = "keep";
          if (item.id === visit.draftId) {
            visit.share = "keep";
          }
          if (!upsertDrawing(item)) {
            setStatus(copy.respond.saveFailed);
            return;
          }
          renderGallery("drawing-" + item.id);
        });
        article.appendChild(take);
      }
      wrap.appendChild(article);
    });
    wrap.appendChild(statusNode(""));
    wrap.appendChild(navRow("save", "week"));
    mount("gallery", wrap, focusId);
  }

  function renderWeek(focusId) {
    var wrap = screenWrap(copy.week.title);
    var summary = window.HelloWorldWeek.countThemes(window.HelloWorldStorage.getDrawings(), Date.now());
    var lines = window.HelloWorldWeek.phraseCounts(copy.week, summary);
    if (!lines.length) {
      wrap.appendChild(el("p", { text: copy.week.empty }));
    } else {
      var counts = el("ul", { className: "count-list" });
      lines.forEach(function (line) {
        counts.appendChild(el("li", { text: line }));
      });
      wrap.appendChild(counts);
    }
    wrap.appendChild(el("h2", { text: copy.week.question }));
    var label = el("label", { className: "field", for: "week-note", text: copy.week.reflectionLabel });
    var note = el("textarea", { id: "week-note" });
    note.value = window.HelloWorldStorage.getReflection();
    note.addEventListener("input", function () {
      window.HelloWorldStorage.saveReflection(note.value);
    });
    wrap.appendChild(label);
    wrap.appendChild(note);
    wrap.appendChild(statusNode(""));
    wrap.appendChild(navRow("gallery", "receive"));
    mount("week", wrap, focusId);
  }

  function latestLeft() {
    var list = window.HelloWorldStorage.getDrawings().filter(function (item) {
      return item.share === "leave" && item.image;
    });
    list.sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
    return list[0] || null;
  }

  function matchSample(theme) {
    var wanted = String(theme || "").trim();
    for (var i = 0; i < samples.length; i += 1) {
      if (String(samples[i].theme).trim() === wanted) {
        return samples[i];
      }
    }
    return null;
  }

  function renderReceive(focusId) {
    var wrap = screenWrap(copy.receive.title);
    wrap.appendChild(el("p", { text: copy.receive.intro }));
    var left = latestLeft();
    if (!left) {
      wrap.appendChild(el("p", { text: copy.receive.noneLeft }));
    } else {
      var sample = matchSample(left.theme);
      if (!sample) {
        wrap.appendChild(el("p", { text: fill(copy.receive.noMatch, { theme: left.theme }) }));
      } else {
        var stored = window.HelloWorldStorage.getReceive();
        var choice = stored && stored.drawingId === left.id && stored.sampleId === sample.id ? stored.choice : "";
        wrap.appendChild(el("h2", { text: copy.receive.sampleLabel }));
        wrap.appendChild(el("p", { text: sample.title }));
        wrap.appendChild(el("p", { text: copy.gallery.tagLabel + ": " + sample.theme }));
        var pair = el("div", { className: "pair" });
        var sit = button("receive-sit", copy.receive.sit);
        var aside = button("receive-aside", copy.receive.notToday);
        sit.setAttribute("aria-pressed", choice === "sit" ? "true" : "false");
        aside.setAttribute("aria-pressed", choice === "aside" ? "true" : "false");
        sit.addEventListener("click", function () {
          window.HelloWorldStorage.saveReceive({ drawingId: left.id, sampleId: sample.id, choice: "sit" });
          renderReceive("receive-sit");
        });
        aside.addEventListener("click", function () {
          window.HelloWorldStorage.saveReceive({ drawingId: left.id, sampleId: sample.id, choice: "aside" });
          renderReceive("receive-aside");
        });
        pair.appendChild(sit);
        pair.appendChild(aside);
        wrap.appendChild(pair);
        var src = localPath(sample.file, "content/samples/");
        if (choice === "sit" && src) {
          wrap.appendChild(el("img", {
            className: "preview-image",
            alt: copy.receive.sampleAlt,
            src: src
          }));
          wrap.appendChild(statusNode(copy.receive.sitting));
        } else if (choice === "aside") {
          wrap.appendChild(statusNode(copy.receive.aside));
          var show = button("receive-show", copy.receive.showAgain);
          show.addEventListener("click", function () {
            window.HelloWorldStorage.saveReceive({ drawingId: left.id, sampleId: sample.id, choice: "sit" });
            renderReceive("receive-show");
          });
          wrap.appendChild(show);
        } else {
          wrap.appendChild(statusNode(""));
        }
      }
    }
    wrap.appendChild(el("p", { text: copy.receive.endNote }));
    wrap.appendChild(navRow("week", "settings"));
    mount("receive", wrap, focusId);
  }

  function sizeWord() {
    var size = getSettings().textSize;
    if (size === "small") {
      return copy.settings.sizeSmall;
    }
    if (size === "large") {
      return copy.settings.sizeLarge;
    }
    return copy.settings.sizeDefault;
  }

  function renderSettings(focusId) {
    var settings = getSettings();
    var wrap = screenWrap(copy.settings.title);
    wrap.appendChild(el("h2", { id: "text-size-label", text: copy.settings.textSize }));
    var sizeRow = el("div", { className: "actions" });
    var smaller = button("text-smaller", copy.settings.smallerMark);
    smaller.setAttribute("aria-label", copy.settings.smaller);
    var larger = button("text-larger", copy.settings.largerMark);
    larger.setAttribute("aria-label", copy.settings.larger);
    smaller.addEventListener("click", function () {
      stepText(-1);
    });
    larger.addEventListener("click", function () {
      stepText(1);
    });
    sizeRow.appendChild(smaller);
    sizeRow.appendChild(larger);
    wrap.appendChild(sizeRow);
    wrap.appendChild(el("p", {
      id: "text-size-status",
      role: "status",
      text: fill(copy.settings.sizeStatus, { size: sizeWord() })
    }));

    var contrast = button("toggle-contrast", copy.settings.contrast);
    contrast.setAttribute("aria-pressed", settings.highContrast ? "true" : "false");
    contrast.addEventListener("click", function () {
      commitSettings({ highContrast: !getSettings().highContrast });
      renderSettings("toggle-contrast");
    });
    wrap.appendChild(el("h2", { text: copy.settings.contrast }));
    wrap.appendChild(contrast);
    wrap.appendChild(el("p", { text: settings.highContrast ? copy.settings.on : copy.settings.off }));

    var motion = button("toggle-motion", copy.settings.motion);
    motion.setAttribute("aria-pressed", settings.reduceMotion ? "true" : "false");
    motion.addEventListener("click", function () {
      commitSettings({ reduceMotion: !getSettings().reduceMotion });
      renderSettings("toggle-motion");
    });
    wrap.appendChild(el("h2", { text: copy.settings.motion }));
    wrap.appendChild(motion);
    wrap.appendChild(el("p", { text: settings.reduceMotion ? copy.settings.on : copy.settings.off }));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrap.appendChild(el("p", { text: copy.settings.motionDevice }));
    }

    wrap.appendChild(el("h2", { id: "speed-label", text: copy.settings.speed }));
    var speeds = el("div", { className: "actions", role: "group", "aria-labelledby": "speed-label" });
    [
      ["slow", copy.settings.speedSlow],
      ["default", copy.settings.speedDefault],
      ["fast", copy.settings.speedFast]
    ].forEach(function (item) {
      var speedButton = button("speed-" + item[0], item[1]);
      speedButton.setAttribute("aria-pressed", settings.readingSpeed === item[0] ? "true" : "false");
      speedButton.addEventListener("click", function () {
        commitSettings({ readingSpeed: item[0] });
        renderSettings("speed-" + item[0]);
      });
      speeds.appendChild(speedButton);
    });
    wrap.appendChild(speeds);
    wrap.appendChild(navRow("return", ""));
    mount("settings", wrap, focusId);
  }

  function stepText(delta) {
    var order = ["small", "default", "large"];
    var index = order.indexOf(getSettings().textSize);
    if (index < 0) {
      index = 1;
    }
    var next = order[Math.max(0, Math.min(order.length - 1, index + delta))];
    commitSettings({ textSize: next });
    renderSettings(delta < 0 ? "text-smaller" : "text-larger");
  }

  function renderCurrent(focusHeading) {
    var focusId = focusHeading ? "flow-title" : "";
    if (current === "sound") {
      renderSound(focusId);
    } else if (current === "prompt") {
      renderPrompt(focusId);
    } else if (current === "eyes") {
      renderEyes(focusId);
    } else if (current === "respond") {
      renderRespond(focusId);
    } else if (current === "save") {
      renderSave(focusId);
    } else if (current === "gallery") {
      renderGallery(focusId);
    } else if (current === "week") {
      renderWeek(focusId);
    } else if (current === "receive") {
      renderReceive(focusId);
    } else if (current === "settings") {
      renderSettings(focusId);
    }
  }

  function open(name) {
    if (name !== "sound") {
      stopAudio();
    }
    if (name === "settings") {
      if (current !== "settings") {
        returnTo = current;
      }
    }
    current = name;
    if (name === "welcome") {
      var root = $("screen-root");
      if (root) {
        root.hidden = true;
        root.setAttribute("data-screen", "welcome");
      }
      var settingsButton = $("open-settings");
      if (settingsButton) {
        settingsButton.setAttribute("aria-pressed", "false");
      }
      showWelcome();
      return;
    }
    hideWelcome();
    renderCurrent(true);
  }

  function setPaused(isPaused) {
    if (isPaused) {
      if (!audio.paused && audio.currentTime > 0 && !audio.ended) {
        resumeAudio = true;
        audio.pause();
      }
      holdEyes();
      return;
    }
    if (resumeAudio && current === "sound") {
      resumeAudio = false;
      audio.play().catch(function () {
        setStatus(copy.sound.playFailed);
      });
    }
    releaseEyes();
  }

  function init(options) {
    copy = options.copy;
    prompts = options.prompts;
    soundscapes = options.soundscapes;
    samples = options.samples;
    getSettings = options.getSettings;
    getPaused = options.getPaused;
    commitSettings = options.commitSettings;
    showWelcome = options.showWelcome;
    hideWelcome = options.hideWelcome;
    if (!canvas) {
      prepareCanvas();
    }
    canvas.setAttribute("aria-label", copy.respond.drawLabel);
  }

  window.HelloWorldFlow = {
    init: init,
    open: open,
    setPaused: setPaused
  };
})();
