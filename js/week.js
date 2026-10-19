(function (global) {
  "use strict";

  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  function fill(template, map) {
    return String(template).replace(/\{(theme|count|total|size)\}/g, function (_match, key) {
      if (!map || !Object.prototype.hasOwnProperty.call(map, key)) {
        return "";
      }
      return String(map[key]);
    });
  }

  function countThemes(drawings, now) {
    var list = Array.isArray(drawings) ? drawings : [];
    var moment = typeof now === "number" ? now : Date.now();
    var recent = list.filter(function (item) {
      return item && typeof item.createdAt === "number" && moment - item.createdAt <= WEEK_MS && moment - item.createdAt >= 0;
    });
    var tagged = recent.filter(function (item) {
      return typeof item.theme === "string" && item.theme.trim().length > 0;
    });
    var groups = {};
    var order = [];
    tagged.forEach(function (item) {
      var theme = item.theme.trim();
      if (!groups[theme]) {
        groups[theme] = { theme: theme, count: 0 };
        order.push(theme);
      }
      groups[theme].count += 1;
    });
    order.sort(function (a, b) {
      if (groups[b].count !== groups[a].count) {
        return groups[b].count - groups[a].count;
      }
      return a < b ? -1 : a > b ? 1 : 0;
    });
    return {
      total: tagged.length,
      counts: order.map(function (theme) {
        return groups[theme];
      })
    };
  }

  function phraseCounts(templates, summary) {
    var many = templates && templates.countMany;
    var one = templates && templates.countOne;
    if (!summary || !summary.counts || summary.total < 1 || typeof many !== "string") {
      return [];
    }
    return summary.counts.map(function (item) {
      var template = summary.total === 1 && typeof one === "string" ? one : many;
      return fill(template, {
        theme: item.theme,
        count: item.count,
        total: summary.total
      });
    });
  }

  global.HelloWorldWeek = {
    countThemes: countThemes,
    phraseCounts: phraseCounts,
    fill: fill
  };
})(typeof window === "undefined" ? global : window);
