// Audio Manager for Who Wants to be a Millionaire
// Handles all sound effects and background music

class AudioManager {
  constructor() {
    const audioPath = "./assets/";
    this.sounds = {
      mainTheme: new Audio(audioPath + "main-theme.mp3"),
      letsPlay: new Audio(audioPath + "let-s-play.mp3"),
      correctAnswer: new Audio(audioPath + "correct-answer.mp3"),
      wrongAnswer: new Audio(audioPath + "wrong-answer.mp3"),
      finalAnswer: new Audio(audioPath + "final-answer.mp3"),
      fastestFinger: new Audio(audioPath + "fastest-finger.mp3"),
      phoneAFriend: new Audio(audioPath + "phone-a-friend.mp3"),
      commercialBreak: new Audio(audioPath + "commerical-break.mp3"),
      level1to1000: new Audio(audioPath + "100-1000-music.mp3"),
      level2000to32000: new Audio(audioPath + "2000-32000.mp3"),
      level64000: new Audio(audioPath + "64000-music.mp3"),
      level250000: new Audio(audioPath + "250000-music.mp3"),
      level1000000: new Audio(audioPath + "1000000-music.mp3"),
      level5000000: new Audio(audioPath + "5000000-music.mp3")
    };

    console.log("Audio Manager initialized - Sound files loaded from:", audioPath);

    this.currentBackground = null;
    this.isMuted = true; // Start muted until user clicks sound button
    this.volume = 0.6;

    // Set default volumes
    Object.values(this.sounds).forEach(audio => {
      audio.volume = this.volume;
      audio.loop = false;
    });

    // Main theme can loop
    this.sounds.mainTheme.loop = true;
  }

  play(soundName, options = {}) {
    if (this.isMuted) {
      console.log(`Audio muted - not playing: ${soundName}`);
      return;
    }

    const sound = this.sounds[soundName];
    if (!sound) {
      console.error(`Sound ${soundName} not found in audio manager`);
      return;
    }

    sound.currentTime = 0;
    sound.volume = options.volume !== undefined ? options.volume : this.volume;

    console.log(`Playing sound: ${soundName} at volume ${sound.volume}`);

    const playPromise = sound.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log(`Successfully playing: ${soundName}`);
        })
        .catch(error => {
          console.error(`Audio play failed for ${soundName}:`, error.message);
          console.error('Try clicking the sound button or interacting with the page first');
        });
    }
  }

  playBackground(soundName, fadeIn = true) {
    this.stopBackground();

    if (this.isMuted) return;

    const sound = this.sounds[soundName];
    if (!sound) return;

    this.currentBackground = sound;
    sound.loop = true;

    if (fadeIn) {
      sound.volume = 0;
      sound.play().catch(err => console.warn(err));
      this.fadeIn(sound, this.volume, 2000);
    } else {
      sound.volume = this.volume;
      sound.play().catch(err => console.warn(err));
    }
  }

  stopBackground(fadeOut = true) {
    if (!this.currentBackground) return;

    if (fadeOut) {
      this.fadeOut(this.currentBackground, 1000, () => {
        this.currentBackground.pause();
        this.currentBackground.currentTime = 0;
        this.currentBackground = null;
      });
    } else {
      this.currentBackground.pause();
      this.currentBackground.currentTime = 0;
      this.currentBackground = null;
    }
  }

  stopAll() {
    Object.values(this.sounds).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentBackground = null;
  }

  fadeIn(audio, targetVolume, duration) {
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(volumeStep * currentStep, targetVolume);

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);
  }

  fadeOut(audio, duration, callback) {
    const steps = 20;
    const stepDuration = duration / steps;
    const startVolume = audio.volume;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(startVolume - (volumeStep * currentStep), 0);

      if (currentStep >= steps) {
        clearInterval(interval);
        if (callback) callback();
      }
    }, stepDuration);
  }

  getMusicForLevel(level) {
    if (level >= 1 && level <= 5) {
      return "level1to1000";
    } else if (level >= 6 && level <= 10) {
      return "level2000to32000";
    } else if (level >= 11 && level <= 12) {
      return "level64000";
    } else if (level === 13 || level === 14) {
      return "level250000";
    } else if (level === 15) {
      return "level1000000";
    }
    return "level1to1000";
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(audio => {
      audio.volume = this.volume;
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAll();
    }
    return this.isMuted;
  }
}

export const audioManager = new AudioManager();
