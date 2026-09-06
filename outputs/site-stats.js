(() => {
  const path = location.pathname.replace(/\.html$/, '') || '/';
  fetch('stats-data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path}),
    keepalive: true,
  }).catch(() => {});
})();
