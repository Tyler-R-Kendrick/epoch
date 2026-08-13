/**
 * Low-latency channel voice — Discord-parity WebRTC mesh for Community Web.
 *
 * Signaling and media are separated (Discord pattern):
 *   - Signaling: BroadcastChannel (same-origin multi-tab stand-in for the
 *     voice WebSocket). No media rides this path.
 *   - Media: RTCPeerConnection mesh, Opus preferred, UDP/ICE via STUN.
 *
 * Input modes match Discord:
 *   - vad  — Voice Activity Detection; mic transmits only while speaking
 *   - ptt  — Push-to-talk; mic transmits while the PTT key is held
 *
 * Mute / deafen / disconnect mirror Discord's voice dock. RTT is read from
 * WebRTC getStats (candidate-pair currentRoundTripTime) so the UI can show
 * the same kind of latency Discord surfaces.
 *
 * Without getUserMedia / RTCPeerConnection the module reports unsupported and
 * join fails soft — same contract as speech.js.
 */
(function () {
  "use strict";

  var CHANNEL = "epoch-community-web-voice-v1";
  var VAD_THRESHOLD = 0.018;
  var VAD_HANG_MS = 180;
  var STATS_MS = 1000;
  var SPEAKING_MS = 80;

  function rtcSupported() {
    var nav = typeof window !== "undefined" ? window.navigator : null;
    return !!(typeof window !== "undefined" &&
      window.RTCPeerConnection &&
      nav && nav.mediaDevices &&
      typeof nav.mediaDevices.getUserMedia === "function");
  }

  function uid() {
    return "v_" + Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 6);
  }

  /** Prefer Opus via transceiver API — never munge SDP (Chrome rejects that). */
  function preferOpusOnPc(pc) {
    if (!pc || typeof pc.getTransceivers !== "function") return;
    var caps = window.RTCRtpSender && window.RTCRtpSender.getCapabilities
      ? window.RTCRtpSender.getCapabilities("audio")
      : null;
    if (!caps || !caps.codecs || !caps.codecs.length) return;
    var opus = [];
    var rest = [];
    caps.codecs.forEach(function (c) {
      if (/opus/i.test(c.mimeType || "")) opus.push(c);
      else rest.push(c);
    });
    if (!opus.length) return;
    var ordered = opus.concat(rest);
    pc.getTransceivers().forEach(function (tr) {
      if (!tr) return;
      var track = tr.sender && tr.sender.track;
      if (track && track.kind !== "audio") return;
      if (typeof tr.setCodecPreferences === "function") {
        try { tr.setCodecPreferences(ordered); } catch { /* unsupported */ }
      }
    });
  }

  /**
   * @param {object} opts
   * @param {function(object): void} [opts.onState]
   * @param {string} [opts.handle]  local display name
   */
  function create(opts) {
    opts = opts || {};
    var selfId = uid();
    var handle = opts.handle || "you";
    var bus = null;
    var localStream = null;
    var audioCtx = null;
    var analyser = null;
    var vadTimer = null;
    var statsTimer = null;
    var speakingTimer = null;
    var pttHeld = false;
    var lastSpokeAt = 0;

    var state = {
      supported: rtcSupported(),
      channelId: null,
      channelPath: null,
      joined: false,
      muted: false,
      deafened: false,
      inputMode: "vad", // "vad" | "ptt"
      speaking: false,
      peers: {}, // id -> { handle, speaking, muted, stream?, pc? }
      latencyMs: null,
      error: null,
      selfId: selfId,
    };

    var peers = {}; // id -> { pc, handle, audio, speaking, muted }

    function emit() {
      state.peers = {};
      Object.keys(peers).forEach(function (id) {
        var p = peers[id];
        state.peers[id] = {
          id: id,
          handle: p.handle || id,
          speaking: !!p.speaking,
          muted: !!p.muted,
        };
      });
      if (opts.onState) {
        opts.onState({
          supported: state.supported,
          channelId: state.channelId,
          channelPath: state.channelPath,
          joined: state.joined,
          muted: state.muted,
          deafened: state.deafened,
          inputMode: state.inputMode,
          speaking: state.speaking,
          peers: state.peers,
          latencyMs: state.latencyMs,
          error: state.error,
          selfId: state.selfId,
          handle: handle,
          peerCount: Object.keys(peers).length,
        });
      }
    }

    function post(msg) {
      if (!bus) return;
      try {
        bus.postMessage(Object.assign({ from: selfId, channelId: state.channelId }, msg));
      } catch { /* fine */ }
    }

    function setMicEnabled(on) {
      if (!localStream) return;
      localStream.getAudioTracks().forEach(function (t) {
        t.enabled = !state.muted && !!on;
      });
    }

    function applyTransmitGate() {
      if (!state.joined || state.muted) {
        setMicEnabled(false);
        return;
      }
      if (state.inputMode === "ptt") {
        setMicEnabled(pttHeld);
        return;
      }
      // VAD: enabled while speaking (analyser) or briefly hanging.
      // No analyser → keep mic open in vad mode (AudioContext blocked/unavailable).
      if (!analyser && state.inputMode === "vad") {
        setMicEnabled(true);
        return;
      }
      var hot = state.speaking || (Date.now() - lastSpokeAt) < VAD_HANG_MS;
      setMicEnabled(hot);
    }

    function setSpeaking(on) {
      if (state.speaking === on) {
        if (on) lastSpokeAt = Date.now();
        return;
      }
      state.speaking = on;
      if (on) lastSpokeAt = Date.now();
      post({ type: "speaking", speaking: on });
      applyTransmitGate();
      emit();
    }

    function tickVad() {
      if (!state.joined) return;
      if (!analyser) {
        if (state.inputMode === "vad" && !state.muted) applyTransmitGate();
        else if (state.inputMode === "ptt") setSpeaking(pttHeld && !state.muted);
        return;
      }
      var data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      var sum = 0;
      for (var i = 0; i < data.length; i++) {
        var v = (data[i] - 128) / 128;
        sum += v * v;
      }
      var rms = Math.sqrt(sum / data.length);
      var hot = rms > VAD_THRESHOLD;
      if (state.inputMode === "vad" && !state.muted) {
        if (hot) setSpeaking(true);
        else if (state.speaking && (Date.now() - lastSpokeAt) > VAD_HANG_MS) setSpeaking(false);
        else applyTransmitGate();
      } else if (state.inputMode === "ptt") {
        setSpeaking(pttHeld && !state.muted);
      }
    }

    async function ensureLocalMedia() {
      if (localStream) return localStream;
      localStream = await window.navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
        video: false,
      });
      // Low-latency monitoring graph for VAD only — not a speaker loop.
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC({
          latencyHint: "interactive",
          sampleRate: 48000,
        });
        var src = audioCtx.createMediaStreamSource(localStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        src.connect(analyser);
      } catch { /* VAD optional if AudioContext blocked */ }
      applyTransmitGate();
      return localStream;
    }

    function stopLocalMedia() {
      if (vadTimer) { clearInterval(vadTimer); vadTimer = null; }
      if (statsTimer) { clearInterval(statsTimer); statsTimer = null; }
      if (speakingTimer) { clearInterval(speakingTimer); speakingTimer = null; }
      if (localStream) {
        localStream.getTracks().forEach(function (t) { try { t.stop(); } catch { /* fine */ } });
        localStream = null;
      }
      analyser = null;
      if (audioCtx) {
        try { audioCtx.close(); } catch { /* fine */ }
        audioCtx = null;
      }
    }

    function attachRemoteAudio(id, stream) {
      var p = peers[id];
      if (!p) return;
      if (p.audio) {
        p.audio.srcObject = stream;
        return;
      }
      var el = document.createElement("audio");
      el.autoplay = true;
      el.playsInline = true;
      el.srcObject = stream;
      el.muted = !!state.deafened;
      el.dataset.voicePeer = id;
      // Keep out of layout; Discord plays remote audio without visible tags.
      el.style.cssText = "position:fixed;width:0;height:0;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      p.audio = el;
      p.stream = stream;
    }

    function closePeer(id) {
      var p = peers[id];
      if (!p) return;
      try { if (p.pc) p.pc.close(); } catch { /* fine */ }
      if (p.audio) {
        try { p.audio.srcObject = null; p.audio.remove(); } catch { /* fine */ }
      }
      delete peers[id];
    }

    function closeAllPeers() {
      Object.keys(peers).forEach(closePeer);
    }

    async function makePeer(id, handleName, polite) {
      if (peers[id] && peers[id].pc) return peers[id];
      var pc = new window.RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });
      var peer = { pc: pc, handle: handleName || id, speaking: false, muted: false, audio: null, stream: null, makingOffer: false };
      peers[id] = peer;

      if (localStream) {
        localStream.getTracks().forEach(function (t) {
          pc.addTrack(t, localStream);
        });
      }
      preferOpusOnPc(pc);

      pc.onicecandidate = function (ev) {
        if (ev.candidate) {
          post({ type: "ice", to: id, candidate: ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate });
        }
      };

      pc.ontrack = function (ev) {
        var stream = ev.streams && ev.streams[0]
          ? ev.streams[0]
          : new window.MediaStream([ev.track]);
        attachRemoteAudio(id, stream);
        emit();
      };

      pc.onconnectionstatechange = function () {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePeer(id);
          emit();
        }
      };

      // Perfect negotiation lite: the lower id is polite.
      if (polite || selfId < id) {
        peer.makingOffer = true;
        try {
          var offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
          await pc.setLocalDescription(offer);
          post({ type: "offer", to: id, sdp: pc.localDescription });
        } catch {
          state.error = "voice offer failed";
          emit();
        } finally {
          peer.makingOffer = false;
        }
      }

      return peer;
    }

    async function onSignal(msg) {
      if (!msg || msg.from === selfId) return;
      if (msg.channelId && state.channelId && msg.channelId !== state.channelId) return;

      if (msg.type === "hello" && state.joined) {
        await makePeer(msg.from, msg.handle, selfId < msg.from);
        post({ type: "welcome", to: msg.from, handle: handle, muted: state.muted });
        emit();
        return;
      }

      if (msg.type === "welcome" && state.joined && msg.to === selfId) {
        await makePeer(msg.from, msg.handle, selfId < msg.from);
        if (peers[msg.from]) peers[msg.from].muted = !!msg.muted;
        emit();
        return;
      }

      if (msg.type === "leave") {
        closePeer(msg.from);
        emit();
        return;
      }

      if (msg.type === "speaking" && peers[msg.from]) {
        peers[msg.from].speaking = !!msg.speaking;
        emit();
        return;
      }

      if (msg.type === "mute" && peers[msg.from]) {
        peers[msg.from].muted = !!msg.muted;
        emit();
        return;
      }

      if (!state.joined) return;
      if (msg.to && msg.to !== selfId) return;

      if (msg.type === "offer") {
        var pOffer = peers[msg.from] || await makePeer(msg.from, msg.handle, false);
        var pcO = pOffer.pc;
        await pcO.setRemoteDescription(msg.sdp);
        preferOpusOnPc(pcO);
        var answer = await pcO.createAnswer();
        await pcO.setLocalDescription(answer);
        post({ type: "answer", to: msg.from, sdp: pcO.localDescription });
        return;
      }

      if (msg.type === "answer" && peers[msg.from]) {
        await peers[msg.from].pc.setRemoteDescription(msg.sdp);
        return;
      }

      if (msg.type === "ice" && peers[msg.from] && msg.candidate) {
        try {
          await peers[msg.from].pc.addIceCandidate(msg.candidate);
        } catch { /* glare */ }
      }
    }

    async function readLatency() {
      var ids = Object.keys(peers);
      if (!ids.length) {
        state.latencyMs = 0;
        return;
      }
      var samples = [];
      for (var i = 0; i < ids.length; i++) {
        var pc = peers[ids[i]].pc;
        if (!pc) continue;
        try {
          var report = await pc.getStats();
          report.forEach(function (r) {
            if (r.type === "candidate-pair" && r.state === "succeeded" &&
                typeof r.currentRoundTripTime === "number") {
              samples.push(r.currentRoundTripTime * 1000);
            }
          });
        } catch { /* fine */ }
      }
      if (samples.length) {
        samples.sort(function (a, b) { return a - b; });
        state.latencyMs = Math.round(samples[0]);
      }
    }

    function startLoops() {
      if (vadTimer) clearInterval(vadTimer);
      if (statsTimer) clearInterval(statsTimer);
      vadTimer = setInterval(tickVad, SPEAKING_MS);
      statsTimer = setInterval(function () {
        readLatency().then(function () { emit(); }).catch(function () { /* fine */ });
      }, STATS_MS);
    }

    async function join(channelId, channelPath) {
      if (!rtcSupported()) {
        state.error = "voice not supported in this browser";
        emit();
        return { ok: false, error: state.error };
      }
      if (state.joined && state.channelId === channelId) {
        return { ok: true, already: true };
      }
      if (state.joined) await leave();

      state.channelId = channelId;
      state.channelPath = channelPath || null;
      state.error = null;
      handle = (opts.handle) ||
        (window.CW_APP && typeof window.CW_APP.getIdentity === "function" &&
          (function () {
            var id = window.CW_APP.getIdentity();
            return id && (id.handle || id.displayName);
          })()) ||
        (window.CW_APP && window.CW_APP.state && window.CW_APP.state.identity &&
          (window.CW_APP.state.identity.handle || window.CW_APP.state.identity.displayName)) ||
        "you";

      try {
        await ensureLocalMedia();
      } catch {
        state.error = "mic denied — allow microphone for channel voice";
        state.channelId = null;
        emit();
        return { ok: false, error: state.error };
      }

      try {
        bus = new window.BroadcastChannel(CHANNEL);
        bus.onmessage = function (ev) {
          Promise.resolve(onSignal(ev.data)).catch(function (err) {
            state.error = "voice negotiation failed: " +
              ((err && err.message) || String(err));
            emit();
          });
        };
      } catch {
        state.error = "voice signaling unavailable";
        stopLocalMedia();
        emit();
        return { ok: false, error: state.error };
      }

      state.joined = true;
      state.muted = false;
      state.deafened = false;
      pttHeld = false;
      applyTransmitGate();
      startLoops();
      post({ type: "hello", handle: handle });
      emit();
      return { ok: true };
    }

    async function leave() {
      if (state.joined) post({ type: "leave" });
      closeAllPeers();
      stopLocalMedia();
      if (bus) {
        try { bus.close(); } catch { /* fine */ }
        bus = null;
      }
      state.joined = false;
      state.channelId = null;
      state.channelPath = null;
      state.speaking = false;
      state.latencyMs = null;
      state.error = null;
      pttHeld = false;
      emit();
      return { ok: true };
    }

    function setMuted(on) {
      state.muted = !!on;
      if (state.muted) setSpeaking(false);
      applyTransmitGate();
      post({ type: "mute", muted: state.muted });
      emit();
    }

    function toggleMute() {
      setMuted(!state.muted);
      return state.muted;
    }

    function setDeafened(on) {
      state.deafened = !!on;
      Object.keys(peers).forEach(function (id) {
        if (peers[id].audio) peers[id].audio.muted = state.deafened;
      });
      // Discord: deafen also mutes you.
      if (state.deafened) setMuted(true);
      emit();
    }

    function toggleDeafen() {
      setDeafened(!state.deafened);
      return state.deafened;
    }

    function setInputMode(mode) {
      state.inputMode = mode === "ptt" ? "ptt" : "vad";
      pttHeld = false;
      applyTransmitGate();
      emit();
      return state.inputMode;
    }

    function pttDown() {
      if (!state.joined || state.inputMode !== "ptt") return false;
      pttHeld = true;
      setSpeaking(!state.muted);
      applyTransmitGate();
      return true;
    }

    function pttUp() {
      if (!state.joined || state.inputMode !== "ptt") return;
      pttHeld = false;
      setSpeaking(false);
      applyTransmitGate();
    }

    function getState() {
      return {
        supported: state.supported,
        channelId: state.channelId,
        channelPath: state.channelPath,
        joined: state.joined,
        muted: state.muted,
        deafened: state.deafened,
        inputMode: state.inputMode,
        speaking: state.speaking,
        peers: Object.assign({}, state.peers),
        latencyMs: state.latencyMs,
        error: state.error,
        selfId: state.selfId,
        handle: handle,
        peerCount: Object.keys(peers).length,
      };
    }

    function dispose() {
      leave();
    }

    return {
      join: join,
      leave: leave,
      setMuted: setMuted,
      toggleMute: toggleMute,
      setDeafened: setDeafened,
      toggleDeafen: toggleDeafen,
      setInputMode: setInputMode,
      pttDown: pttDown,
      pttUp: pttUp,
      getState: getState,
      dispose: dispose,
      isSupported: rtcSupported,
    };
  }

  /** Discord-style PTT while in voice: bare Backquote, no modifiers. */
  function isVoicePttKey(ev) {
    if (!ev) return false;
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return false;
    return ev.code === "Backquote" || ev.key === "`" || ev.key === "Dead";
  }

  window.CW_VOICE = {
    isSupported: rtcSupported,
    create: create,
    isVoicePttKey: isVoicePttKey,
    CHANNEL: CHANNEL,
  };
})();
