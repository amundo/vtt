class EditVttCue extends HTMLElement {
  #cue = {}
  #index

  constructor() {
    super()
    this.classList.add("cue-item")
  }

  connectedCallback() {
    this.addEventListener(
      "change",
      (changeEvent) => this.handleChange(changeEvent),
    )
    this.addEventListener("click", (clickEvent) => this.handleClick(clickEvent))
  }

  set data(cue) {
    this.#cue = cue
    this.render()
  }

  get data() {
    return this.#cue
  }

  set index(index) {
    this.#index = index
    this.dataset.index = index.toString()
  }

  get index() {
    return this.#index
  }

  render() {
    const index = this.#index
    const cue = this.#cue

    const inputId = `cue-id-${index}`
    const startId = `cue-start-${index}`
    const endId = `cue-end-${index}`
    const textId = `cue-text-${index}`

    this.innerHTML = `
        <header class=edit-vtt-cue-header>
            <span class="input-id" id="${inputId}" cue.id >
        </header>

        <div class="cue-time">
            <div>
                <label for="${startId}">Start: </label>
                <input type="text" class="time-input" id="${startId}" value="${
      cue.startTime || ""
    }" placeholder="00:00:00.000">
            </div>
            <div>
                <label for="${endId}">End: </label>
                <input type="text" class="time-input" id="${endId}" value="${
      cue.endTime || ""
    }" placeholder="00:00:00.000">
            </div>
        </div>
        
        <textarea id="${textId}" class="cue-text">${cue.text || ""}</textarea>

        <div class="cue-actions">
            <button class="play-cue">⏯️</button>
            <button class="set-start">👉</button>
            <button class="set-end">✋</button>
            <button class="delete-cue danger">🗑️</button>
        </div>
    `
  }

  handleChange(event) {
    const target = event.target
    const index = this.#index

    // ID change
    if (target.id === `cue-id-${index}`) {
      this.#cue.id = target.value
      this.dispatchUpdateEvent()
    } // Start time change
    else if (target.id === `cue-start-${index}`) {
      this.#cue.startTime = target.value
      this.dispatchUpdateEvent()
    } // End time change
    else if (target.id === `cue-end-${index}`) {
      this.#cue.endTime = target.value
      this.dispatchUpdateEvent()
    } // Text change
    else if (target.id === `cue-text-${index}`) {
      this.#cue.text = target.value
      this.dispatchUpdateEvent()
    }
  }

  handleClick(event) {
    const target = event.target

    // Play button
    if (target.classList.contains("play-cue")) {
      this.dispatchEvent(
        new CustomEvent("cue-action", {
          bubbles: true,
          detail: {
            action: "play",
            index: this.#index,
          },
        }),
      )
    } // Set start time button
    else if (target.classList.contains("set-start")) {
      this.dispatchEvent(
        new CustomEvent("cue-action", {
          bubbles: true,
          detail: {
            action: "set-start",
            index: this.#index,
          },
        }),
      )
    } // Set end time button
    else if (target.classList.contains("set-end")) {
      this.dispatchEvent(
        new CustomEvent("cue-action", {
          bubbles: true,
          detail: {
            action: "set-end",
            index: this.#index,
          },
        }),
      )
    } // Delete button
    else if (target.classList.contains("delete-cue")) {
      this.dispatchEvent(
        new CustomEvent("cue-action", {
          bubbles: true,
          detail: {
            action: "delete",
            index: this.#index,
          },
        }),
      )
    }
  }

  dispatchUpdateEvent() {
    this.dispatchEvent(
      new CustomEvent("cue-update", {
        bubbles: true,
        detail: {
          index: this.#index,
          cue: this.#cue,
        },
      }),
    )
  }
}

export { EditVttCue }
