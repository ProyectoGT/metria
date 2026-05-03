// Server Component — se renderiza como <script> inline para aplicar el tema
// de forma SÍNCRONA antes de que el navegador pinte, evitando cualquier flash.
export default function ThemeScript() {
  return (
    <script
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
    // 'light': sin clases adicionales
  } catch(e) {}
})();`,
      }}
    />
  );
}
