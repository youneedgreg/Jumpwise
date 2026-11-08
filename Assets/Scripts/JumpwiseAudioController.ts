/**
 * JumpwiseAudioController — the three sound cues (chime, spark, clamp click).
 *
 * Owns: one AudioComponent per cue, LowLatency playback (interactive cues),
 * and play counters that tests read.
 * Inputs: chimeTrack, sparkTrack, clampClickTrack (AudioTrackAsset, optional).
 * If a track is not wired, the cue is skipped and a warning is logged every
 * time it should have played — a missing sound is never silent.
 * Must not: decide WHEN a cue plays (Main and Guidance decide that).
 */

@component
export class JumpwiseAudioController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">JumpwiseAudioController – chime, spark and clamp-click cues</span>')
  @ui.separator

  @ui.group_start("References")
  @input
  @allowUndefined
  @hint("Chime played when the next target is out of view (the car behind you).")
  chimeTrack: AudioTrackAsset

  @input
  @allowUndefined
  @hint("Short spark played on a wrong clamp drop.")
  sparkTrack: AudioTrackAsset

  @input
  @allowUndefined
  @hint("Click played when a clamp goes on correctly.")
  clampClickTrack: AudioTrackAsset
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(0, 1, 0.05))
  @hint("Volume for all three cues.")
  volume: number = 0.9
  @ui.group_end

  private chimePlayer: AudioComponent | null = null
  private sparkPlayer: AudioComponent | null = null
  private clickPlayer: AudioComponent | null = null

  private counts = {chime: 0, spark: 0, click: 0}

  onAwake(): void {
    this.chimePlayer = this.makePlayer("ChimePlayer", this.chimeTrack)
    this.sparkPlayer = this.makePlayer("SparkPlayer", this.sparkTrack)
    this.clickPlayer = this.makePlayer("ClampClickPlayer", this.clampClickTrack)
  }

  playChime(): void {
    this.counts.chime++
    this.play(this.chimePlayer, "chime")
  }

  playSpark(): void {
    this.counts.spark++
    this.play(this.sparkPlayer, "spark")
  }

  playClick(): void {
    this.counts.click++
    this.play(this.clickPlayer, "clamp click")
  }

  /** How many times each cue was requested (read by LEAF tests). */
  getCounts(): {chime: number; spark: number; click: number} {
    return {chime: this.counts.chime, spark: this.counts.spark, click: this.counts.click}
  }

  /** Whether each cue has an audio track wired. */
  hasTracks(): {chime: boolean; spark: boolean; click: boolean} {
    return {chime: !!this.chimeTrack, spark: !!this.sparkTrack, click: !!this.clampClickTrack}
  }

  private makePlayer(name: string, track: AudioTrackAsset): AudioComponent | null {
    if (!track) return null
    const so = global.scene.createSceneObject(name)
    so.setParent(this.sceneObject)
    const ac = so.createComponent("Component.AudioComponent") as AudioComponent
    ac.audioTrack = track
    ac.volume = this.volume
    try {
      ac.playbackMode = Audio.PlaybackMode.LowLatency
    } catch (e) {
      print("[Jumpwise] audio: could not set LowLatency on " + name + ": " + e)
    }
    return ac
  }

  private play(player: AudioComponent | null, label: string): void {
    print("[Jumpwise] cue: " + label)
    if (!player) {
      print("[Jumpwise] WARNING: no audio track wired for " + label + " — cue not audible")
      return
    }
    if (player.isPlaying()) player.stop(false)
    player.play(1)
  }
}
