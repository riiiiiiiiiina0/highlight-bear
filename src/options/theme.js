// Function to set the theme based on system preference
const applyTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'coffee');
  } else {
    document.documentElement.setAttribute('data-theme', 'winter');
  }
};

// Apply the theme on initial load
applyTheme();

// Listen for changes in system preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);