// add delayed functionality here
(function loadAnalytics() {
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com';
  script.async = true;
  document.head.appendChild(script);
})();