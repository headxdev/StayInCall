/**
 * @name StayInCall
 * @author headx
 * @version 1.3.0
 * @description Auto-updating BetterDiscord plugin that keeps you connected in solo and private calls by auto-reconnecting if disconnected. (headx | the psychon)
 * @source https://github.com/headxdev/StayInCall
 */

module.exports = class StayInCall {
  start() {
    const url = "https://raw.githubusercontent.com/headxdev/StayInCall/main/StayInCall.remote.js";
    const request = require("request");
    const fs = require("fs");
    const path = require("path");

    const pluginFile = path.join(BdApi.Plugins.folder, "StayInCall.remote.js");

    this.keepAliveInterval = null;
    this.reconnectInterval = null;

    // Module holen
    const RTCModule = BdApi.WebpackModules.getByProps("getRTCConnection");
    const VoiceModule = BdApi.WebpackModules.getByProps("joinVoiceChannel", "leaveVoiceChannel");
    const SelectedChannelStore = BdApi.WebpackModules.getByProps("getVoiceChannelId");
    const VoiceStateStore = BdApi.WebpackModules.getByProps("getVoiceStatesForChannel");
    const UserModule = BdApi.WebpackModules.getByProps("getCurrentUser");

    // Hilfsfunktion: Ermittle aktuellen Voice-Channel, auch privat
    this.getCurrentVoiceChannelId = () => {
      // Zuerst normaler Channel (öffentliche/große)
      let channelId = SelectedChannelStore.getVoiceChannelId();

      if (channelId) return channelId;

      // Wenn kein normaler Channel gefunden, suche in privaten Calls
      // Suche Channels, in denen du drin bist (VoiceStateStore enthält alle States pro Channel)
      const voiceStates = VoiceStateStore.getVoiceStatesForChannel();
      if (!voiceStates) return null;

      const userId = UserModule.getCurrentUser().id;

      for (const [chanId, states] of Object.entries(voiceStates)) {
        if (states.some(state => state.userId === userId)) {
          return chanId;
        }
      }

      return null;
    };

    // Funktion um neu beizutreten
    const reconnectToCall = () => {
      const voiceChannelId = this.getCurrentVoiceChannelId();

      if (!voiceChannelId) {
        console.warn("[StayInCall] Kein Voice-Channel zum Reconnect gefunden.");
        return;
      }

      try {
        console.log(`[StayInCall] Rejoin Call Channel-ID: ${voiceChannelId}`);
        VoiceModule.joinVoiceChannel({ channelId: voiceChannelId, selfMute: false, selfDeaf: false });
        BdApi.showToast("StayInCall: Erfolgreich neu verbunden 🔁", { type: "info" });
      } catch (e) {
        console.error("[StayInCall] Fehler beim Reconnect:", e);
      }
    };

    // Auto-Update vom GitHub-Remote-Code
    request.get(url, (err, res, body) => {
      if (!err && res.statusCode === 200) {
        fs.writeFileSync(pluginFile, body);
        BdApi.showToast("StayInCall von GitHub aktualisiert ✔️", { type: "success" });

        try {
          eval(body);
        } catch (e) {
          BdApi.showToast("StayInCall Ausführungsfehler ❌", { type: "error" });
          console.error("[StayInCall] Eval-Fehler:", e);
        }
      } else {
        BdApi.showToast("StayInCall konnte nicht aktualisiert werden 😕", { type: "error" });
        console.warn("[StayInCall] Update fehlgeschlagen. Nutze lokale Version.");

        if (fs.existsSync(pluginFile)) {
          try {
            const localCode = fs.readFileSync(pluginFile, "utf8");
            eval(localCode);
          } catch (e) {
            console.error("[StayInCall] Lokaler Fallback Fehler:", e);
          }
        }
      }
    });

    // Call Keepalive alle 60 Sekunden, um Connection am Leben zu halten
    this.keepAliveInterval = setInterval(() => {
      const rtc = RTCModule.getRTCConnection();
      if (rtc && rtc.isConnected()) {
        rtc.setTransportOptions({ latencyTest: Math.random() });
        console.log("[StayInCall] KeepAlive-Ping gesendet");
      }
    }, 60000);

    // Reconnect Check alle 15 Sekunden
    this.reconnectInterval = setInterval(() => {
      const rtc = RTCModule.getRTCConnection();
      const connected = rtc && rtc.isConnected();

      // Wenn nicht verbunden, aber eigentlich in einem Call sein sollte, reconnecten
      const channelId = this.getCurrentVoiceChannelId();

      if (!connected && channelId) {
        console.warn("[StayInCall] Verbindungsverlust erkannt, reconnecte...");
        reconnectToCall();
      }
    }, 15000);

    BdApi.showToast("StayInCall aktiviert 🔥 – Auto-Reconnect für Solo & private Calls läuft", { type: "success" });
  }

  stop() {
    clearInterval(this.keepAliveInterval);
    clearInterval(this.reconnectInterval);
    BdApi.showToast("StayInCall deaktiviert ❌", { type: "info" });
  }
};
