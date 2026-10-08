/**
 * Live Voice Controller for real-time interactive voice conversation with Ms Mèo.
 * Implements:
 * 1. Gemini Live API WebSocket stream (gemini-3.8-live) with 16kHz PCM input and 24kHz PCM gapless output.
 * 2. Instant interruption detection and playback queue clearing.
 * 3. Graceful fallback mode if WebSocket or API key is absent.
 */

export class LiveVoiceClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isConnected = false;

  public onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening') => void;
  public onVolumeChange?: (volume: number) => void;
  public onError?: (error: string) => void;

  public async start(studyContext?: string, focus?: string, languageMode?: 'en' | 'vi' | 'auto') {
    if (this.isConnected) return;

    try {
      this.onStatusChange?.('connecting');

      // Initialize output AudioContext at 24kHz for Gemini Live audio
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      // Initialize input AudioContext at 16kHz for mic capture
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      // Capture Microphone stream
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Connect WebSocket to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-voice`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[LiveVoiceClient] WebSocket opened');
        this.isConnected = true;
        this.onStatusChange?.('connected');

        // Send study passage context if present (up to 2000 chars)
        if (studyContext && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'context',
              text: studyContext.slice(0, 2000),
              focus: focus || 'Comprehensive: Pronunciation corrections, speaking mistakes, and topic Q&A',
              languageMode: languageMode || 'auto',
            })
          );
        }

        // Start processing mic input
        this.startMicProcessing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            this.onStatusChange?.('listening');
          } else if (data.type === 'audio' && data.audio) {
            this.onStatusChange?.('speaking');
            this.playAudioChunk(data.audio);
          } else if (data.type === 'interrupted') {
            this.clearAudioQueue();
            this.onStatusChange?.('listening');
          } else if (data.type === 'turnComplete') {
            this.onStatusChange?.('listening');
          } else if (data.type === 'error') {
            this.onError?.(data.message || 'Live Voice error');
          }
        } catch (e) {
          console.error('[LiveVoiceClient] Error parsing message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[LiveVoiceClient] WebSocket error:', err);
        this.onError?.('Could not connect to Live Voice server. Falling back to browser hands-free mode.');
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.onStatusChange?.('disconnected');
      };
    } catch (err: any) {
      this.cleanup();
      this.onError?.(err?.message || 'Could not start microphone or connect to voice service.');
      this.onStatusChange?.('disconnected');
      throw err;
    }
  }

  private startMicProcessing() {
    if (!this.inputAudioCtx || !this.micStream) return;

    const source = this.inputAudioCtx.createMediaStreamSource(this.micStream);
    // Use 4096 buffer size as instructed
    this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Simple volume calculation for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange?.(Math.min(1, rms * 5));

      // Convert Float32Array to 16-bit PCM Little Endian
      const base64Pcm = this.floatTo16BitPCMBase64(inputData);
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          audio: base64Pcm,
        })
      );
    };

    source.connect(this.processor);
    this.processor.connect(this.inputAudioCtx.destination);
  }

  /**
   * Encodes float samples (-1.0 to 1.0) into base64 raw 16-bit PCM little-endian.
   */
  private floatTo16BitPCMBase64(float32Array: Float32Array): string {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Decodes 24kHz raw PCM little-endian audio from Gemini Live and plays it gaplessly.
   */
  private playAudioChunk(base64Pcm: string) {
    if (!this.outputAudioCtx) return;

    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const audioBuffer = this.outputAudioCtx.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.onStatusChange?.('listening');
        }
      };
    } catch (e) {
      console.error('[LiveVoiceClient] Error playing audio chunk:', e);
    }
  }

  private clearAudioQueue() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
  }

  public stop() {
    this.cleanup();
    this.onStatusChange?.('disconnected');
  }

  private cleanup() {
    this.isConnected = false;
    this.clearAudioQueue();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
  }

  public sendContextUpdate(contextText: string, focus?: string, languageMode?: 'en' | 'vi' | 'auto') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'context',
          text: contextText.slice(0, 2000),
          focus: focus || 'Comprehensive: Pronunciation corrections, speaking mistakes, and topic Q&A',
          languageMode: languageMode || 'auto',
        })
      );
    }
  }
}
