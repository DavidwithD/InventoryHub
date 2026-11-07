function ago(ts) {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function render(platform) {
  chrome.storage.local.get(`capture_${platform}`, (res) => {
    const rec = res[`capture_${platform}`];
    const el = document.getElementById(platform);
    if (rec && rec.capturedAt) {
      el.textContent = `✓ ${ago(rec.capturedAt)}`;
      el.className = 'ok';
    } else {
      el.textContent = 'not captured';
      el.className = 'none';
    }
  });
}

render('taobao');
render('pinduoduo');
