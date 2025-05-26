/**
 * @name StayInCall
 * @author headx
 * @version 1.0.0
 * @description Auto-updating BetterDiscord plugin that prevents being disconnected from solo calls. (headx | the psychon)
 * @source https://github.com/headxdev/StayInCall
 */

module.exports = class StayInCall {
  start() {
    const url = "https://raw.githubusercontent.com/headxdev/StayInCall/main/StayInCall.remote.js";
    const request = require("request");
    const fs = require("fs");
    const path = require("path");

    const pluginFile = path.join(BdApi.Plugins.folder, "StayInCall.remote.js");

    // Fetch latest version from GitHub
    request.get(url, (err, res, body) => {
      if (!err && res.statusCode === 200) {
        fs.writeFileSync(pluginFile, body);
        BdApi.showToast("StayInCall updated from GitHub ✔️", {type: "success"});

        // Dynamically load and execute
        try {
          eval(body);
        } catch (e) {
          BdApi.showToast("StayInCall execution error ❌", {type: "error"});
          console.error("[StayInCall] Eval error:", e);
        }
      } else {
        BdApi.showToast("Could not update StayInCall 😕", {type: "error"});
        console.warn("[StayInCall] Update failed. Using existing version.");
        if (fs.existsSync(pluginFile)) {
          try {
            const localCode = fs.readFileSync(pluginFile, "utf8");
            eval(localCode);
          } catch (e) {
            console.error("[StayInCall] Local fallback error:", e);
          }
        }
      }
    });
  }

  stop() {
    BdApi.showToast("StayInCall unloaded 💤", {type: "info"});
  }
};
