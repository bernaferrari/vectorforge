// Low-latency browser-native synthesizer sound engine for tactile audio feedback
class SoundEngine {
  private ctx: AudioContext | null = null
  private enabled: boolean = false

  constructor() {
    // Lazy initialized on first user interaction to comply with browser autoplay policies
  }

  public toggle(on: boolean) {
    this.enabled = on
    if (on && !this.ctx) {
      try {
        this.ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )()
      } catch (e) {
        console.warn("Web Audio API not supported in this browser", e)
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  private resumeContext() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume()
    }
  }

  // Satisfying mechanical play/pause click
  public playClick() {
    if (!this.enabled || !this.ctx) return
    this.resumeContext()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.type = "sine"
    osc.frequency.setValueAtTime(650, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.04)
  }

  // satisfing wooden pop when keyframes snap or reset is clicked
  public playPop() {
    if (!this.enabled || !this.ctx) return
    this.resumeContext()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.type = "triangle"
    osc.frequency.setValueAtTime(120, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.07)

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.07)
  }

  // Smooth synthesizer swoosh for camera snapping/resetting
  public playSwoosh() {
    if (!this.enabled || !this.ctx) return
    this.resumeContext()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.type = "sine"
    osc.frequency.setValueAtTime(80, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 0.22)

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.22)
  }
}

export const sound = new SoundEngine()
