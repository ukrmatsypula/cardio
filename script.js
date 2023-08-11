'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const resetAll = document.querySelector('.reset-all');

class Workout {
  date = new Date();
  id = Math.random().toString(36).substr(2, 10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const options = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    };

    this.type === 'running'
      ? (this.description = `Пробежка ${new Intl.DateTimeFormat(
          'ru-Ru',
          options
        ).format(this.date)}`)
      : (this.description = `Велотренировка ${new Intl.DateTimeFormat(
          'ru-Ru',
          options
        ).format(this.date)}`);
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, temp) {
    super(coords, distance, duration);
    this.temp = temp;
    this.calculatePace();
    this._setDescription();
  }

  calculatePace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, climb) {
    super(coords, distance, duration);
    this.climb = climb;
    this.calculateSpeed();
    this._setDescription();
  }

  calculateSpeed() {
    // km/h
    this.speed = this.distance / this.duration / 60;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleClimbField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
    this._getLocalStorageData();
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Невозможно получить ваше местоположение');
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    console.log(`https://www.google.com.ua/maps/@${latitude},${longitude},12z`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => this._displayWorkout(workout));
  }
  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputTemp.value =
      inputClimb.value =
        '';
    form.classList.add('hidden');
  }
  _toggleClimbField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    e.preventDefault();

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    const areNumbers = (...numbers) =>
      numbers.every(num => Number.isFinite(num));

    const areNumbersPositive = (...numbers) => numbers.every(num => num > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (type === 'running') {
      const temp = +inputTemp.value;

      if (
        !areNumbers(distance, duration, temp) ||
        !areNumbersPositive(distance, duration, temp)
      ) {
        return alert('Введите положительное число!');
      }

      workout = new Running([lat, lng], distance, duration, temp);
    }

    if (type === 'cycling') {
      const climb = +inputClimb.value;

      if (
        !areNumbers(distance, duration, climb) ||
        !areNumbersPositive(distance, duration)
      ) {
        return alert('Введите положительное число!');
      }

      workout = new Cycling([lat, lng], distance, duration, climb);
    }

    this.#workouts.push(workout);

    this._displayWorkout(workout);
    this._displayWorkoutOnSidebar(workout);

    this._hideForm();

    this._addWorkoutToLocalStorage();
  }

  _displayWorkout(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚵‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _displayWorkoutOnSidebar(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <span class="workout__close">&times;</span>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃' : '🚵‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">км</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">мин</span>
        </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">м/мин</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟⏱</span>
            <span class="workout__value">${workout.temp}</span>
            <span class="workout__unit">шаг/мин</span>
          </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">км/ч</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔</span>
            <span class="workout__value">${workout.climb}</span>
            <span class="workout__unit">м</span>
          </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);

    const closeWorkout = document.querySelector('.workout__close');
    resetAll.addEventListener('click', this.reset.bind(this));
    this._removeResetAllButton();

    if (closeWorkout) {
      closeWorkout.addEventListener('click', this._removeWorkout.bind(this));
    }
  }

  _moveToWorkout(e) {
    const workoutElement = e.target.closest('.workout');

    if (!workoutElement) return;
    const currentWorkoutId = workoutElement.dataset.id;
    const workout = this.#workouts.find(
      workout => workout.id === currentWorkoutId
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _addWorkoutToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(workout => this._displayWorkoutOnSidebar(workout));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _removeWorkout(e) {
    e.stopPropagation();

    const currentWorkout = e.target.closest('.workout');
    const workoutIdToDelete = currentWorkout ? currentWorkout.dataset.id : '';

    const workoutIndexToDelete = this.#workouts.findIndex(workout => {
      workout.id === workoutIdToDelete;
    });

    this.#workouts.splice(workoutIndexToDelete, 1);

    localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    if (localStorage.getItem('workouts') || this.#workouts.length) {
      this._removeResetAllButton();
    }

    if (this.#workouts.length) {
      this.#workouts.forEach(workout => this._displayWorkoutOnSidebar(workout));
    }

    location.reload();
  }

  _removeResetAllButton() {
    resetAll.classList.remove('hidden');
  }
}

const app = new App();
