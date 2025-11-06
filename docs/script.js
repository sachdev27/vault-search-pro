document.addEventListener('DOMContentLoaded', () => {
  const tabControls = document.querySelectorAll('[data-tab]');
  const tabPanels = {
    search: document.getElementById('tab-search'),
    settings: document.getElementById('tab-settings')
  };
  const popupTabs = document.querySelectorAll('.popup-tab');
  const counter = document.querySelector('.results-counter');
  const resultItems = document.querySelectorAll('.result-list li');

  function activateTab(tabName) {
    if (!tabPanels[tabName]) return;

    tabControls.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    Object.entries(tabPanels).forEach(([name, panel]) => {
      panel.classList.toggle('active', name === tabName);
    });

    popupTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
  }

  tabControls.forEach((control) => {
    control.addEventListener('click', () => activateTab(control.dataset.tab));
  });

  // Animated result counter + highlight loop
  const counts = [12, 17, 23, 31, 36, 42];
  let index = 0;

  function tick() {
    if (!counter) return;
    const nextCount = counts[index % counts.length];
    counter.textContent = `${nextCount} results · streaming live`;

    resultItems.forEach((item, idx) => {
      item.classList.remove('highlight');
      if (idx === index % resultItems.length) {
        item.classList.add('highlight');
      }
    });

    index += 1;
  }

  if (counter && resultItems.length) {
    tick();
    setInterval(tick, 2400);
  }
});
