// Runs before hydration so the saved theme is applied without a visual flash.
export default function ThemeScript() {
  return (
    <script
      id="metria-theme-script"
      dangerouslySetInnerHTML={{
        __html: `(function(){
  try {
    var match = document.cookie.match(/(?:^|; )metria-theme=([^;]+)/);
    var cookieTheme = match ? decodeURIComponent(match[1]) : null;
    var t = localStorage.getItem('metria-theme') || cookieTheme || 'dark';
    if (t !== 'light' && t !== 'dark' && t !== 'dark-black') t = 'dark';
    var el = document.documentElement;
    el.classList.remove('dark', 'dark-black');
    el.setAttribute('data-theme', t);
    if (t === 'dark') {
      el.classList.add('dark');
    } else if (t === 'dark-black') {
      el.classList.add('dark', 'dark-black');
    }
  } catch(e) {}
})();`,
      }}
    />
  );
}
