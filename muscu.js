(() => {
  const pageKey = document.body.dataset.pageKey;
  if (!pageKey) return;

  const migrateLegacyStorage = () => {
    const legacyPageKeys = (document.body.dataset.legacyPageKeys || "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
    const storedEntries = Array.from({ length: localStorage.length }, (_, index) => {
      const key = localStorage.key(index);
      return key === null ? null : [key, localStorage.getItem(key)];
    }).filter(Boolean);

    legacyPageKeys.forEach((legacyPageKey) => {
      const legacyMarker = `-${legacyPageKey}`;
      storedEntries.forEach(([oldKey, value]) => {
        if (!oldKey.includes(legacyMarker)) return;

        const newKey = oldKey.replace(legacyMarker, `-${pageKey}`);
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, value);
        }
      });
    });
  };

  migrateLegacyStorage();

  const timerDisplay = document.querySelector("[data-timer-display]");
  const minutesInput = document.querySelector("[data-timer-minutes]");
  const secondsInput = document.querySelector("[data-timer-seconds]");
  const startButton = document.querySelector("[data-timer-start]");
  const pauseButton = document.querySelector("[data-timer-pause]");
  const resetButton = document.querySelector("[data-timer-reset]");
  const presetButtons = document.querySelectorAll("[data-timer-preset]");
  const restButtons = document.querySelectorAll("[data-rest-seconds]");
  const workTimerButtons = document.querySelectorAll("[data-work-seconds]");
  const notesField = document.querySelector("[data-notes-field]");
  const notesStatus = document.querySelector("[data-notes-status]");
  const workoutCards = document.querySelectorAll(".workout-card");
  const programTabs = document.querySelectorAll("[data-program-tab]");
  const programPanels = document.querySelectorAll("[data-program-panel]");

  const notesStorageKey = `muscu-notes-${pageKey}`;
  const timerStorageKey = `muscu-timer-${pageKey}`;
  const programStorageKey = `muscu-program-${pageKey}`;

  let totalSeconds = 0;
  let remainingSeconds = 0;
  let intervalId = null;
  let timerModeLabel = "Chrono en cours";
  let timerBubble = null;
  let floatingTimerDisplay = null;
  let floatingTimerLabel = null;
  let floatingTimerPauseButton = null;
  let floatingTimerResetButton = null;
  let hideBubbleTimeoutId = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const renderTime = (value) => {
    const minutes = Math.floor(value / 60).toString().padStart(2, "0");
    const seconds = (value % 60).toString().padStart(2, "0");
    if (timerDisplay) timerDisplay.textContent = `${minutes}:${seconds}`;
    if (floatingTimerDisplay) floatingTimerDisplay.textContent = `${minutes}:${seconds}`;
  };

  const createFloatingTimer = () => {
    timerBubble = document.createElement("div");
    timerBubble.className = "floating-timer";
    timerBubble.hidden = true;
    timerBubble.setAttribute("role", "status");
    timerBubble.setAttribute("aria-live", "polite");

    const textWrapper = document.createElement("div");
    textWrapper.className = "floating-timer-text";
    floatingTimerLabel = document.createElement("span");
    floatingTimerLabel.className = "floating-timer-label";
    floatingTimerLabel.textContent = "Chronomètre";
    floatingTimerDisplay = document.createElement("strong");
    floatingTimerDisplay.className = "floating-timer-time";
    floatingTimerDisplay.textContent = timerDisplay ? timerDisplay.textContent : "01:00";
    textWrapper.append(floatingTimerLabel, floatingTimerDisplay);

    const actions = document.createElement("div");
    actions.className = "floating-timer-actions";
    floatingTimerPauseButton = document.createElement("button");
    floatingTimerPauseButton.className = "mini-button";
    floatingTimerPauseButton.type = "button";
    floatingTimerPauseButton.textContent = "Pause";
    floatingTimerResetButton = document.createElement("button");
    floatingTimerResetButton.className = "mini-button secondary";
    floatingTimerResetButton.type = "button";
    floatingTimerResetButton.textContent = "Réinitialiser";
    actions.append(floatingTimerPauseButton, floatingTimerResetButton);
    timerBubble.append(textWrapper, actions);
    document.body.appendChild(timerBubble);
  };

  const setFloatingTimerVisible = (isVisible) => {
    if (!timerBubble) return;

    window.clearTimeout(hideBubbleTimeoutId);
    timerBubble.hidden = !isVisible;
  };

  const updateFloatingTimerState = (label, pauseText = "Pause") => {
    if (floatingTimerLabel) floatingTimerLabel.textContent = label;
    if (floatingTimerPauseButton) floatingTimerPauseButton.textContent = pauseText;
  };

  const activateProgramTab = (programId, shouldPersist = true) => {
    if (!programId) return;

    programTabs.forEach((button) => {
      const isActive = button.dataset.programTab === programId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    programPanels.forEach((panel) => {
      panel.hidden = panel.dataset.programPanel !== programId;
      panel.classList.toggle("active", panel.dataset.programPanel === programId);
    });

    if (shouldPersist) {
      localStorage.setItem(programStorageKey, programId);
    }
  };

  const initializeProgramTabs = () => {
    if (!programTabs.length || !programPanels.length) return;

    const savedProgramId = localStorage.getItem(programStorageKey);
    const availableProgramIds = Array.from(programTabs).map((button) => button.dataset.programTab);
    const defaultProgramId = availableProgramIds[0];
    const initialProgramId = availableProgramIds.includes(savedProgramId) ? savedProgramId : defaultProgramId;

    activateProgramTab(initialProgramId, false);

    programTabs.forEach((button, index) => {
      button.addEventListener("click", () => {
        activateProgramTab(button.dataset.programTab);
      });

      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

        event.preventDefault();

        let nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % programTabs.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + programTabs.length) % programTabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = programTabs.length - 1;

        const nextButton = programTabs[nextIndex];
        nextButton.focus();
        activateProgramTab(nextButton.dataset.programTab);
      });
    });
  };

  const persistTimerInputs = () => {
    localStorage.setItem(
      timerStorageKey,
      JSON.stringify({
        minutes: minutesInput ? minutesInput.value : String(Math.floor(totalSeconds / 60)),
        seconds: secondsInput ? secondsInput.value : String(totalSeconds % 60),
      }),
    );
  };

  const normalizeTimerInputs = () => {
    const rawMinutes = parseInt(minutesInput?.value || "0", 10) || 0;
    const rawSeconds = parseInt(secondsInput?.value || "0", 10) || 0;
    const safeMinutes = clamp(rawMinutes, 0, 59);
    const safeSeconds = clamp(rawSeconds, 0, 59);

    if (minutesInput) minutesInput.value = String(safeMinutes);
    if (secondsInput) secondsInput.value = String(safeSeconds);

    return { safeMinutes, safeSeconds };
  };

  const syncTimerFromInputs = () => {
    if (!minutesInput && !secondsInput) {
      remainingSeconds = totalSeconds;
      renderTime(remainingSeconds);
      return;
    }
    const { safeMinutes, safeSeconds } = normalizeTimerInputs();
    totalSeconds = (safeMinutes * 60) + safeSeconds;
    remainingSeconds = totalSeconds;
    renderTime(remainingSeconds);
    persistTimerInputs();
  };

  const stopTimer = () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  };

  const pauseTimer = () => {
    stopTimer();

    if (remainingSeconds > 0) {
      updateFloatingTimerState(`${timerModeLabel.replace(" en cours", "")} en pause`, "Reprendre");
      setFloatingTimerVisible(true);
    }
  };

  const resetTimer = () => {
    stopTimer();
    syncTimerFromInputs();
    setFloatingTimerVisible(false);
  };

  const playEndSound = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const duration = 0.18;

      [0, 0.22, 0.44].forEach((offset, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = index === 1 ? 880 : 660;
        gain.gain.value = 0.0001;

        oscillator.connect(gain);
        gain.connect(context.destination);

        const start = context.currentTime + offset;
        gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.start(start);
        oscillator.stop(start + duration);
      });
    } catch (error) {
      console.error("Impossible de jouer le son du minuteur.", error);
    }
  };

  const finishTimer = () => {
    stopTimer();
    remainingSeconds = 0;
    renderTime(0);
    const finishedLabel = timerModeLabel === "Repos en cours"
      ? "Repos termin\u00e9"
      : (timerModeLabel === "Exercice en cours" ? "Exercice termin\u00e9" : "Chrono termin\u00e9");
    updateFloatingTimerState(finishedLabel, "Relancer");
    setFloatingTimerVisible(true);
    hideBubbleTimeoutId = window.setTimeout(() => {
      setFloatingTimerVisible(false);
    }, 2200);
    playEndSound();

    if ("vibrate" in navigator) {
      navigator.vibrate([180, 100, 180]);
    }
  };

  const startTimer = (modeLabel = timerModeLabel) => {
    if (remainingSeconds <= 0) {
      if (minutesInput || secondsInput) syncTimerFromInputs();
      else remainingSeconds = totalSeconds;
    }
    if (remainingSeconds <= 0) return;

    stopTimer();
    timerModeLabel = modeLabel;
    updateFloatingTimerState(timerModeLabel, "Pause");
    setFloatingTimerVisible(true);
    intervalId = window.setInterval(() => {
      remainingSeconds -= 1;
      renderTime(remainingSeconds);

      if (remainingSeconds <= 0) {
        finishTimer();
      }
    }, 1000);
  };

  const setTimer = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    totalSeconds = safeSeconds;
    remainingSeconds = safeSeconds;

    if (minutesInput) minutesInput.value = String(Math.floor(safeSeconds / 60));
    if (secondsInput) secondsInput.value = String(safeSeconds % 60);

    renderTime(remainingSeconds);
    persistTimerInputs();
  };

  const initializeBlockControls = () => {
    document.querySelectorAll(".program-block[data-block-id]").forEach((block) => {
      const adjustmentButton = block.querySelector("[data-block-adjust-toggle]");
      if (adjustmentButton) {
        adjustmentButton.addEventListener("click", () => {
          const opening = adjustmentButton.getAttribute("aria-expanded") !== "true";
          adjustmentButton.setAttribute("aria-expanded", String(opening));
          block.querySelectorAll("[data-adjust-panel]").forEach((panel) => { panel.hidden = !opening; });
          block.querySelectorAll("[data-block-rest-setting]").forEach((panel) => { panel.hidden = !opening; });
        });
      }
    });

    document.querySelectorAll("[data-block-rest-id]").forEach((restButton) => {
      const restId = restButton.dataset.blockRestId;
      const block = restButton.closest(".program-block");
      const restInput = block?.querySelector("[data-block-rest-input]");
      const storageKey = `muscu-block-rest-${pageKey}-${restId}`;
      const savedRest = parseInt(localStorage.getItem(storageKey) || "", 10);
      let restSeconds = Number.isFinite(savedRest) ? clamp(savedRest, 0, 600) : parseInt(restButton.dataset.restSeconds || "0", 10) || 0;
      const renderRest = () => {
        if (restInput) restInput.value = String(restSeconds);
        restButton.dataset.restSeconds = String(restSeconds);
        restButton.textContent = `Repos ${restSeconds} s`;
        restButton.setAttribute("aria-label", `Lancer un repos de ${restSeconds} secondes`);
      };
      renderRest();
      restInput?.addEventListener("input", () => {
        restSeconds = clamp(parseInt(restInput.value || "0", 10) || 0, 0, 600);
        localStorage.setItem(storageKey, String(restSeconds));
        renderRest();
      });
    });

    document.querySelectorAll("[data-subblock-id]").forEach((restButton) => {
      const subblockId = restButton.dataset.subblockId;
      const restInput = restButton.closest(".workout-card")?.querySelector("[data-subblock-rest-input]");
      const storageKey = `muscu-rest-${pageKey}-${subblockId}`;
      const savedRest = parseInt(localStorage.getItem(storageKey) || "", 10);
      let restSeconds = Number.isFinite(savedRest) ? clamp(savedRest, 0, 600) : parseInt(restButton.dataset.restSeconds || "0", 10) || 0;
      const renderRest = () => {
        if (restInput) restInput.value = String(restSeconds);
        restButton.dataset.restSeconds = String(restSeconds);
        restButton.textContent = `Repos ${restSeconds} s`;
        restButton.setAttribute("aria-label", `Lancer un repos de ${restSeconds} secondes`);
      };
      renderRest();
      if (restInput) {
        restInput.addEventListener("input", () => {
          restSeconds = clamp(parseInt(restInput.value || "0", 10) || 0, 0, 600);
          localStorage.setItem(storageKey, String(restSeconds));
          renderRest();
        });
      }
    });

    document.querySelectorAll("[data-duration-edit]").forEach((button) => {
      const key = `muscu-duration-${pageKey}-${button.closest("[data-program-panel]")?.dataset.programPanel || "program"}`;
      const saved = localStorage.getItem(key);
      if (saved) button.textContent = saved;
      button.addEventListener("click", () => {
        const next = window.prompt("Durée approximative", button.textContent.trim());
        if (next === null || !next.trim()) return;
        button.textContent = next.trim();
        localStorage.setItem(key, next.trim());
      });
    });
  };

  const saveNotes = () => {
    if (!notesField) return;

    localStorage.setItem(notesStorageKey, notesField.value);

    if (notesStatus) {
      notesStatus.textContent = "Notes enregistr\u00e9es";
      window.clearTimeout(saveNotes.timeoutId);
      saveNotes.timeoutId = window.setTimeout(() => {
        notesStatus.textContent = "Les notes se sauvegardent automatiquement";
      }, 1400);
    }
  };

  const loadSavedState = () => {
    const savedNotes = localStorage.getItem(notesStorageKey);
    if (notesField && savedNotes) {
      notesField.value = savedNotes;
    }

    const savedTimer = localStorage.getItem(timerStorageKey);
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        if (minutesInput) minutesInput.value = parsed.minutes ?? "1";
        if (secondsInput) secondsInput.value = parsed.seconds ?? "0";
      } catch (_error) {
        // Ignore invalid timer state.
      }
    }

    syncTimerFromInputs();
  };

  workoutCards.forEach((workoutCard, index) => {
    const form = workoutCard.querySelector("[data-load-form]");
    const toggle = workoutCard.querySelector("[data-adjust-toggle]");
    const panel = workoutCard.querySelector("[data-adjust-panel]");

    if (panel) {
      const panelId = `${pageKey}-adjust-panel-${index + 1}`;
      panel.id = panelId;
      panel.setAttribute("aria-live", "polite");
    }

    if (toggle && panel) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", panel.id);
      toggle.addEventListener("click", () => {
        const isHidden = panel.hidden;
        panel.hidden = !isHidden;
        toggle.setAttribute("aria-expanded", String(isHidden));
      });
    }

    if (!form) return;

    const exerciseId = form.dataset.exerciseId;
    const loadInput = form.querySelector("[data-load-input]");
    const repsInput = form.querySelector("[data-reps-input]");
    const loadOutput = workoutCard.querySelector("[data-load-output]");
    const repsOutput = workoutCard.querySelector("[data-reps-output]");
    const saveButton = form.querySelector("[data-load-save]");
    const saveFeedback = form.querySelector("[data-save-feedback]");
    const exerciseWorkTimer = workoutCard.querySelector("[data-work-seconds]");

    const syncExerciseWorkTimer = (workFormat) => {
      if (!exerciseWorkTimer) return;
      const duration = workFormat.match(/([0-9]+)\s*s(?:ec(?:onds?)?)?/i);
      if (!duration) {
        exerciseWorkTimer.hidden = true;
        return;
      }
      const seconds = parseInt(duration[1], 10);
      exerciseWorkTimer.hidden = false;
      exerciseWorkTimer.dataset.workSeconds = String(seconds);
      exerciseWorkTimer.textContent = `${seconds} s`;
      exerciseWorkTimer.setAttribute("aria-label", `Lancer un chrono de ${seconds} secondes`);
    };

    if (!exerciseId || !panel || !repsInput || !saveButton) return;

    const loadKey = `muscu-load-${pageKey}-${exerciseId}`;
    const repsKey = `muscu-reps-${pageKey}-${exerciseId}`;
    const defaultLoad = loadInput ? loadInput.value.trim() : "";
    const defaultReps = repsInput.value.trim();
    const savedLoad = localStorage.getItem(loadKey) ?? defaultLoad;
    const savedReps = localStorage.getItem(repsKey) ?? defaultReps;

    if (loadInput) loadInput.value = savedLoad;
    repsInput.value = savedReps;

    if (loadOutput) {
      loadOutput.textContent = savedLoad ? `${savedLoad} kg` : "Sans charge";
    }

    if (repsOutput) {
      repsOutput.textContent = savedReps || defaultReps;
    }
    syncExerciseWorkTimer(savedReps || defaultReps);

    saveButton.addEventListener("click", () => {
      const nextLoad = loadInput ? loadInput.value.trim() : "";
      const nextReps = repsInput.value.trim();

      if (loadInput) {
        if (nextLoad) {
          localStorage.setItem(loadKey, nextLoad);
          if (loadOutput) loadOutput.textContent = `${nextLoad} kg`;
        } else {
          localStorage.removeItem(loadKey);
          if (loadOutput) loadOutput.textContent = "Sans charge";
        }
      }

      if (nextReps) {
        localStorage.setItem(repsKey, nextReps);
        if (repsOutput) repsOutput.textContent = nextReps;
      } else {
        localStorage.removeItem(repsKey);
        if (repsOutput) repsOutput.textContent = defaultReps;
      }
      syncExerciseWorkTimer(nextReps || defaultReps);

      if (saveFeedback) {
        saveFeedback.textContent = "Enregistr\u00e9";
        saveFeedback.hidden = false;
        window.clearTimeout(saveFeedback.timeoutId);
        saveFeedback.timeoutId = window.setTimeout(() => {
          saveFeedback.hidden = true;
        }, 1600);
      }
      window.clearTimeout(panel.closeTimeoutId);
      panel.closeTimeoutId = window.setTimeout(() => {
        panel.hidden = true;
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
        }
      }, 900);
    });
  });

  createFloatingTimer();
  initializeProgramTabs();
  initializeBlockControls();

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const seconds = parseInt(button.dataset.timerPreset || "0", 10) || 0;
      setTimer(seconds);
    });
  });

  restButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const seconds = parseInt(button.dataset.restSeconds || "0", 10) || 0;
      setTimer(seconds);
      startTimer("Repos en cours");
    });
  });

  workTimerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const seconds = parseInt(button.dataset.workSeconds || "0", 10) || 0;
      setTimer(seconds);
      startTimer("Exercice en cours");
    });
  });

  if (minutesInput) minutesInput.addEventListener("input", syncTimerFromInputs);
  if (secondsInput) secondsInput.addEventListener("input", syncTimerFromInputs);
  if (startButton) startButton.addEventListener("click", startTimer);
  if (pauseButton) pauseButton.addEventListener("click", pauseTimer);

  if (floatingTimerPauseButton) {
    floatingTimerPauseButton.addEventListener("click", () => {
      if (intervalId) pauseTimer();
      else startTimer();
    });
  }

  if (floatingTimerResetButton) floatingTimerResetButton.addEventListener("click", resetTimer);

  if (resetButton) {
    resetButton.addEventListener("click", resetTimer);
  }


  if (notesField) notesField.addEventListener("input", saveNotes);

  loadSavedState();
  if (!minutesInput && !secondsInput) {
    const savedTimer = localStorage.getItem(timerStorageKey);
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        setTimer((parseInt(parsed.minutes || "0", 10) * 60) + parseInt(parsed.seconds || "0", 10));
      } catch (_error) {
        setTimer(60);
      }
    } else setTimer(60);
  }
})();
