const liveReloadIndicatorId = 'live-reload-indicator';

const baseClasses = 'fixed top-4 right-4 size-3 shadow rounded-full transition-all opacity-0 ease-in duration-250';
const bgError = 'bg-red-600 shadow-red-400';
const bgOk = 'bg-green-600 shadow-green-400';

// create the indicator element
const indicator = document.createElement("div");
indicator.id = liveReloadIndicatorId;
indicator.className = `${baseClasses} ${bgError}`;
document.body.appendChild(indicator);

// delay the indicator display (give time for green if quick connection)
setTimeout(() => indicator.classList.replace('opacity-0', 'opacity-100'), 300);

document.addEventListener('LiveReloadConnect', () => {
  indicator.classList.remove(...bgError.split(' '));
  indicator.classList.add(...bgOk.split(' '));
});

document.addEventListener('LiveReloadDisconnect', () => {
  indicator.classList.remove(...bgOk.split(' '));
  indicator.classList.add(...bgError.split(' '));
});
