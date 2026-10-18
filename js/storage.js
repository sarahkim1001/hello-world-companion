(function (global) {
  "use strict";

  var SETTINGS_KEY = "hello-world-companion.settings";
  var SEEN_KEY = "hello-world-companion.welcome-seen";
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
    hasSeenWelcome: hasSeenWelcome,
    markWelcomeSeen: markWelcomeSeen
  };
})(window);
