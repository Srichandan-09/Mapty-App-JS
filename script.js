'use script';



class Workout {

  id = (Date.now() + '').slice(-10);
  date = new Date();
  clicks = 0;
  
  constructor (distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }
  
  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    this.description = `
    ${this.type.charAt(0).toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}



class Running extends Workout {
  type = 'running';

  constructor (distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}



class Cycling extends Workout {
  type = 'cycling';

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration * 60;
    return this.speed;
  }
}




////////////////////////////////////////////////////////////////////////

// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');



class App {

  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workoutsArr = [];

  constructor() {
    // Get user's position
    this.#getPosition();

    // Get data from local storage
    this.#getLocalStorage();

    // Attach event handlers
    inputType.addEventListener('change', this.#toggleElevationField);
    form.addEventListener('submit', this.#newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
  }

  // --------------------

  #getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  // --------------------

  #loadMap(position) {
    const { latitude, longitude } = position.coords;

    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    .addTo(this.#map);

    this.#workoutsArr.forEach(work => {
      this.#renderWorkoutMapMarker(work);
    });

    this.#map.on('click', this.#showForm.bind(this));
  }

  // --------------------

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // --------------------

  #hideForm() {

    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  // --------------------

  #toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // --------------------

  #newWorkout(e) {
  
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from the form
    const inpType = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    
    let workout;
    const { lat, lng } = this.#mapEvent.latlng;


    // If workout is running, get cadence and create running object
    if (inpType === 'running') {
      const cadence = Number(inputCadence.value);

      // Check if data is valid
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
        return alert('Input should be number and greater than 0');

      workout = new Running(distance, duration, [lat, lng], cadence);
    }


    // If workout is cycling, get elevation and create cycling object
    if (inpType === 'cycling') {
      const elevation = Number(inputElevation.value);

      // Check if data is valid
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
        return alert('Input should be number and greater than 0');

      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }

    // Adding each new object to workout array
    this.#workoutsArr.push(workout);

    // Render workout on map as a marker
    this.#renderWorkoutMapMarker(workout);

    // Render workout on list of sidebar
    this.#renderWorkoutList(workout);

    // Clearing the input and hiding the form
    this.#hideForm();

    // Set local storage to all workouts
    this.#setLocalStorage();
  }

  // --------------------

  #renderWorkoutMapMarker(workout) {

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  // --------------------

  #renderWorkoutList(workout) {
    const html = 
    `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.type === 'running' ? workout.pace.toFixed(1) : workout.speed.toFixed(1)}</span>
          <span class="workout__unit">${workout.type === 'running' ? 'min/km' : 'km/h'}</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🦶🏼' : '⛰'}</span>
          <span class="workout__value">${workout.type === 'running' ? workout.cadence : workout.elevationGain}</span>
          <span class="workout__unit">${workout.type === 'running' ? 'spm' : 'm'}</span>
        </div>
      </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  // --------------------

  #moveToPopup(e) {

    const workElement = e.target.closest('.workout');

    if (!workElement) return;
    
    const workData = this.#workoutsArr.find(work => workElement.dataset.id === work.id);

    this.#map.setView(workData.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });

    // Using the public interface
    // workData.click();
  }

  // --------------------

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workoutsArr));
  }

  // --------------------

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if(!data) return;

    this.#workoutsArr = data;

    this.#workoutsArr.forEach(work => {
      this.#renderWorkoutList(work);
    });
  }
  
  // --------------------
  
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}  


const app = new App();













