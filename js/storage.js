(function (global) {
  "use strict";

  var SETTINGS_KEY = "hello-world-companion.settings";
  var SEEN_KEY = "hello-world-companion.welcome-seen";
  var DRAWINGS_KEY = "hello-world-companion.drawings";
  var REFLECTION_KEY = "hello-world-companion.reflection";
  var RECEIVE_KEY = "hello-world-companion.receive";
  var TEXT_SIZES = ["small", "default", "large"];
  var SPEEDS = ["slow", "default", "fast"];

  function readJson(store, key) {
    try {
      var raw = store.getItem(key);
      if (!raw) {
        return null;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function writeJson(store, key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function normalize(raw) {
    var source = raw || {};
    return {
      textSize: TEXT_SIZES.indexOf(source.textSize) !== -1 ? source.textSize : "default",
      highContrast: source.highContrast === true,
      reduceMotion: source.reduceMotion === true,
      readingSpeed: SPEEDS.indexOf(source.readingSpeed) !== -1 ? source.readingSpeed : "default"
    };
  }

  function getSettings() {
    var saved = null;
    try {
      saved = readJson(global.localStorage, SETTINGS_KEY);
    } catch (err) {
      saved = null;
    }
    var settings = normalize(saved);
    if (saved === null) {
      try {
        writeJson(global.localStorage, SETTINGS_KEY, settings);
      } catch (err) {
        return settings;
      }
    }
    return settings;
  }

  function saveSettings(value) {
    var next = normalize(value);
    try {
      writeJson(global.localStorage, SETTINGS_KEY, next);
    } catch (err) {
      return next;
    }
    return next;
  }

  function isDrawing(item) {
    return Boolean(item) && typeof item.id === "string" && typeof item.createdAt === "number" && typeof item.theme === "string";
  }

  function getDrawings() {
    var saved = null;
    try {
      saved = readJson(global.localStorage, DRAWINGS_KEY);
    } catch (err) {
      saved = null;
    }
    if (!Array.isArray(saved)) {
      return [];
    }
    return saved.filter(isDrawing);
  }

  function saveDrawings(list) {
    var clean = Array.isArray(list) ? list.filter(isDrawing) : [];
    try {
      return writeJson(global.localStorage, DRAWINGS_KEY, clean);
    } catch (err) {
      return false;
    }
  }

  function getReflection() {
    var saved = null;
    try {
      saved = readJson(global.localStorage, REFLECTION_KEY);
    } catch (err) {
      saved = null;
    }
    if (!saved || typeof saved.text !== "string") {
      return "";
    }
    return saved.text;
  }

  function saveReflection(text) {
    try {
      return writeJson(global.localStorage, REFLECTION_KEY, {
        text: typeof text === "string" ? text : "",
        updatedAt: Date.now()
      });
    } catch (err) {
      return false;
    }
  }

  function getReceive() {
    var saved = null;
    try {
      saved = readJson(global.localStorage, RECEIVE_KEY);
    } catch (err) {
      saved = null;
    }
    if (!saved || typeof saved.drawingId !== "string") {
      return null;
    }
    return {
      drawingId: saved.drawingId,
      sampleId: typeof saved.sampleId === "string" ? saved.sampleId : "",
      choice: saved.choice === "sit" || saved.choice === "aside" ? saved.choice : ""
    };
  }

  function saveReceive(value) {
    var record = {
      drawingId: value && typeof value.drawingId === "string" ? value.drawingId : "",
      sampleId: value && typeof value.sampleId === "string" ? value.sampleId : "",
      choice: value && (value.choice === "sit" || value.choice === "aside") ? value.choice : ""
    };
    try {
      return writeJson(global.localStorage, RECEIVE_KEY, record);
    } catch (err) {
      return false;
    }
  }

  function hasSeenWelcome() {
    try {
      return global.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function markWelcomeSeen() {
    try {
      global.sessionStorage.setItem(SEEN_KEY, "1");
    } catch (err) {
      return;
    }
  }

  global.HelloWorldStorage = {
    getSettings: getSettings,
    saveSettings: saveSettings,
    hasSeenWelcome: hasSeenWelcome,
    markWelcomeSeen: markWelcomeSeen,
    getDrawings: getDrawings,
    saveDrawings: saveDrawings,
    getReflection: getReflection,
    saveReflection: saveReflection,
    getReceive: getReceive,
    saveReceive: saveReceive
  };
})(window);
