/**
 * @name StayInCall
 * @author headx
 * @version 1.2.0
 * @description Bleibt automatisch in Solo- & privaten Calls & joint neu, wenn du rausfliegst – made by headx | the psychon
 */

module.exports = class StayInCall {
  start() {
    this.callInterval = null;
    this.reconnectInterval = null;

    const RTCModule = BdApi.WebpackModules.getByProps("getRTCConnection");
    const VoiceModule = BdApi.WebpackModules.getByProps("joinVoiceChannel", "leaveVoiceChannel");
    const SelectedChannelStore = BdApi.WebpackModules.getByProps("getVoiceChannelId");
    const VoiceStateStore = BdApi.WebpackModules.getByProps("getVoiceStatesForChannel");

    const reconnectToCall = () => {
      // Hole aktuelle Voice-Channel-ID des Users, egal ob privat oder Gruppe
      const voiceChannelId = SelectedChannelStore.getVoiceChannelId() || this.getPrivateCallChannelId();

      if (!voiceChannelId) {
        console.warn("[StayInCall] Kein Voice-Channel gefunden zum Reconnect.");
        return;
      }

      try {
        console.log(`[StayInCall] Rejoin Call mit Channel-ID: ${voiceChannelId}`);
        VoiceModule.joinVoiceChannel({ channelId: voiceChannelId, selfMute: false, selfDeaf: false });
        BdApi.showToast("StayInCall: Rejoin durchgeführt 🔁", { type: "info" });
      } catch (err) {
        console.error("[StayInCall] Fehler beim Rejoin:", err);
      }
    };

    this.getPrivateCallChannelId = () => {
      // Suche im VoiceStateStore nach privatem Call (normalerweise 2 User im Channel)
      const voiceStates = VoiceStateStore.getVoiceStatesForChannel();
      if (!voiceStates) return null;

      for (const [channelId, states] of Object.entries(voiceStates)) {
        // Prüfe, ob du (self) in dem Channel bist
        if (states.some(state => state.userId === BdApi.findModuleByProps("getCurrentUser").getCurrentUser().id)) {
          return channelId; // Channel gefunden
        }
      }
      return null;
    };

    // Ping für Call Keepalive alle 60 Sekunden
    this.callInterval = setInterval(() => {
      const rtc = RTCModule.getRTCConnection();
      if (rtc && rtc.isConnected()) {
        rtc.setTransportOptions({ latencyTest: Math.random() });
        console.log("[StayInCall] Ping gesendet – Call wird gehalten.");
      }
    }, 60000);

    // Reconnect Check alle 15 Sekunden
    this.reconnectInterval = setInterval(() => {
      const rtc = RTCModule.getRTCConnection();
      const isConnected = rtc && rtc.isConnected();

      // Aktueller Channel (normal oder privat)
      const currentChannel = SelectedChannelStore.getVoiceChannelId() || this.getPrivateCallChannelId();

      if (!isConnected && currentChannel) {
        console.warn("[StayInCall] Raus aus dem Call? Rejoin wird gestartet...");
        reconnectToCall();
      }
    }, 15000);

    BdApi.showToast("StayInCall v1.2 aktiv 🔄 – Auto-Reconnect für private & Solo-Calls", { type: "success" });
  }

  stop() {
    clearInterval(this.callInterval);
    clearInterval(this.reconnectInterval);
    BdApi.showToast("StayInCall deaktiviert ❌", { type: "info" });
  }
};
