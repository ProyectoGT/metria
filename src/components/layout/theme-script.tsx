import Script from "next/script";

// Runs before hydration so the saved theme is applied without a visual flash.
export default function ThemeScript() {
  return (
    <Script
      id="metria-theme-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(){
  try {
    var t = localStorage.getItem('metria-theme') || 'dark';
    var el = document.documentElement;
    el.classList.remove('dark', 'dark-black');
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
