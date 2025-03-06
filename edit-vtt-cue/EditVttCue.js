class EditVttCue extends HTMLElement {
  constructor(){
    super()
    this.listen()
  }

  async fetch(url){
    let response = await fetch(url)
    let data = await response.json()
    this.data = data
  }

  connectedCallback(){

  }

  static get observedAttributes(){
    return ["src"]
  }

  attributeChangedCallback(attribute, oldValue, newValue){
    if(attribute == "src"){
      this.fetch(newValue)
    }
  }

  render(){
    
  }

  listen(){
    /* write event listeners here */
  }
}

export {EditVttCue}
customElements.define('edit-vtt-cue', EditVttCue)
