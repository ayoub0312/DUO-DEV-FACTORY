/**
 * Script inline exécuté avant le premier rendu pour éviter tout flash de thème.
 * Respecte le choix mémorisé, sinon la préférence système (prefers-color-scheme).
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('duo-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
